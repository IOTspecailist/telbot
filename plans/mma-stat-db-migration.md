# MMA Stat DB 마이그레이션 설계

작성일: 2026-04-04

---

## AS-IS (현재)

### 데이터 저장
- `localStorage` 사용 (`mma_cards` 키)
- 브라우저 단위 저장 → 기기마다 별도, 공유 불가
- 새 카드 생성 시 같은 이름+연도면 덮어쓰기

### 카드 생성 방식
- 사용자가 8개 스탯(fightiq, power, striking, chin, wrestling, speed, cardio, jiujitsu) 슬라이더로 직접 수동 입력
- 이름, 연도, 스탯값 직접 입력 후 카드 생성
- 캔버스로 썸네일(88px) 생성 후 base64로 저장

### 데이터 흐름
```
사용자 수동 입력 → localStorage 저장 → mma-predict.html에서 읽기
```

### 관련 파일
- `public/mma-stat.html` — 카드 생성 (localStorage 읽기/쓰기)
- `public/mma-predict.html` — 카드 읽기 (localStorage 읽기만)

### 한계
- 기기간 공유 불가
- 선수 데이터 직접 조사 후 수동 입력 필요
- 정확도/일관성 없음

---

## TO-BE (목표)

### 데이터 저장
- Neon PostgreSQL (Vercel Storage 연동)
- 서버 DB 저장 → 기기 공유 가능
- 인프라: Vercel (서버리스) + Neon PostgreSQL

### 카드 생성 방식
- 선수 이름 입력 → UFC 공식 사이트 크롤링 → 자동 점수 계산 → 체급 확인 → DB 저장

### 데이터 흐름
```
이름 입력 → 검색 버튼 클릭
    ↓
Next.js API Route → UFC 사이트 fetch
    ↓
점수 계산 (서버)
    ↓
체급 자동 감지 → 드롭다운 기본값 세팅
    ↓
사용자 체급 확인/수정 → 카드 생성 버튼 클릭
    ↓
DB 저장 (mma_cards 테이블)
    ↓
카드 데이터 반환 → 브라우저 렌더링
```

---

## DB 설계

### 테이블: `mma_cards`

```sql
CREATE TABLE mma_cards (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  weight_class  TEXT NOT NULL,
  raw_stats     JSONB NOT NULL,
  score_power      SMALLINT NOT NULL,
  score_striking   SMALLINT NOT NULL,
  score_speed      SMALLINT NOT NULL,
  score_chin       SMALLINT NOT NULL,
  score_wrestling  SMALLINT NOT NULL,
  score_jiujitsu   SMALLINT NOT NULL,
  score_cardio     SMALLINT NOT NULL,
  score_fightiq    SMALLINT NOT NULL,
  image         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### raw_stats JSONB 구조
```json
{
  "spm": 2.45,
  "sapm": 1.45,
  "striking_accuracy": 0.58,
  "striking_defense": 0.62,
  "takedown_accuracy": 0.56,
  "takedown_defense": 0.91,
  "td_per_15": 3.10,
  "subs_per_15": 0.98,
  "avg_fight_min": 11.02,
  "ko_wins": 5,
  "sub_wins": 13,
  "dec_wins": 10,
  "total_wins": 28,
  "ko_losses": 0,
  "sub_losses": 1,
  "dec_losses": 0,
  "total_losses": 1
}
```

---

## 점수 계산 공식

데이터 소스: `https://ufc.com/athlete/{slug}` (영문 UFC 공식 사이트)

공통 함수:
```
normalize(value, min, max) = clamp((value - min) / (max - min), 0, 1)
score(n) = round(n × 9 + 1)  →  범위 1~10
```

### 1. Power
```
KO_wins / total_wins
```

### 2. Striking
```
striking_accuracy × 0.6 + normalize(spm, 1.5, 7.0) × 0.4
```

### 3. Speed
```
normalize(spm, 1.5, 7.0)
```

### 4. Chin
```
(1 - normalize(sapm, 1.0, 6.0)) × 0.5 + striking_defense × 0.5
```

### 5. Wrestling
```
takedown_accuracy × 0.5 + takedown_defense × 0.5
```

### 6. Jiu-Jitsu
```
(SUB_wins / total_wins) × 0.6 + normalize(subs_per_15, 0, 1.5) × 0.4
```

### 7. Cardio
```
striking_vol  = normalize(avg_fight_min × spm, 5, 100)
grappling_vol = normalize(avg_fight_min × (td_per_15 / 15), 0, 8)
max(striking_vol, grappling_vol)
```
- avg_fight_min 정규화 범위: 1 ~ 25분 (1라운드 조기 KO ~ 5라운드 풀타임)

### 8. Fight IQ
```
finish_loss_rate = (KO_losses + SUB_losses) / total_losses
win_rate × 0.4 + (1 - finish_loss_rate) × 0.3 + striking_defense × 0.3
```

---

## API 설계

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/fighter?name={name}` | UFC fetch + 점수 계산 (미저장) |
| GET | `/api/cards` | 저장된 카드 전체 조회 |
| POST | `/api/cards` | 카드 저장 |
| DELETE | `/api/cards/[id]` | 카드 삭제 |

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `lib/db.ts` | 신규 — Neon 연결 클라이언트 |
| `app/api/fighter/route.ts` | 신규 — UFC fetch + 점수 계산 |
| `app/api/cards/route.ts` | 신규 — GET/POST |
| `app/api/cards/[id]/route.ts` | 신규 — DELETE |
| `public/mma-stat.html` | 변경 — localStorage → API 호출, UI 변경 |
| `public/mma-predict.html` | 변경 — localStorage → API 호출 |

---

## 작업 순서

1. Neon 콘솔 Query 탭에서 CREATE TABLE SQL 실행
2. `lib/db.ts` 작성
3. `app/api/fighter/route.ts` 작성 (UFC fetch + 점수 계산)
4. `app/api/cards/route.ts` 작성
5. `app/api/cards/[id]/route.ts` 작성
6. `public/mma-stat.html` UI/로직 변경
7. `public/mma-predict.html` 로직 변경
8. Vercel 배포 후 테스트

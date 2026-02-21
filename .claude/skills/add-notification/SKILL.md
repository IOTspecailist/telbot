---
name: add-notification
description: telbot 프로젝트에 새 텔레그램 알림 기능을 추가한다. lib/notifications/<name>.ts 파일 생성 + index.ts 레지스트리 등록 + page.tsx 버튼 추가까지 한 번에 처리.
argument-hint: "<notification-id> \"<button-label>\" \"<message>\""
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Glob, Grep
---

# add-notification 스킬

인수: `$ARGUMENTS`
형식: `<id> "<button-label>" "<message>"`
예시: `deploy-alert "🚀 배포 알림 전송" "🚀 새 버전이 배포되었습니다."`

## 실행 순서

### 1. 인수 파싱
$ARGUMENTS 에서 다음 세 값을 추출한다:
- `ID` — 영문 소문자 + 하이픈 (예: `deploy-alert`)
- `LABEL` — 버튼 표시 텍스트
- `MESSAGE` — 텔레그램으로 전송할 메시지 텍스트

인수가 부족하면 사용법을 안내하고 중단한다.

### 2. 알림 핸들러 파일 생성
`lib/notifications/<ID>.ts` 를 아래 템플릿으로 생성한다:

```typescript
import { sendTelegramMessage } from '../telegram'

export async function send<PascalCaseId>Notification(): Promise<void> {
  await sendTelegramMessage('<MESSAGE>')
}
```

- 함수명은 ID를 PascalCase로 변환해 `send` + PascalCase + `Notification` 형태로 만든다
  - 예: `deploy-alert` → `sendDeployAlertNotification`
- `<MESSAGE>` 자리에 실제 메시지를 삽입한다

### 3. 레지스트리 등록
`lib/notifications/index.ts` 를 Read로 읽은 뒤 두 군데를 수정한다:

**import 추가** (기존 import 마지막 줄 다음에):
```typescript
import { send<PascalCaseId>Notification } from './<ID>'
```

**handlers 객체에 항목 추가** (`} as const` 바로 앞 마지막 항목 다음에):
```
  <ID>: send<PascalCaseId>Notification,
```

### 4. 메인 페이지에 버튼 추가
`app/page.tsx` 를 Read로 읽은 뒤 `</section>` 바로 앞에 다음 줄을 삽입한다:
```tsx
        <NotifyButton type="<ID>" label="<LABEL>" />
```

### 5. 완료 보고
다음 내용을 출력한다:
```
✅ 알림 추가 완료: <ID>
  - lib/notifications/<ID>.ts  생성
  - lib/notifications/index.ts 등록
  - app/page.tsx               버튼 추가
```

## 수정하면 안 되는 것
- `lib/telegram.ts` — 절대 수정하지 않는다
- `app/api/notify/route.ts` — 수정 불필요 (제네릭 라우터)
- 기존 알림 파일 — 건드리지 않는다

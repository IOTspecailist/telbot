# /scaffold-notify

새로운 텔레그램 알림 타입을 추가한다.
notification-dev 에이전트를 호출해 lib/notifications/ 파일 생성,
레지스트리 등록, 버튼 추가를 일괄 처리한다.

## 사용법

```
/scaffold-notify <알림-id> "<설명>"
```

예시:
- `/scaffold-notify nba-scores "NBA 오늘 경기 결과 알림"`
- `/scaffold-notify crypto-price "비트코인 현재가 알림"`

## 실행

notification-dev 에이전트를 호출해 다음을 수행한다:

아래 정보로 새 알림을 추가해줘:
- 알림 ID: $ARGUMENTS 에서 첫 번째 토큰
- 설명: $ARGUMENTS 에서 나머지 부분
- lib/notifications/<id>.ts 생성 (기본 메시지 포함)
- lib/notifications/index.ts 에 import 및 핸들러 등록
- app/page.tsx 에 NotifyButton 추가
- 완료 후 레지스트리 일관성 검사 수행

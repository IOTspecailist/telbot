# /check-scrapers

telbot의 외부 크롤링 소스들(UFC, Zum, X트렌드, 커뮤니티 등)이 현재 정상 동작하는지 일괄 점검한다.

## 실행

scraper-health 에이전트를 호출해 점검을 수행한다:

```
UFC (kr.ufc.com), 구글 트렌드, Zum 트렌드, X트렌드(trends24.in),
커뮤니티(FM코리아/더쿠/루리웹), Hacker News 각 소스에 HTTP 요청을 보내
응답 상태를 확인하고 결과를 보고해줘.
이상이 있는 소스는 어떤 route.ts 파일을 수정해야 하는지도 안내해줘.
```

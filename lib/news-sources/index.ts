// ─── 뉴스 소스 레지스트리 ────────────────────────────────────────────────────
// 새 소스 추가 방법:
//   1. lib/news-sources/<name>.ts 파일 생성 (NewsSource 인터페이스 구현)
//   2. 아래 import + NEWS_SOURCES 객체에 한 줄씩 추가
// ─────────────────────────────────────────────────────────────────────────────

import { hankyung } from './hankyung'

export interface Article {
  title: string
  link: string
  pubDate: Date
}

export interface NewsSource {
  id: string
  name: string
  /** keyword 포함 + fromDate 이후 기사 중 가장 최신 1개 반환. 없으면 null */
  fetchLatest: (keyword: string, fromDate: Date) => Promise<Article | null>
}

export const NEWS_SOURCES: Record<string, NewsSource> = {
  hankyung,
}

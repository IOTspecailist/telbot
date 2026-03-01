import { general } from './general'

export interface Article {
  title: string
  link: string
  pubDate: Date
  source?: string // 실제 언론사명 (예: '연합뉴스')
}

export interface NewsSource {
  id: string
  name: string
  /** keyword 포함 + fromDate 이후 기사를 최신순으로 최대 limit개 반환 */
  fetchTop: (keyword: string, fromDate: Date, limit: number) => Promise<Article[]>
}

export const NEWS_SOURCES: Record<string, NewsSource> = {
  general,
}

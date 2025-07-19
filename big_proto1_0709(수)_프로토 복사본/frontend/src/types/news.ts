/**
 * 뉴스 관련 타입 정의
 */

// 뉴스 기사 인터페이스
export interface NewsArticle {
  id: string;
  title: string;
  content?: string;
  summary: string;
  published_at: string;
  dateline?: string;
  category: string | string[];
  provider: string;
  provider_code?: string;
  url: string;
  byline: string;
  images: string[];
  images_caption?: string;
  provider_link_page?: string;
}

// 타임라인 항목 인터페이스
export interface TimelineItem {
  date: string;
  articles: NewsArticle[];
  count: number;
}

// 뉴스 아이템 (홈페이지용)
export interface NewsItem {
  id?: string;
  topic_id?: string;
  title: string;
  summary?: string;
  content?: string;
  provider: string;
  date: string;
  category: string;
  url?: string;
  published_at?: string;
}

// 뉴스 상세 정보 응답 인터페이스
export interface NewsDetailResponse {
  success: boolean;
  news: NewsArticle;
  has_original_link: boolean;
}

// 언론사별 기사 수 breakdown 인터페이스
export interface ProviderBreakdown {
  provider: string;
  provider_code: string;
  count: number;
}

// 이슈 토픽 인터페이스
export interface IssueTopic {
  rank: number;
  title: string;
  count: number;
  related_news: string[];
  provider_breakdown?: ProviderBreakdown[];
  related_news_ids?: string[];
  cluster_ids?: string[];
  // 프론트엔드 호환성을 위한 선택적 필드들
  topic_id?: string;
  topic_name?: string;
  score?: number;
  news_cluster?: string[];
  keywords?: string[];
  topic?: string;
  topic_rank?: number;
  topic_keyword?: string;
}

// 인기 키워드 인터페이스
export interface PopularKeyword {
  rank: number;
  keyword: string;
  count: number;
  trend: string;
  // 프론트엔드 호환성을 위한 선택적 필드들
  category?: string;
  score?: number;
}

// 최신 뉴스 응답 인터페이스
export interface LatestNewsResponse {
  today_issues: IssueTopic[];
  popular_keywords: PopularKeyword[];
  timestamp: string;
}

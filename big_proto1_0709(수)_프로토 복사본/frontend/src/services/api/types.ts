/**
 * API 서비스 전용 타입 정의
 * UI 컴포넌트용 타입들은 ../types/에서 관리
 */

// ===== 기본 뉴스 관련 타입들 (API 응답용) =====

// API용 뉴스 기사 인터페이스 (content 필수)
export interface APINewsArticle {
  id: string;
  title: string;
  content: string; // API에서는 항상 content가 있음
  summary: string;
  published_at: string;
  dateline: string;
  category: string[]; // API에서는 항상 배열
  provider: string;
  provider_code: string;
  url: string;
  byline: string;
  images: string[];
  images_caption?: string;
  provider_link_page?: string;
}

// ===== 요청 인터페이스들 =====

// 기업 뉴스 요청 인터페이스
export interface CompanyNewsRequest {
  company_name: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

// 키워드 뉴스 요청 인터페이스
export interface KeywordNewsRequest {
  keyword: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

// AI 요약 요청 인터페이스
export interface AISummaryRequest {
  news_ids: string[];
}

// 관심종목 추가 요청 인터페이스
export interface WatchlistAddRequest {
  name: string;
  code: string;
  category: string;
}

// ===== 응답 인터페이스들 =====

// 뉴스 타임라인 응답 인터페이스
export interface NewsTimelineResponse {
  keyword?: string;
  company?: string;
  period: {
    from: string;
    to: string;
  };
  total_count: number;
  timeline: Array<{
    date: string;
    articles: APINewsArticle[];
    count: number;
  }>;
}

// AI 요약 응답 인터페이스
export interface AISummaryResponse {
  title: string;
  summary: string;
  type: string;
  key_points?: string[];
  key_quotes?: Array<{
    source: string;
    quote: string;
  }>;
  key_data?: Array<{
    metric: string;
    value: string;
    context: string;
  }>;
  articles_analyzed: number;
  generated_at: string;
  model_used: string;
  article_references?: Array<{
    ref_id: string;
    title: string;
    provider: string;
    byline: string;
    published_at: string;
    url?: string;
    relevance_score: number;
  }>;
}

// 관심 종목 추천 응답 인터페이스
export interface WatchlistSuggestion {
  name: string;
  code: string;
  category: string;
}

export interface WatchlistSuggestionsResponse {
  suggestions: WatchlistSuggestion[];
}

// 관련 질문 인터페이스
export interface RelatedQuestion {
  id: number;
  question: string;
  query: string;
  count: number;
  score: number;
  description: string;
}

// 관련 질문 응답 인터페이스
export interface RelatedQuestionsResponse {
  success: boolean;
  keyword: string;
  period: {
    from: string;
    to: string;
  };
  total_count: number;
  questions: RelatedQuestion[];
}

// 관심종목 응답 인터페이스
export interface WatchlistResponse {
  success: boolean;
  message: string;
  watchlist?: Array<{
    name: string;
    code: string;
    category: string;
    added_at: string;
    recent_news_count: number;
    has_recent_news: boolean;
  }>;
}

// ===== 레포트 관련 타입들 =====

// 레포트 기간 타입
export type ReportPeriodType =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

// 레포트 생성 요청 인터페이스
export interface ReportRequest {
  company_name: string;
  company_code?: string;
  period_type: ReportPeriodType;
  date_from: string;
  date_to: string;
  language?: "ko" | "en";
  include_charts?: boolean;
  max_articles?: number;
}

// 인용 출처 인터페이스
export interface CitationSource {
  id: string;
  title: string;
  url: string;
  provider: string;
  published_at: string;
  excerpt: string;
}

// 레포트 섹션 인터페이스
export interface ReportSection {
  title: string;
  content: string;
  key_points: string[];
  citations: number[];
}

// 레포트 메타데이터 인터페이스
export interface ReportMetadata {
  company_name: string;
  company_code?: string;
  period_type: ReportPeriodType;
  date_from: string;
  date_to: string;
  total_articles: number;
  generated_at: string;
  generation_time_seconds: number;
  model_used: string;
}

// 기업 레포트 인터페이스
export interface CompanyReport {
  metadata: ReportMetadata;
  executive_summary: string;
  sections: ReportSection[];
  citations: CitationSource[];
  keywords: string[];
  sentiment_analysis: Record<string, any>;
  stock_impact?: string;
}

// 레포트 스트리밍 데이터 인터페이스
export interface ReportStreamData {
  type: "progress" | "content" | "section" | "complete" | "error";
  step?: string;
  progress?: number;
  section_title?: string;
  content?: string;
  result?: CompanyReport;
  error?: string;
}

// 기간별 레포트 관련 인터페이스들
export interface ReportGenerationProgress {
  stage: string;
  progress: number;
  message: string;
  current_task?: string;
  estimated_remaining_seconds?: number;
}

export enum PeriodReportType {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

export interface AutoReportRequest {
  report_type: PeriodReportType;
  company_name?: string;
  company_code?: string;
  target_date?: string;
  categories: string[];
  max_articles: number;
  include_sentiment: boolean;
  include_keywords: boolean;
  language: string;
}

export interface NewsCluster {
  id: string;
  title: string;
  articles_count: number;
  representative_article_id: string;
  keywords: string[];
  categories: string[];
  sentiment_score?: number;
  impact_score?: number;
}

export interface PeriodInsight {
  type: string;
  title: string;
  description: string;
  confidence: number;
  supporting_clusters: string[];
}

export interface CategorySummary {
  category: string;
  total_articles: number;
  top_clusters: NewsCluster[];
  key_developments: string[];
  sentiment_trend?: string;
}

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  importance: number;
  related_cluster_ids: string[];
  category: string;
}

export interface PeriodReport {
  id: string;
  report_type: PeriodReportType;
  company_name?: string;
  company_code?: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  total_articles_analyzed: number;
  categories_covered: string[];
  analysis_duration_seconds: number;
  executive_summary: string;
  key_highlights: string[];
  category_summaries: CategorySummary[];
  timeline: TimelineEvent[];
  insights: PeriodInsight[];
  top_keywords: Array<{ keyword: string; count: number; category: string }>;
  sentiment_analysis: Record<string, any>;
  trend_analysis: Record<string, any>;
  comparison?: Record<string, any>;
}

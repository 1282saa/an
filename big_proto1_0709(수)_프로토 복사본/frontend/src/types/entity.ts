/**
 * 엔티티(종목) 관련 타입 정의
 */

// 엔티티 인터페이스
export interface Entity {
  id: string;
  name: string;
  code: string;
  variants: string[];
  category: string;
  category_name: string;
}

// 카테고리 정보 인터페이스
export interface CategoryInfo {
  key: string;
  name: string;
  count: number;
}

// 카테고리 인터페이스 (WatchlistPage용)
export interface Category {
  key: string;
  name: string;
  count: number;
  icon?: string;
  description?: string;
}

// 회사 정보 인터페이스
export interface Company {
  id: string;
  name: string;
  code: string;
  category: string;
  market?: string;
  sector?: string;
}

// 관심종목 아이템 인터페이스
export interface WatchlistItem {
  name: string;
  code: string;
  category: string;
  added_at: string;
  recent_news_count: number;
  has_recent_news: boolean;
}

/**
 * 공통 타입들의 인덱스 파일
 * 모든 타입을 여기서 import/export
 */

// 뉴스 관련 타입들
export * from "./news";

// 엔티티 관련 타입들
export * from "./entity";

// UI 관련 타입들
export interface TabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

// 테마 타입
export type Theme = "light" | "dark";

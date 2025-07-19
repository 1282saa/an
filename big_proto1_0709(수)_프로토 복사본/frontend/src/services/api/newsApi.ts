/**
 * 뉴스 관련 API 서비스
 */

import { API_BASE_URL, defaultOptions, handleApiError } from "./config";
import {
  CompanyNewsRequest,
  KeywordNewsRequest,
  NewsTimelineResponse,
  RelatedQuestion,
  RelatedQuestionsResponse,
} from "./types";
import { LatestNewsResponse, NewsDetailResponse } from "../../types";

/**
 * 최신 뉴스 정보 가져오기
 */
export const getLatestNews = async (): Promise<LatestNewsResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/news/latest`, {
    ...defaultOptions,
    method: "GET",
  });

  handleApiError(response);
  return response.json();
};

/**
 * 기업 뉴스 타임라인 조회
 */
export const getCompanyNews = async (
  request: CompanyNewsRequest
): Promise<NewsTimelineResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/news/company`, {
    ...defaultOptions,
    method: "POST",
    body: JSON.stringify(request),
  });

  handleApiError(response);
  return response.json();
};

/**
 * 키워드 뉴스 타임라인 조회
 */
export const getKeywordNews = async (
  request: KeywordNewsRequest
): Promise<NewsTimelineResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/news/keyword`, {
    ...defaultOptions,
    method: "POST",
    body: JSON.stringify(request),
  });

  handleApiError(response);
  return response.json();
};

/**
 * 뉴스 상세 정보 조회
 */
export const getNewsDetail = async (
  newsId: string
): Promise<NewsDetailResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/news/detail/${newsId}`, {
    ...defaultOptions,
    method: "GET",
  });

  handleApiError(response);
  return response.json();
};

/**
 * 뉴스 검색 (GET 방식)
 */
export const searchNews = async (
  keyword: string,
  dateFrom?: string,
  dateTo?: string,
  limit: number = 30
): Promise<NewsTimelineResponse> => {
  const params = new URLSearchParams({
    keyword,
    limit: limit.toString(),
  });

  if (dateFrom) {
    params.append("date_from", dateFrom);
  }

  if (dateTo) {
    params.append("date_to", dateTo);
  }

  const response = await fetch(`${API_BASE_URL}/api/news/search?${params}`, {
    ...defaultOptions,
    method: "GET",
  });

  handleApiError(response);
  return response.json();
};

/**
 * 연관 질문 조회
 */
export const getRelatedQuestions = async (
  keyword: string,
  dateFrom?: string,
  dateTo?: string,
  maxQuestions: number = 10
): Promise<RelatedQuestionsResponse> => {
  const params = new URLSearchParams({
    keyword,
    max_questions: maxQuestions.toString(),
  });

  if (dateFrom) {
    params.append("date_from", dateFrom);
  }

  if (dateTo) {
    params.append("date_to", dateTo);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/related-questions?${params}`,
    {
      ...defaultOptions,
      method: "GET",
    }
  );

  handleApiError(response);
  return response.json();
};

/**
 * 뉴스 링크를 결정하는 유틸리티 함수
 * @param article 뉴스 기사 객체
 * @returns 뉴스 링크 URL
 */
export const getArticleLink = (article: any): string => {
  // 언론사 원본 링크가 있으면 우선 사용
  if (article.provider_link_page && article.provider_link_page.trim()) {
    return article.provider_link_page;
  }
  // 빅카인즈 URL이 있으면 사용
  if (article.url && article.url.trim()) {
    return article.url;
  }
  // 둘 다 없으면 빅카인즈 검색 페이지로 이동
  const searchQuery = encodeURIComponent(article.title || "뉴스");
  return `https://www.kinds.or.kr/search?query=${searchQuery}`;
};

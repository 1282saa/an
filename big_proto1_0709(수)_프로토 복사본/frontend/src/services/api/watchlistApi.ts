/**
 * 관심종목 관련 API 서비스
 */

import { API_BASE_URL, defaultOptions, handleApiError } from "./config";
import {
  WatchlistSuggestionsResponse,
  WatchlistAddRequest,
  WatchlistResponse,
} from "./types";

/**
 * 관심 종목 추천 목록 조회
 */
export const getWatchlistSuggestions =
  async (): Promise<WatchlistSuggestionsResponse> => {
    const response = await fetch(
      `${API_BASE_URL}/api/news/watchlist/suggestions`,
      {
        ...defaultOptions,
        method: "GET",
      }
    );

    handleApiError(response);
    return response.json();
  };

/**
 * 관심종목에 기업 추가
 */
export const addToWatchlist = async (
  request: WatchlistAddRequest
): Promise<WatchlistResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/news/watchlist`, {
    ...defaultOptions,
    method: "POST",
    body: JSON.stringify(request),
  });

  handleApiError(response);
  return response.json();
};

/**
 * 관심종목에서 기업 삭제
 */
export const removeFromWatchlist = async (
  stockCode: string
): Promise<WatchlistResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/news/watchlist/${stockCode}`,
    {
      ...defaultOptions,
      method: "DELETE",
    }
  );

  handleApiError(response);
  return response.json();
};

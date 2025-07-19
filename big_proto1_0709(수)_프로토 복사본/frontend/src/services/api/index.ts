/**
 * API 서비스 통합 export
 * 모든 분리된 API 서비스들을 하나로 통합
 */

// ===== 타입들 re-export =====
export * from "./types";
export { API_BASE_URL, defaultOptions } from "./config";

// ===== 뉴스 API =====
export {
  getLatestNews,
  getCompanyNews,
  getKeywordNews,
  getNewsDetail,
  searchNews,
  getRelatedQuestions,
  getArticleLink,
} from "./newsApi";

// ===== AI 요약 API =====
export { generateAISummary, generateAISummaryStream } from "./summaryApi";

// ===== 관심종목 API =====
export {
  getWatchlistSuggestions,
  addToWatchlist,
  removeFromWatchlist,
} from "./watchlistApi";

// ===== 레포트 API =====
export {
  generateCompanyReport,
  generateCompanyReportStream,
  getReportTemplates,
  validateReportRequest,
  generatePeriodReport,
  generatePeriodReportStream,
  getPeriodReportTemplates,
  quickGeneratePeriodReport,
  getPeriodInfo,
  getPeriodReportCategories,
} from "./reportApi";

// ===== 하위 호환성을 위한 기존 인터페이스 유지 =====

// 기존 newsApiService 객체와 동일한 구조로 제공
import * as newsApi from "./newsApi";
import * as summaryApi from "./summaryApi";
import * as watchlistApi from "./watchlistApi";
import * as reportApi from "./reportApi";

const newsApiService = {
  // 뉴스 관련
  ...newsApi,

  // AI 요약 관련
  ...summaryApi,

  // 관심종목 관련
  ...watchlistApi,

  // 레포트 관련
  ...reportApi,
};

// 기존과 동일한 방식으로 export
export default newsApiService;

// 기존 코드와의 호환성을 위해 api 객체로도 export
export const api = newsApiService;

// 개별 함수들도 그대로 유지 (이미 위에서 export됨)
// 추가적으로 필요한 경우를 위해 구조분해 방식으로도 제공
export const {
  getLatestNews: getLatestNewsFunc,
  getCompanyNews: getCompanyNewsFunc,
  getKeywordNews: getKeywordNewsFunc,
  getNewsDetail: getNewsDetailFunc,
  generateAISummary: generateAISummaryFunc,
  generateAISummaryStream: generateAISummaryStreamFunc,
  getWatchlistSuggestions: getWatchlistSuggestionsFunc,
  searchNews: searchNewsFunc,
  getRelatedQuestions: getRelatedQuestionsFunc,
  addToWatchlist: addToWatchlistFunc,
  removeFromWatchlist: removeFromWatchlistFunc,
  generateCompanyReport: generateCompanyReportFunc,
  generateCompanyReportStream: generateCompanyReportStreamFunc,
  getReportTemplates: getReportTemplatesFunc,
  validateReportRequest: validateReportRequestFunc,
  generatePeriodReport: generatePeriodReportFunc,
  generatePeriodReportStream: generatePeriodReportStreamFunc,
  getPeriodReportTemplates: getPeriodReportTemplatesFunc,
  quickGeneratePeriodReport: quickGeneratePeriodReportFunc,
  getPeriodInfo: getPeriodInfoFunc,
  getPeriodReportCategories: getPeriodReportCategoriesFunc,
  getArticleLink: getArticleLinkFunc,
} = newsApiService;

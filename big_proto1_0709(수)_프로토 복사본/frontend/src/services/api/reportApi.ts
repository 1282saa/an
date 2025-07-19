/**
 * 레포트 관련 API 서비스
 */

import {
  API_BASE_URL,
  defaultOptions,
  handleApiError,
  createStreamReader,
  parseSSEData,
} from "./config";
import {
  ReportRequest,
  CompanyReport,
  ReportStreamData,
  AutoReportRequest,
  PeriodReport,
  ReportGenerationProgress,
  PeriodReportType,
} from "./types";

// ===== 기본 레포트 관련 API =====

/**
 * 기업 레포트 생성 (동기식)
 */
export const generateCompanyReport = async (
  request: ReportRequest
): Promise<CompanyReport> => {
  const response = await fetch(`${API_BASE_URL}/api/reports/company/generate`, {
    ...defaultOptions,
    method: "POST",
    body: JSON.stringify(request),
  });

  handleApiError(response);
  return response.json();
};

/**
 * 기업 레포트 생성 (스트리밍)
 */
export const generateCompanyReportStream = async (
  request: ReportRequest,
  onProgress: (data: ReportStreamData) => void,
  onComplete: (result: CompanyReport) => void,
  onError: (error: string) => void
): Promise<void> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/reports/company/generate-stream`,
      {
        ...defaultOptions,
        method: "POST",
        body: JSON.stringify(request),
      }
    );

    handleApiError(response);

    const reader = await createStreamReader(response);
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const data = parseSSEData(line);
        if (!data) continue;

        if (data.error) {
          onError(data.error);
          return;
        }

        if (data.type === "progress") {
          onProgress(data as ReportStreamData);
        }

        if (data.type === "complete" && data.result) {
          onComplete(data.result);
          return;
        }
      }
    }
  } catch (error) {
    onError(
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다"
    );
  }
};

/**
 * 사용 가능한 레포트 템플릿 조회
 */
export const getReportTemplates = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/reports/templates`, {
    ...defaultOptions,
    method: "GET",
  });

  handleApiError(response);
  return response.json();
};

/**
 * 레포트 요청 유효성 검사
 */
export const validateReportRequest = async (
  request: ReportRequest
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/reports/company/validate`, {
    ...defaultOptions,
    method: "POST",
    body: JSON.stringify(request),
  });

  handleApiError(response);
  return response.json();
};

// ===== 기간별 레포트 관련 API =====

/**
 * 기간별 레포트 생성 (동기식)
 */
export const generatePeriodReport = async (
  request: AutoReportRequest
): Promise<PeriodReport> => {
  const response = await fetch(`${API_BASE_URL}/api/period-reports/generate`, {
    ...defaultOptions,
    method: "POST",
    body: JSON.stringify(request),
  });

  handleApiError(response);
  return response.json();
};

/**
 * 기간별 레포트 생성 (스트리밍)
 */
export const generatePeriodReportStream = async (
  request: AutoReportRequest,
  onProgress: (data: ReportGenerationProgress) => void,
  onComplete: (result: PeriodReport) => void,
  onError: (error: string) => void
): Promise<void> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/period-reports/generate-stream`,
      {
        ...defaultOptions,
        method: "POST",
        body: JSON.stringify(request),
      }
    );

    handleApiError(response);

    const reader = await createStreamReader(response);
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const data = parseSSEData(line);
        if (!data) continue;

        if (data.error) {
          onError(data.error);
          return;
        }

        if (data.stage === "final_result" && data.result) {
          onComplete(data.result);
          return;
        } else if (data.stage && data.progress !== undefined) {
          onProgress(data as ReportGenerationProgress);
        }
      }
    }
  } catch (error) {
    onError(
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다"
    );
  }
};

/**
 * 기간별 레포트 템플릿 조회
 */
export const getPeriodReportTemplates = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/api/period-reports/templates`, {
    ...defaultOptions,
    method: "GET",
  });

  handleApiError(response);
  return response.json();
};

/**
 * 빠른 기간별 레포트 생성
 */
export const quickGeneratePeriodReport = async (
  reportType: PeriodReportType,
  categories?: string,
  maxArticles?: number
): Promise<PeriodReport> => {
  const params = new URLSearchParams();
  if (categories) params.append("categories", categories);
  if (maxArticles) params.append("max_articles", maxArticles.toString());

  const response = await fetch(
    `${API_BASE_URL}/api/period-reports/quick-generate/${reportType}?${params}`,
    {
      ...defaultOptions,
      method: "GET",
    }
  );

  handleApiError(response);
  return response.json();
};

/**
 * 기간 정보 조회
 */
export const getPeriodInfo = async (
  reportType: PeriodReportType
): Promise<any> => {
  const response = await fetch(
    `${API_BASE_URL}/api/period-reports/period-info/${reportType}`,
    {
      ...defaultOptions,
      method: "GET",
    }
  );

  handleApiError(response);
  return response.json();
};

/**
 * 사용 가능한 카테고리 조회
 */
export const getPeriodReportCategories = async (): Promise<any> => {
  const response = await fetch(
    `${API_BASE_URL}/api/period-reports/categories`,
    {
      ...defaultOptions,
      method: "GET",
    }
  );

  handleApiError(response);
  return response.json();
};

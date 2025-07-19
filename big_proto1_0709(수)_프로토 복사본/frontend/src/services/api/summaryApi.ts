/**
 * AI 요약 관련 API 서비스
 */

import {
  API_BASE_URL,
  defaultOptions,
  handleApiError,
  createStreamReader,
  parseSSEData,
} from "./config";
import { AISummaryRequest, AISummaryResponse } from "./types";

/**
 * AI 요약 생성 (동기식)
 */
export const generateAISummary = async (
  request: AISummaryRequest
): Promise<AISummaryResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/news/ai-summary`, {
    ...defaultOptions,
    method: "POST",
    body: JSON.stringify(request),
  });

  handleApiError(response);
  return response.json();
};

/**
 * AI 요약 생성 (스트리밍)
 */
export const generateAISummaryStream = async (
  request: AISummaryRequest,
  onProgress: (data: { step: string; progress: number; type?: string }) => void,
  onChunk: (chunk: string) => void,
  onComplete: (result: AISummaryResponse) => void,
  onError: (error: string) => void
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/news/ai-summary-stream`, {
      ...defaultOptions,
      method: "POST",
      body: JSON.stringify(request),
    });

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

        if (data.step && data.progress !== undefined) {
          onProgress({
            step: data.step,
            progress: data.progress,
            type: data.type || "thinking",
          });
        }

        if (data.chunk && data.type === "content") {
          onChunk(data.chunk);
        }

        if (data.result && data.type === "complete") {
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

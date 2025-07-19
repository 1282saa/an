/**
 * API 공통 설정
 */

// Vite 환경 변수는 import.meta.env 를 통해 접근합니다.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// 기본 요청 옵션
export const defaultOptions: RequestInit = {
  headers: {
    "Content-Type": "application/json",
  },
};

// API 오류 처리 헬퍼 함수
export const handleApiError = (response: Response): void => {
  if (!response.ok) {
    throw new Error(`API 오류: ${response.status}`);
  }
};

// 스트림 리더 유틸리티
export const createStreamReader = async (
  response: Response
): Promise<ReadableStreamDefaultReader<Uint8Array>> => {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("스트림을 읽을 수 없습니다");
  }
  return reader;
};

// SSE 데이터 파싱 유틸리티
export const parseSSEData = (line: string): any | null => {
  if (line.startsWith("data: ")) {
    try {
      return JSON.parse(line.slice(6));
    } catch (e) {
      console.warn("JSON 파싱 오류:", e);
      return null;
    }
  }
  return null;
};

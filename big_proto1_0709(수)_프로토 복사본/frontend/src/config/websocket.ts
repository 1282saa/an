/**
 * WebSocket 설정
 * 환경에 따른 WebSocket URL 관리
 */

// 환경별 API URL 설정 (현재는 SSE 사용)
const API_URLS = {
  development: 'http://localhost:8000',
  production: 'https://your-production-api-url',
  staging: 'https://your-staging-api-url'
};

// WebSocket URL (배포 후 사용)
const WEBSOCKET_URLS = {
  development: 'ws://localhost:8000/ws', // 나중에 WebSocket 서버용
  production: 'wss://your-production-websocket-url.execute-api.region.amazonaws.com/prod',
  staging: 'wss://your-staging-websocket-url.execute-api.region.amazonaws.com/staging'
};

/**
 * 현재 환경에 맞는 WebSocket URL 반환
 */
export function getWebSocketUrl(): string {
  // 개발 환경 체크
  const isDevelopment = 
    typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname.startsWith('192.168.'));

  // 스테이징 환경 체크
  const isStaging = 
    typeof window !== 'undefined' && 
    window.location.hostname.includes('staging');

  if (isDevelopment) {
    return WEBSOCKET_URLS.development;
  } else if (isStaging) {
    return WEBSOCKET_URLS.staging;
  } else {
    return WEBSOCKET_URLS.production;
  }
}

/**
 * WebSocket 설정
 */
export const WEBSOCKET_CONFIG = {
  maxReconnectAttempts: 5,
  baseReconnectDelay: 1000, // 1초
  connectionTimeout: 10000, // 10초
  pingInterval: 30000, // 30초
} as const;
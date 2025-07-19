/**
 * WebSocket 클라이언트
 * AWS API Gateway WebSocket과 연동하여 실시간 스트리밍을 처리
 */

import { getWebSocketUrl } from '../../config/websocket';

export interface WebSocketMessage {
  type: 'progress' | 'stream' | 'complete' | 'error' | 'pong';
  data?: any;
  message?: string;
}

export interface ConciergeRequest {
  question: string;
  date_from?: string;
  date_to?: string;
  max_articles?: number;
  include_related_keywords?: boolean;
  include_today_issues?: boolean;
  include_related_questions?: boolean;
  detail_level?: string;
  provider_filter?: string;
}

export interface ProgressCallback {
  onProgress?: (progress: any) => void;
  onStreamChunk?: (chunk: string) => void;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
}

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private isConnected: boolean = false;
  private messageCallbacks: Map<string, ProgressCallback> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 1000;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * WebSocket 연결
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.handleReconnect();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error('WebSocket connection failed'));
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * WebSocket 연결 해제
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * 메시지 처리
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      
      // 모든 활성 콜백에 메시지 전달
      this.messageCallbacks.forEach((callbacks) => {
        switch (message.type) {
          case 'progress':
            callbacks.onProgress?.(message.data);
            break;
          case 'stream':
            // 참고 레포지토리 스타일: stream 타입으로 통일
            callbacks.onStreamChunk?.(message.data?.content || '');
            break;
          case 'complete':
            callbacks.onComplete?.(message.data);
            break;
          case 'error':
            callbacks.onError?.(message.data?.message || message.message || 'Unknown error');
            break;
          case 'pong':
            // 핑/퐁 응답 처리
            console.log('Received pong from server');
            break;
        }
      });
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * 재연결 처리
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(async () => {
        try {
          await this.connect();
        } catch (error) {
          console.error('Reconnection failed:', error);
        }
      }, this.reconnectInterval * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      // 모든 콜백에 에러 전달
      this.messageCallbacks.forEach((callbacks) => {
        callbacks.onError?.('Connection lost and unable to reconnect');
      });
    }
  }

  /**
   * 뉴스 컨시어지 요청
   */
  async requestNewsConcierge(
    request: ConciergeRequest,
    callbacks: ProgressCallback
  ): Promise<string> {
    if (!this.isConnected) {
      throw new Error('WebSocket is not connected');
    }

    const requestId = `concierge_${Date.now()}`;
    this.messageCallbacks.set(requestId, callbacks);

    const message = {
      action: 'stream',
      data: request
    };

    this.socket?.send(JSON.stringify(message));
    return requestId;
  }

  /**
   * 요청 취소
   */
  cancelRequest(requestId: string): void {
    this.messageCallbacks.delete(requestId);
  }

  /**
   * 핑 전송
   */
  ping(): void {
    if (this.isConnected && this.socket) {
      this.socket.send(JSON.stringify({ action: 'ping' }));
    }
  }

  /**
   * 연결 상태 확인
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }
}

// 싱글톤 인스턴스
let webSocketClient: WebSocketClient | null = null;

/**
 * WebSocket 클라이언트 인스턴스 가져오기
 */
export function getWebSocketClient(): WebSocketClient {
  if (!webSocketClient) {
    // 설정 파일에서 URL 가져오기
    const wsUrl = getWebSocketUrl();
    webSocketClient = new WebSocketClient(wsUrl);
  }
  return webSocketClient;
}

/**
 * WebSocket 연결 초기화
 */
export async function initializeWebSocket(): Promise<void> {
  const client = getWebSocketClient();
  if (!client.isSocketConnected()) {
    await client.connect();
  }
}

/**
 * WebSocket 연결 해제
 */
export function disconnectWebSocket(): void {
  if (webSocketClient) {
    webSocketClient.disconnect();
    webSocketClient = null;
  }
}
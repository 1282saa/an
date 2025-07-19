/**
 * WebSocket 훅 - nexus_ver1 패턴 적용
 * 참고: https://github.com/1282saa/nexus_ver1/blob/main/frontend/src/hooks/useWebSocket.js
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { getWebSocketUrl } from '../config/websocket';

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: any) => boolean;
  startStreaming: (request: any) => boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

const useWebSocket = (projectId: string | null = null): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1초

  const getWebSocketUrlCallback = useCallback(() => {
    // 설정 파일에서 URL 가져오기
    try {
      return getWebSocketUrl();
    } catch (error) {
      console.warn('WebSocket 설정 로드 실패, 기본값 사용:', error);
      return 'ws://localhost:8000/ws';
    }
  }, []);

  const getReconnectDelay = useCallback(() => {
    // 지수 백오프: 1초, 2초, 4초, 8초, 16초
    return Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts.current), 16000);
  }, []);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const handleConnectionError = useCallback((errorCode: number) => {
    let errorMessage;
    switch (errorCode) {
      case 1000:
        errorMessage = '정상적으로 연결이 종료되었습니다.';
        break;
      case 1001:
        errorMessage = '서버에서 연결을 종료했습니다.';
        break;
      case 1006:
        errorMessage = '연결이 비정상적으로 종료되었습니다.';
        break;
      default:
        errorMessage = `연결 오류 (코드: ${errorCode})`;
    }
    setError(errorMessage);
    console.error('WebSocket 연결 오류:', errorMessage);
  }, []);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const wsUrl = getWebSocketUrlCallback();
      console.log(`WebSocket 연결 시도: ${wsUrl}`);
      
      const socket = new WebSocket(wsUrl);
      
      // 연결 타임아웃 설정 (10초)
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState === WebSocket.CONNECTING) {
          socket.close();
          setError('연결 시간 초과');
          setIsConnecting(false);
        }
      }, 10000);

      socket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket 연결 성공');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttempts.current = 0;
        
        // 핑 메시지 전송하여 연결 확인
        socket.send(JSON.stringify({ action: 'ping' }));
      };

      socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket 연결 종료:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        handleConnectionError(event.code);
        
        // 비정상 종료 시 재연결 시도
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = getReconnectDelay();
          console.log(`${delay}ms 후 재연결 시도... (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('최대 재연결 횟수를 초과했습니다.');
        }
      };

      socket.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('WebSocket 오류:', error);
        setError('WebSocket 연결 오류가 발생했습니다.');
        setIsConnecting(false);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket 메시지 수신:', message);
          
          // 커스텀 이벤트로 메시지 브로드캐스트
          window.dispatchEvent(new CustomEvent('websocketMessage', {
            detail: message
          }));
        } catch (error) {
          console.error('메시지 파싱 오류:', error);
        }
      };

      socketRef.current = socket;

    } catch (error) {
      console.error('WebSocket 연결 실패:', error);
      setError('WebSocket 연결에 실패했습니다.');
      setIsConnecting(false);
    }
  }, [isConnecting, isConnected, getWebSocketUrlCallback, handleConnectionError, getReconnectDelay]);

  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    reconnectAttempts.current = 0;
    
    if (socketRef.current) {
      socketRef.current.close(1000, '사용자가 연결을 종료했습니다.');
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
  }, [clearReconnectTimeout]);

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        const messageString = typeof message === 'string' ? message : JSON.stringify(message);
        socketRef.current.send(messageString);
        console.log('메시지 전송:', message);
        return true;
      } catch (error) {
        console.error('메시지 전송 실패:', error);
        setError('메시지 전송에 실패했습니다.');
        return false;
      }
    } else {
      console.warn('WebSocket이 연결되지 않았습니다.');
      setError('WebSocket이 연결되지 않았습니다.');
      return false;
    }
  }, []);

  const startStreaming = useCallback((request: any) => {
    return sendMessage({
      action: 'stream',
      data: {
        projectId: projectId,
        ...request
      }
    });
  }, [sendMessage, projectId]);

  // projectId 변경 시 재연결
  useEffect(() => {
    if (projectId && isConnected) {
      console.log('프로젝트 ID 변경으로 재연결:', projectId);
      disconnect();
      setTimeout(() => connect(), 1000);
    }
  }, [projectId, isConnected, disconnect, connect]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      clearReconnectTimeout();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [clearReconnectTimeout]);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    sendMessage,
    startStreaming,
    reconnectAttempts: reconnectAttempts.current,
    maxReconnectAttempts
  };
};

export default useWebSocket;
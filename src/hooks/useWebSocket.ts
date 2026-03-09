'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useKernelStore } from '@/stores/kernel-store';

interface UseWebSocketOptions {
  sessionId?: string;
  onMessage?: (data: unknown) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { sessionId, onMessage } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { jwt, setWsConnected, setWsReconnecting } = useKernelStore();

  const connect = useCallback(() => {
    if (!jwt) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const params = new URLSearchParams({ token: jwt });
    if (sessionId) params.set('sessionId', sessionId);

    const wsUrl = `${protocol}//${window.location.host}/ws?${params}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch {
        // Non-JSON message
      }
    };

    ws.onclose = (event) => {
      setWsConnected(false);
      wsRef.current = null;

      // Auto-reconnect unless it was an auth failure
      if (event.code !== 4001) {
        setWsReconnecting(true);
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      // Error will trigger onclose
    };

    wsRef.current = ws;
  }, [jwt, sessionId, onMessage, setWsConnected, setWsReconnecting]);

  const send = useCallback(
    (data: unknown) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(data));
      }
    },
    [],
  );

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { send, disconnect, reconnect: connect };
}

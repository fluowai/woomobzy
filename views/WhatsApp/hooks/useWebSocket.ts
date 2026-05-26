import { logger } from '@/utils/logger';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getAuthorizedWhatsAppWsUrl } from './api';

interface WSEvent {
  event: string;
  data: any;
}

type EventHandler = (data: any) => void;

export function useWebSocket(enabled = true) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);
  const maxReconnectDelay = 30000;
  const intentionalClose = useRef(false);

  const connect = useCallback(async () => {
    if (!enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      intentionalClose.current = false;
      const wsUrl = await getAuthorizedWhatsAppWsUrl();
      if (intentionalClose.current || !enabled) return;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        logger.info('✅ WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const messages = event.data.split('\n');
          for (const msgStr of messages) {
            if (!msgStr.trim()) continue;
            const wsEvent: WSEvent = JSON.parse(msgStr);
            const handlers = handlersRef.current.get(wsEvent.event);
            if (handlers) {
              handlers.forEach((handler) => handler(wsEvent.data));
            }
          }
        } catch (err) {
          // Silently ignore parse errors
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        if (intentionalClose.current || !enabled) {
          return;
        }

        const delay = getReconnectDelay(reconnectAttempts.current, maxReconnectDelay);
        reconnectAttempts.current += 1;
        logger.warn(`WhatsApp WebSocket disconnected. Reconnecting in ${delay}ms.`);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = (event) => {
        logger.warn('WhatsApp WebSocket error', event);
      };

      wsRef.current = ws;
    } catch (err) {
      const delay = getReconnectDelay(reconnectAttempts.current, maxReconnectDelay);
      reconnectAttempts.current += 1;
      logger.warn(`Failed to create WhatsApp WebSocket. Reconnecting in ${delay}ms.`, err);
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    }
  }, [enabled]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    intentionalClose.current = true;
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const on = useCallback((event: string, handler: EventHandler) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);

    return () => {
      handlersRef.current.get(event)?.delete(handler);
    };
  }, []);

  // Connect on mount
  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }

    reconnectAttempts.current = 0;
    connect();
    return () => disconnect();
  }, [connect, disconnect, enabled]);

  return { isConnected, on, connect, disconnect };
}

function getReconnectDelay(attempt: number, maxDelay: number): number {
  const exponentialDelay = Math.min(1000 * 2 ** attempt, maxDelay);
  const jitter = Math.floor(Math.random() * 1000);
  return exponentialDelay + jitter;
}

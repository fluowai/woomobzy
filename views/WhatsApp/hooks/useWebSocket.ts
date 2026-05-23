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
  const maxReconnectAttempts = 3; // Limited to prevent console spam
  const gaveUp = useRef(false);
  const intentionalClose = useRef(false);

  const connect = useCallback(async () => {
    if (!enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (gaveUp.current) return; // Don't try if we already gave up

    try {
      intentionalClose.current = false;
      const wsUrl = await getAuthorizedWhatsAppWsUrl();
      if (intentionalClose.current || !enabled) return;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        logger.info('✅ WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        gaveUp.current = false;
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

        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          reconnectAttempts.current += 1;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else if (!gaveUp.current) {
          gaveUp.current = true;
          logger.warn('⚠️ WhatsApp WebSocket: serviço indisponível. Reconexão desativada.');
        }
      };

      ws.onerror = () => {
        // Suppress error logging - onclose will handle reconnection
      };

      wsRef.current = ws;
    } catch (err) {
      // WebSocket creation failed - service unavailable
      gaveUp.current = true;
    }
  }, [enabled]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    intentionalClose.current = true;
    reconnectAttempts.current = maxReconnectAttempts;
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

    gaveUp.current = false;
    reconnectAttempts.current = 0;
    connect();
    return () => disconnect();
  }, [connect, disconnect, enabled]);

  return { isConnected, on, connect, disconnect };
}

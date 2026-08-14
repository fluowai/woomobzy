import { logger } from '@/utils/logger';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getAuthorizedWhatsAppWsUrl, normalizeStorageUrls } from './api';

interface WSEvent {
  event: string;
  data: any;
}

type EventHandler = (data: any) => void;

export function useWebSocket(enabled = true) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const reconnectAttempts = useRef(0);
  const maxReconnectDelay = 30000;
  const intentionalClose = useRef(false);
  const currentMountId = useRef(0);

  const connect = useCallback(
    async (mountId: number) => {
      logger.info(`[WS] connect(${mountId}) started. enabled=${enabled}`);
      if (!enabled) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        logger.info(`[WS] Already open.`);
        return;
      }

      try {
        logger.info(`[WS] Fetching URL...`);
        const wsUrl = await getAuthorizedWhatsAppWsUrl();
        logger.info(
          `[WS] URL fetched. mountId=${mountId}, current=${currentMountId.current}, intentional=${intentionalClose.current}`
        );
        if (
          !enabled ||
          currentMountId.current !== mountId ||
          intentionalClose.current
        ) {
          logger.info(
            `[WS] Aborting connect. enabled=${enabled}, intentionalClose=${intentionalClose.current}`
          );
          return;
        }

        logger.info(`[WS] Creating new WebSocket instance...`);
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
                const normalizedData = normalizeStorageUrls(wsEvent.data);
                handlers.forEach((handler) => handler(normalizedData));
              }
            }
          } catch (err) {
            // Silently ignore parse errors
          }
        };

        ws.onclose = () => {
          if (wsRef.current === ws) {
            setIsConnected(false);
            wsRef.current = null;
          }

          if (
            intentionalClose.current ||
            !enabled ||
            (wsRef.current !== ws && wsRef.current !== null)
          ) {
            return;
          }

          const delay = getReconnectDelay(
            reconnectAttempts.current,
            maxReconnectDelay
          );
          reconnectAttempts.current += 1;
          logger.warn(
            `WhatsApp WebSocket disconnected. Reconnecting in ${delay}ms.`
          );
          reconnectTimeoutRef.current = setTimeout(
            () => connect(mountId),
            delay
          );
        };

        ws.onerror = (event) => {
          logger.warn('WhatsApp WebSocket error', event);
        };

        wsRef.current = ws;
      } catch (err) {
        if (currentMountId.current !== mountId) return;

        const delay = getReconnectDelay(
          reconnectAttempts.current,
          maxReconnectDelay
        );
        reconnectAttempts.current += 1;
        logger.warn(
          `Failed to create WhatsApp WebSocket. Reconnecting in ${delay}ms.`,
          err
        );
        reconnectTimeoutRef.current = setTimeout(() => connect(mountId), delay);
      }
    },
    [enabled]
  );

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    intentionalClose.current = true;

    if (wsRef.current) {
      const ws = wsRef.current;
      if (ws.readyState === WebSocket.CONNECTING) {
        // Prevent console error by waiting for open before closing
        ws.onopen = () => ws.close();
      } else {
        ws.close();
      }
    }

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

    currentMountId.current += 1;
    const mountId = currentMountId.current;
    intentionalClose.current = false;
    reconnectAttempts.current = 0;

    connect(mountId);

    return () => disconnect();
  }, [connect, disconnect, enabled]);

  return { isConnected, on, connect, disconnect };
}

function getReconnectDelay(attempt: number, maxDelay: number): number {
  const exponentialDelay = Math.min(1000 * 2 ** attempt, maxDelay);
  const jitter = Math.floor(Math.random() * 1000);
  return exponentialDelay + jitter;
}

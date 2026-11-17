import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase';

interface WSEvent {
  type: string;
  [key: string]: unknown;
}

export function useInstagramWebSocket(
  companyId: string | null,
  onEvent: (event: WSEvent) => void
) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = useCallback(async () => {
    if (!companyId || wsRef.current?.readyState === WebSocket.OPEN) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/instagram/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'auth', token, companyId }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'auth_ok') return;
        onEvent(data);
      } catch {
        /* ignore malformed */
      }
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 5000);
    };

    ws.onerror = () => ws.close();
  }, [companyId, onEvent]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}

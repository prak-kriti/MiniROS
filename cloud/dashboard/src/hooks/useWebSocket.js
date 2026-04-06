import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket(url) {
  const [lastMessage, setLastMessage] = useState(null);
  const [connected, setConnected] = useState(false);
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const shouldReconnect = useRef(true);

  useEffect(() => {
    shouldReconnect.current = true;

    function connect() {
      if (!shouldReconnect.current) return;

      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setConnected(true);
        console.log('WebSocket connected');
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      };

      ws.current.onclose = () => {
        setConnected(false);
        if (!shouldReconnect.current) return;
        reconnectTimer.current = setTimeout(connect, 2000);
      };

      ws.current.onerror = (err) => {
        // Browsers emit a generic error event when the socket closes
        // before the handshake completes, e.g. while the backend is starting.
        if (ws.current?.readyState !== WebSocket.CLOSED) {
          console.warn('WebSocket handshake issue, retrying...', err);
          ws.current.close();
        }
      };
    }

    connect();

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      ws.current?.close();
    };
  }, [url]);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return { lastMessage, connected, send };
}

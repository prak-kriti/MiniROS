import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket(url) {
  const [lastMessage, setLastMessage] = useState(null);
  const [connected, setConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    function connect() {
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
        // Auto-reconnect after 2 seconds
        setTimeout(connect, 2000);
      };

      ws.current.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.current.close();
      };
    }

    connect();
    return () => ws.current?.close();
  }, [url]);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return { lastMessage, connected, send };
}
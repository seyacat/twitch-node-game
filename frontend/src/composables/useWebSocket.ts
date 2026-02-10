import { ref, onUnmounted } from 'vue';
import { WebSocketMessage } from '@shared';

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  reconnectAttempts: number;
  messageHandlers: Map<string, Function[]>;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

export const useWebSocket = () => {
  const state = ref<WebSocketState>({
    socket: null,
    isConnected: false,
    reconnectAttempts: 0,
    messageHandlers: new Map(),
  });

  const connect = (token: string) => {
    if (state.value.socket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';
    const url = `${wsUrl}?token=${encodeURIComponent(token)}`;
    
    try {
      const socket = new WebSocket(url);
      state.value.socket = socket;

      socket.onopen = () => {
        console.log('WebSocket connected');
        state.value.isConnected = true;
        state.value.reconnectAttempts = 0;
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        state.value.isConnected = false;
        state.value.socket = null;
        
        // Attempt reconnection if not closed normally
        if (event.code !== 1000 && state.value.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setTimeout(() => {
            state.value.reconnectAttempts++;
            console.log(`Reconnecting... Attempt ${state.value.reconnectAttempts}`);
            connect(token);
          }, RECONNECT_DELAY);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  const disconnect = () => {
    if (state.value.socket) {
      state.value.socket.close(1000, 'User disconnected');
      state.value.socket = null;
      state.value.isConnected = false;
    }
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (!state.value.socket || state.value.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket not connected');
      return false;
    }

    try {
      state.value.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  };

  const onMessage = (type: string, handler: Function) => {
    if (!state.value.messageHandlers.has(type)) {
      state.value.messageHandlers.set(type, []);
    }
    state.value.messageHandlers.get(type)!.push(handler);
  };

  const offMessage = (type: string, handler: Function) => {
    const handlers = state.value.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  };

  const handleMessage = (message: WebSocketMessage) => {
    const handlers = state.value.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message.payload));
    }
  };

  // Clean up on unmount
  onUnmounted(() => {
    disconnect();
    state.value.messageHandlers.clear();
  });

  return {
    connect,
    disconnect,
    sendMessage,
    onMessage,
    offMessage,
    status: state.value.isConnected ? 'connected' : 'disconnected',
    isConnected: state.value.isConnected,
  };
};
import { io, Socket } from 'socket.io-client';
import { ChatMessage } from './chat';
import { useMessageStore } from './message.store';
import { useAuthStore } from './auth.store';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

function connect(token: string) {
  disconnect();
  socket = io(SOCKET_URL, { auth: { token } });
  socket.on('message:new', (message: ChatMessage) => {
    useMessageStore.getState().addMessage(message);
  });
}

function disconnect() {
  socket?.disconnect();
  socket = null;
}

export function initChatSocket() {
  const initial = useAuthStore.getState().accessToken;
  if (initial) connect(initial);
  const unsubscribe = useAuthStore.subscribe((state, prevState) => {
    if (state.accessToken === prevState.accessToken) return;
    if (state.accessToken) {
      connect(state.accessToken);
    } else {
      disconnect();
    }
  });

  return () => {
    unsubscribe();
    disconnect();
  };
}

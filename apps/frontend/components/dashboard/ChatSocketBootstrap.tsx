'use client';

import { initChatSocket } from '@/lib/stores/chat-socket';
import { useEffect } from 'react';

export function ChatSocketBootstrap() {
  useEffect(() => initChatSocket(), []);
  return null;
}

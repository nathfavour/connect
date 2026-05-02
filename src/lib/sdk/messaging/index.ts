import { KylrixApp } from '../design';

export type MessageKind = 'text' | 'image' | 'video' | 'file' | 'call_signal';

export interface MessageEnvelope {
  conversationId: string;
  senderId: string;
  kind: MessageKind;
  content?: string;
  attachments?: string[];
  app?: KylrixApp;
  createdAt?: string;
}

export function buildMessageEnvelope(message: MessageEnvelope): MessageEnvelope {
  return {
    ...message,
    createdAt: message.createdAt || new Date().toISOString(),
  };
}

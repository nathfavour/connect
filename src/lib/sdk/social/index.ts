import { KylrixApp } from '../design';

export type MomentVisibility = 'private' | 'shared' | 'public';

export interface MomentAttachment {
  id: string;
  type: 'image' | 'video' | 'file' | 'link';
  url: string;
  title?: string;
}

export interface MomentSignal {
  id: string;
  app: KylrixApp;
  title: string;
  body?: string;
  visibility: MomentVisibility;
  authorId: string;
  threadId?: string;
  attachments?: MomentAttachment[];
  createdAt?: string;
}

export function buildMomentSignal(signal: MomentSignal): MomentSignal {
  return {
    ...signal,
    createdAt: signal.createdAt || new Date().toISOString(),
  };
}

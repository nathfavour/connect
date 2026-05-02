import { KylrixApp } from '../design';

export interface HuddleSignal {
  id: string;
  hostId: string;
  title: string;
  participants?: string[];
  sourceApp: KylrixApp;
  startedAt?: string;
}

export function buildHuddleSignal(signal: HuddleSignal): HuddleSignal {
  return {
    ...signal,
    startedAt: signal.startedAt || new Date().toISOString(),
  };
}

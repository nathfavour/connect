export type SignalData = {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  target: string; // User ID to send to
  sender: string; // User ID sending
};

export type PeerState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';

export interface CallConfig {
  video: boolean;
  audio: boolean;
}

export interface PeerConnectionEvents {
  onTrack: (stream: MediaStream) => void;
  onData: (data: any) => void;
  onStateChange: (state: PeerState) => void;
  onSignal: (signal: SignalData) => void;
}

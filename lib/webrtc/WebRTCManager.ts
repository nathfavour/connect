import { PeerConnectionEvents, SignalData, PeerState } from '@/types/p2p';

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  };
  
  private events: PeerConnectionEvents;
  public state: PeerState = 'idle';
  private candidateQueue: RTCIceCandidateInit[] = [];
  private isRemoteDescriptionSet = false;

  constructor(events: PeerConnectionEvents) {
    this.events = events;
  }

  public async initializeLocalStream(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video, audio });
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  public createPeerConnection(senderId: string, targetId: string) {
    if (this.peerConnection) return;

    this.peerConnection = new RTCPeerConnection(this.config);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.events.onSignal({
          type: 'candidate',
          candidate: event.candidate.toJSON(),
          target: targetId,
          sender: senderId
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.events.onTrack(this.remoteStream);
    };

    this.peerConnection.onconnectionstatechange = () => {
      this.updateState(this.peerConnection?.connectionState as PeerState);
    };

    // Add local tracks to connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }
  }

  public async createOffer(senderId: string, targetId: string) {
    this.createPeerConnection(senderId, targetId);
    if (!this.peerConnection) return;

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.events.onSignal({
      type: 'offer',
      sdp: offer.sdp,
      target: targetId,
      sender: senderId
    });
  }

  public async handleSignal(signal: SignalData) {
    if (!this.peerConnection && signal.type === 'offer') {
      // Initialize if receiving offer
      this.createPeerConnection(signal.target, signal.sender);
    }

    if (!this.peerConnection) return;

    if (signal.type === 'offer' && signal.sdp) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
      this.isRemoteDescriptionSet = true;
      this.processCandidateQueue();
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.events.onSignal({
        type: 'answer',
        sdp: answer.sdp,
        target: signal.sender,
        sender: signal.target
      });
    } else if (signal.type === 'answer' && signal.sdp) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
      this.isRemoteDescriptionSet = true;
      this.processCandidateQueue();
    } else if (signal.type === 'candidate' && signal.candidate) {
      if (this.isRemoteDescriptionSet) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } else {
        this.candidateQueue.push(signal.candidate);
      }
    }
  }

  private async processCandidateQueue() {
    for (const candidate of this.candidateQueue) {
      await this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
    }
    this.candidateQueue = [];
  }

  public cleanup() {
    this.localStream?.getTracks().forEach(track => track.stop());
    this.peerConnection?.close();
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isRemoteDescriptionSet = false;
    this.candidateQueue = [];
    this.updateState('disconnected');
  }

  private updateState(newState: PeerState) {
    this.state = newState;
    this.events.onStateChange(newState);
  }
}

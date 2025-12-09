'use client';

import { useState } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoContainer } from '@/components/call/VideoContainer';
import { CallControls } from '@/components/call/CallControls';
import { ChatBox } from '@/components/chat/ChatBox';

export default function Home() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [roomInput, setRoomInput] = useState('demo-room');
  const [isJoined, setIsJoined] = useState(false);
  
  // Generate random IDs for testing
  const [userId] = useState(() => Math.random().toString(36).substr(2, 9));

  const {
    localStream,
    remoteStream,
    connectionState,
    startCall,
    joinRoom,
    startRecording,
    stopRecording,
    isRecording
  } = useWebRTC(userId);

  const handleJoinRoom = () => {
    if (!roomInput) return;
    joinRoom(roomInput);
    setIsJoined(true);
  };

  const handleStartCall = async () => {
    setIsCallActive(true);
    await startCall();
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div style={{ padding: '20px', fontWeight: 'bold' }}>WhisperrConnect</div>
        <div style={{ padding: '0 20px', fontSize: '12px', color: '#666' }}>
          ID: {userId}
        </div>
        <nav style={{ padding: '20px' }}>
          <div style={{ marginBottom: '10px', cursor: 'pointer' }}>Chats</div>
          <div style={{ marginBottom: '10px', cursor: 'pointer', fontWeight: 'bold', color: '#0070f3' }}>Calls</div>
          <div style={{ marginBottom: '10px', cursor: 'pointer' }}>Contacts</div>
        </nav>
      </aside>
      
      <main className="main-content" style={{ flexDirection: 'row' }}>
        <div style={{ flex: 1, position: 'relative', backgroundColor: '#222', display: 'flex', flexDirection: 'column' }}>
          {/* Video Area */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
            {isCallActive || remoteStream ? (
              <>
                {/* Remote Video (Main) */}
                <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {remoteStream ? (
                    <VideoContainer stream={remoteStream} />
                  ) : (
                    <div style={{ color: 'white' }}>Waiting for connection... ({connectionState})</div>
                  )}
                </div>
                
                {/* Local Video (PIP) */}
                <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 5 }}>
                  <VideoContainer stream={localStream} isLocal />
                </div>

                <CallControls 
                  onEndCall={() => setIsCallActive(false)}
                  onToggleMute={() => {}}
                  onToggleVideo={() => {}}
                  onToggleRecord={() => isRecording ? stopRecording() : startRecording()}
                  isMuted={false}
                  isVideoOff={false}
                  isRecording={isRecording}
                />
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'white' }}>
                <h2>Start a Call</h2>
                
                {!isJoined ? (
                  <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#333', borderRadius: '8px' }}>
                    <p style={{ marginBottom: '10px' }}>Enter a Room ID to connect with others nearby (same browser).</p>
                    <input 
                      type="text" 
                      value={roomInput}
                      onChange={(e) => setRoomInput(e.target.value)}
                      placeholder="Room ID"
                      style={{ padding: '8px', borderRadius: '4px', border: 'none', marginRight: '10px' }}
                    />
                    <button 
                      onClick={handleJoinRoom}
                      style={{ padding: '8px 16px', borderRadius: '5px', border: 'none', backgroundColor: '#28a745', color: 'white', cursor: 'pointer' }}
                    >
                      Join Room
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: '20px' }}>
                    <p style={{ marginBottom: '20px', color: '#4caf50' }}>Joined Room: {roomInput}</p>
                    <p style={{ marginBottom: '20px', fontSize: '0.9em', color: '#aaa' }}>Open this page in another tab, join the same room, then click Start Call.</p>
                    <button 
                      onClick={handleStartCall}
                      style={{ padding: '10px 20px', borderRadius: '5px', border: 'none', backgroundColor: '#0070f3', color: 'white', cursor: 'pointer', fontSize: '16px' }}
                    >
                      Start Call
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Sidebar (Right) */}
        <div style={{ width: '300px', display: isCallActive ? 'block' : 'none' }}>
          <ChatBox />
        </div>

        {/* Mobile Bottom Navigation Placeholder */}
        <nav className="bottom-nav">
          <div>Chats</div>
          <div>Calls</div>
          <div>Settings</div>
        </nav>
      </main>
    </div>
  );
}

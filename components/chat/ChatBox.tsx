import React, { useState } from 'react';

export const ChatBox = () => {
  const [messages, setMessages] = useState<{text: string, sender: 'me' | 'them'}[]>([]);
  const [input, setInput] = useState('');

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages([...messages, { text: input, sender: 'me' }]);
    setInput('');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderLeft: '1px solid #eee',
      backgroundColor: 'white'
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
        Chat
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start',
            backgroundColor: msg.sender === 'me' ? '#0070f3' : '#f0f0f0',
            color: msg.sender === 'me' ? 'white' : 'black',
            padding: '8px 12px',
            borderRadius: '12px',
            maxWidth: '80%'
          }}>
            {msg.text}
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} style={{ padding: '16px', borderTop: '1px solid #eee', display: 'flex' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '20px',
            border: '1px solid #ddd',
            marginRight: '8px'
          }}
        />
        <button type="submit" style={{
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          padding: '8px 16px',
          cursor: 'pointer'
        }}>Send</button>
      </form>
    </div>
  );
};

'use client';

import { useAuth } from '@/lib/auth';

export const AuthOverlay = () => {
    const { user, loading, login } = useAuth();

    if (loading) return null;

    if (!user) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.8)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '40px',
                    borderRadius: '20px',
                    textAlign: 'center',
                    maxWidth: '400px'
                }}>
                    <h2 style={{ marginBottom: '20px', color: 'black' }}>Welcome to WhisperrConnect</h2>
                    <p style={{ marginBottom: '30px', color: '#666' }}>
                        Please sign in with your Whisperr ID to continue.
                    </p>
                    <button
                        onClick={login}
                        style={{
                            backgroundColor: '#f9c806',
                            color: '#1a1a1a',
                            border: 'none',
                            padding: '14px 28px',
                            borderRadius: '16px',
                            fontSize: '16px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            width: '100%',
                            boxShadow: '0 4px 14px 0 rgba(249, 200, 6, 0.39)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Sign In with Whisperr ID
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

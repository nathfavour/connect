import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const { sessionId, sessionDescription } = await req.json();
    const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API;
    const CLOUDFLARE_APP_ID = process.env.NEXT_PUBLIC_CLOUDFLARE_APP_ID;

    if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_APP_ID) {
        return NextResponse.json({ error: 'Cloudflare configuration missing' }, { status: 500 });
    }

    if (!sessionId || !sessionDescription?.sdp || !sessionDescription?.type) {
        return NextResponse.json({ error: 'sessionId and sessionDescription are required' }, { status: 400 });
    }

    try {
        const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${CLOUDFLARE_APP_ID}/sessions/${sessionId}/renegotiate`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionDescription })
        });

        if (!response.ok) {
            const error = await response.text();
            return NextResponse.json({ error: 'Cloudflare renegotiation failed', details: error }, { status: response.status });
        }

        const data = await response.json().catch(() => ({}));
        return NextResponse.json(data);
    } catch (e) {
        console.error('Renegotiate API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

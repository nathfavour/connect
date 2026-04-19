import { createAPIFileRoute } from '@tanstack/react-start/api';

export const APIRoute = createAPIFileRoute('/api/calls/session')({
  POST: async () => {
    const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API;
    const CLOUDFLARE_APP_ID = process.env.NEXT_PUBLIC_CLOUDFLARE_APP_ID;

    if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_APP_ID) {
      return Response.json({ error: 'Cloudflare configuration missing' }, { status: 500 });
    }

    try {
      const response = await fetch(`https://rtc.cloudflare.com/v1/apps/${CLOUDFLARE_APP_ID}/sessions/new`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return Response.json({ error: 'Cloudflare Session Init Failed', details: error }, { status: response.status });
      }

      const data = await response.json();
      return Response.json(data);
    } catch (e) {
      console.error('Session API Error:', e);
      return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  },
});
export const Route = APIRoute;

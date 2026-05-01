import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { resolveCurrentUser } from '@/lib/appwrite/client';

type AIChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export const createCloudflareSession = createServerFn({ method: 'POST' }).handler(async () => {
  const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API;
  const CLOUDFLARE_APP_ID = process.env.NEXT_PUBLIC_CLOUDFLARE_APP_ID;

  if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_APP_ID) {
    throw new Error('Cloudflare configuration missing');
  }

  const response = await fetch(`https://rtc.cloudflare.com/v1/apps/${CLOUDFLARE_APP_ID}/sessions/new`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return await response.json();
});

export const createCloudflareTracks = createServerFn({ method: 'POST' })
  .inputValidator((data: { sessionId: string; tracks: unknown[] }) => data)
  .handler(async ({ data }) => {
    const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API;
    const CLOUDFLARE_APP_ID = process.env.NEXT_PUBLIC_CLOUDFLARE_APP_ID;

    if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_APP_ID) {
      throw new Error('Cloudflare configuration missing');
    }

    const response = await fetch(`https://rtc.cloudflare.com/v1/apps/${CLOUDFLARE_APP_ID}/sessions/${data.sessionId}/tracks/new`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracks: data.tracks }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return await response.json();
  });

export const generateAIResponse = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    prompt: string;
    history?: AIChatMessage[];
    systemInstruction?: string;
    apiKey?: string;
  }) => data)
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await resolveCurrentUser(request as any);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const apiKey = data.apiKey || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('AI service not configured');
    }

    if (!data.apiKey) {
      const plan = (user as any).prefs?.subscriptionTier || 'FREE';
      const isPro = ['PRO', 'ORG', 'LIFETIME'].includes(plan);
      if (!isPro) {
        throw new Error('AI features require a Pro account. Upgrade to continue or provide your own API key in settings.');
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash',
      systemInstruction: data.systemInstruction || "You are Kylrixbot, an intelligent assistant for Kylrixconnect, a premium secure communication and networking app. You represent 'Quiet Power' and 'The Glass Monolith' aesthetic. Be concise, professional, and helpful. Help users communicate more effectively while maintaining privacy.",
    });

    if (data.history && data.history.length > 0) {
      const chat = model.startChat({
        history: data.history.map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        })),
      });
      const result = await chat.sendMessage(data.prompt);
      return result.response.text();
    }

    const result = await model.generateContent(data.prompt);
    return result.response.text();
  });

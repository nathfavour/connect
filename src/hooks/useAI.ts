'use client';

import { useAuth } from '@/lib/auth';
import { generateAIResponse } from '@/lib/server/api';

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const useAI = () => {
  const { user } = useAuth();

  const generate = async (prompt: string, options: { 
    history?: AIChatMessage[], 
    systemInstruction?: string 
  } = {}) => {
    const customKey = (user as any)?.prefs?.customGeminiKey;
    return await generateAIResponse({
      data: {
        prompt,
        history: options.history,
        systemInstruction: options.systemInstruction,
        apiKey: customKey || undefined,
      },
    });
  };

  return { generate };
};

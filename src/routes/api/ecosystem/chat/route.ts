import { createAPIFileRoute } from '@tanstack/react-start/api';
import { getRequest } from '@tanstack/react-start/server';
import { ChatService } from '@/lib/services/chat';
import { resolveCurrentUser } from '@/lib/appwrite/client';

export const APIRoute = createAPIFileRoute('/api/ecosystem/chat')({
  POST: async () => {
    try {
      const request = getRequest();
      const user = await resolveCurrentUser(request);
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const body = await request.json();
      const { conversationId, content, type, attachments, appId: _appId } = body;

      if (!conversationId || !content) {
        return Response.json({ error: 'Missing conversationId or content' }, { status: 400 });
      }

      const message = await ChatService.sendMessage(
        conversationId,
        user.$id,
        content,
        type || 'text',
        attachments || [],
        undefined,
        undefined,
        { cookie: request.headers.get('cookie') || undefined },
      );

      return Response.json({ success: true, messageId: message.$id });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      return Response.json({ error: message }, { status: 500 });
    }
  },
  GET: async () => {
    try {
      const request = getRequest();
      const user = await resolveCurrentUser(request);
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const result = await ChatService.getConversations(user.$id);
      return Response.json({ conversations: result.rows });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      return Response.json({ error: message }, { status: 500 });
    }
  },
});
export const Route = APIRoute;

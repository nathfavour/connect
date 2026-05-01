import { createFileRoute } from '@tanstack/react-router';
import { getRequest } from '@tanstack/react-start/server';
import { ActivityService, AppActivity } from '@/lib/services/activity';
import { resolveCurrentUser } from '@/lib/appwrite/client';

export const Route = createFileRoute('/api/ecosystem/activity')({
  server: {
    handlers: {
      POST: async () => {
        try {
          const request = getRequest();
          const user = await resolveCurrentUser(request);
          if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

          const body = await request.json();
          const activity: AppActivity = {
            userId: user.$id,
            appId: body.appId,
            action: body.action,
            metadata: body.metadata,
            timestamp: new Date().toISOString(),
          };

          await ActivityService.logActivity(activity);
          const synergies = await ActivityService.analyzeSynergy(user.$id);

          return Response.json({ success: true, synergies });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Internal Server Error';
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});

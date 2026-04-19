import { createAPIFileRoute } from '@tanstack/react-start/api';
import { POST } from '@/app/api/calls/session/route';

export const APIRoute = createAPIFileRoute('/api/calls/session')({
  POST,
});

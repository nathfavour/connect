import { createAPIFileRoute } from '@tanstack/react-start/api';
import { GET, POST } from '@/app/api/ecosystem/chat/route';

export const APIRoute = createAPIFileRoute('/api/ecosystem/chat')({
  GET,
  POST,
});

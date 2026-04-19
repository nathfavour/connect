import { createAPIFileRoute } from '@tanstack/react-start/api';
import { POST } from '@/app/api/calls/tracks/route';

export const APIRoute = createAPIFileRoute('/api/calls/tracks')({
  POST,
});

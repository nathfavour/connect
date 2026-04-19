import { createAPIFileRoute } from '@tanstack/react-start/api';
import { POST } from '@/app/api/ecosystem/activity/route';

export const APIRoute = createAPIFileRoute('/api/ecosystem/activity')({
  POST,
});

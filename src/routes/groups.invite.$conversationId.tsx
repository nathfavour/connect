import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/groups/invite/[conversationId]/page';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';

export const Route = createFileRoute('/groups/invite/$conversationId')({ errorComponent: RouteErrorBoundary, component: Page });

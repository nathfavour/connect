import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/chat/[id]/page';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';

export const Route = createFileRoute('/chat/$id')({ errorComponent: RouteErrorBoundary, component: Page });

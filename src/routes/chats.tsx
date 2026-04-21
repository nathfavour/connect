import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/chats/page';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';

export const Route = createFileRoute('/chats')({ errorComponent: RouteErrorBoundary, component: Page });

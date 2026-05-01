import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/call/[id]/page';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';

export const Route = createFileRoute('/call/$id')({ errorComponent: RouteErrorBoundary, component: Page });

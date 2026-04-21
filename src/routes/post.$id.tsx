import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/post/[id]/page';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';

export const Route = createFileRoute('/post/$id')({ errorComponent: RouteErrorBoundary, component: Page });

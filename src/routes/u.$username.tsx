import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/u/[username]/page';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';

export const Route = createFileRoute('/u/$username')({ errorComponent: RouteErrorBoundary, component: Page });

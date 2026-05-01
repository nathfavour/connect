import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/calls/page';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';

export const Route = createFileRoute('/calls')({ errorComponent: RouteErrorBoundary, component: Page });

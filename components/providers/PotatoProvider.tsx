"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/components/providers/ProfileProvider';
import { getEcosystemUrl } from '@/lib/constants';

export type PotatoSnippetKind = 'note' | 'goal' | 'moment' | 'call' | 'person' | 'app' | 'context';

export type PotatoSnippet = {
  id: string;
  kind: PotatoSnippetKind;
  title: string;
  description: string;
  href?: string | null;
  disabled?: boolean;
};

export type PotatoAction = PotatoSnippet & {
  accent: string;
  terms: string[];
  onSelect: () => void;
};

type PotatoSurface = {
  routeLabel: string;
  currentApp: 'connect';
  snippets: PotatoSnippet[];
  quickActions: PotatoAction[];
  searchTargets: PotatoAction[];
};

type PotatoContextType = {
  routeLabel: string;
  currentApp: 'connect';
  snippets: PotatoSnippet[];
  pushSnippet: (snippet: Omit<PotatoSnippet, 'id'>) => string;
  clearSnippets: () => void;
  buildSearchSurface: (query: string) => PotatoSurface;
};

const PotatoContext = createContext<PotatoContextType | undefined>(undefined);

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

function routeLabelFromPath(pathname: string | null) {
  if (!pathname) return 'Connect';
  if (pathname === '/') return 'Feed';
  if (pathname === '/chats') return 'Chats';
  if (pathname.startsWith('/chat/')) return 'Conversation';
  if (pathname === '/calls') return 'Calls';
  if (pathname.startsWith('/post/')) return 'Moment';
  if (pathname === '/settings') return 'Settings';
  return 'Connect';
}

function routeSnippets(pathname: string | null, user: any | null): PotatoSnippet[] {
  const name = user?.name || user?.email || 'your context';
  if (!pathname) {
    return [{
      id: 'connect-default',
      kind: 'context',
      title: 'Connect is ready',
      description: 'Search notes, goals, moments, calls, people, and apps from one place.',
    }];
  }

  if (pathname === '/') {
    return [
      {
        id: 'feed-current',
        kind: 'moment',
        title: 'Feed context',
        description: 'Turn this feed into a note, a goal, or a follow-up call.',
      },
      {
        id: 'feed-personal',
        kind: 'person',
        title: name,
        description: 'Use your current identity to draft, search, or route faster.',
      },
    ];
  }

  if (pathname === '/chats' || pathname.startsWith('/chat/')) {
    return [
      {
        id: 'chat-thread',
        kind: 'person',
        title: 'Conversation context',
        description: 'Draft a note from this thread or start a follow-up call.',
      },
      {
        id: 'chat-people',
        kind: 'person',
        title: 'People nearby',
        description: 'Find usernames, contacts, and direct chat targets.',
      },
    ];
  }

  if (pathname === '/calls') {
    return [
      {
        id: 'call-history',
        kind: 'call',
        title: 'Call history',
        description: 'Review recent calls or create a goal from the outcome.',
      },
      {
        id: 'call-followup',
        kind: 'goal',
        title: 'Follow-up goals',
        description: 'Capture what should happen after the call ends.',
      },
    ];
  }

  if (pathname.startsWith('/post/')) {
    return [
      {
        id: 'moment-source',
        kind: 'moment',
        title: 'Current moment',
        description: 'Quote, pulse, or attach this moment to a note.',
      },
      {
        id: 'moment-followup',
        kind: 'goal',
        title: 'Moment follow-up',
        description: 'Turn a reaction into a goal or a task-like intention.',
      },
    ];
  }

  if (pathname === '/settings') {
    return [
      {
        id: 'settings-identity',
        kind: 'context',
        title: 'Identity context',
        description: 'Use profile data to improve search, previews, and routing.',
      },
      {
        id: 'settings-security',
        kind: 'context',
        title: 'Security context',
        description: 'Keep sensitive state in RAM and out of persistent storage.',
      },
    ];
  }

  return [
    {
      id: 'connect-default',
      kind: 'context',
      title: 'Connect context',
      description: 'Search notes, goals, moments, calls, people, and apps from one place.',
    },
  ];
}

function matchesTerms(query: string, terms: string[]) {
  return terms.some((term) => term.includes(query) || query.includes(term));
}

function buildSurface(query: string, routeLabel: string, snippets: PotatoSnippet[]) {
  const normalized = normalizeQuery(query);

  const quickActions: PotatoAction[] = [
    {
      id: 'draft-note',
      kind: 'note',
      title: 'Draft a note',
      description: 'Capture the current context before it disappears.',
      href: `${getEcosystemUrl('note')}/notes?mode=compose`,
      accent: '#EC4899',
      terms: ['note', 'draft', 'capture', 'write'],
      onSelect: () => window.location.assign(`${getEcosystemUrl('note')}/notes?mode=compose`),
    },
    {
      id: 'create-goal',
      kind: 'goal',
      title: 'Create a goal',
      description: 'Convert the current moment into a premium follow-through.',
      href: `${getEcosystemUrl('flow')}/tasks?mode=create`,
      accent: '#A855F7',
      terms: ['goal', 'task', 'plan', 'follow up', 'follow-up'],
      onSelect: () => window.location.assign(`${getEcosystemUrl('flow')}/tasks?mode=create`),
    },
    {
      id: 'open-moment',
      kind: 'moment',
      title: 'Open moments',
      description: 'Jump into the feed and surface recent moments.',
      href: '/',
      accent: '#F59E0B',
      terms: ['moment', 'moments', 'feed', 'post'],
      onSelect: () => window.location.assign('/'),
    },
    {
      id: 'start-call',
      kind: 'call',
      title: 'Start a call',
      description: 'Move straight from thought to voice.',
      href: '/calls',
      accent: '#10B981',
      terms: ['call', 'voice', 'video', 'phone'],
      onSelect: () => window.location.assign('/calls'),
    },
    {
      id: 'find-people',
      kind: 'person',
      title: 'Find people',
      description: 'Search usernames and open a direct chat.',
      href: '/chats',
      accent: '#6366F1',
      terms: ['people', 'person', 'user', 'contact', 'chat'],
      onSelect: () => window.location.assign('/chats'),
    },
  ];

  const searchTargets: PotatoAction[] = [
    {
      id: 'search-notes',
      kind: 'note',
      title: 'Search notes',
      description: 'Find drafts, archives, and research.',
      href: `${getEcosystemUrl('note')}/notes?search=${encodeURIComponent(query)}`,
      accent: '#EC4899',
      terms: ['note', 'notes', 'writing', 'draft'],
      onSelect: () => window.location.assign(`${getEcosystemUrl('note')}/notes?search=${encodeURIComponent(query)}`),
    },
    {
      id: 'search-goals',
      kind: 'goal',
      title: 'Search goals',
      description: 'Find tasks and follow-through in Flow.',
      href: `${getEcosystemUrl('flow')}/tasks?search=${encodeURIComponent(query)}`,
      accent: '#A855F7',
      terms: ['goal', 'goals', 'task', 'tasks', 'flow'],
      onSelect: () => window.location.assign(`${getEcosystemUrl('flow')}/tasks?search=${encodeURIComponent(query)}`),
    },
    {
      id: 'search-moments',
      kind: 'moment',
      title: 'Search moments',
      description: 'Search feed posts and public replies.',
      href: `/?search=${encodeURIComponent(query)}`,
      accent: '#F59E0B',
      terms: ['moment', 'moments', 'post', 'feed'],
      onSelect: () => window.location.assign(`/?search=${encodeURIComponent(query)}`),
    },
    {
      id: 'search-calls',
      kind: 'call',
      title: 'Search calls',
      description: 'Review call history and live sessions.',
      href: `/calls?search=${encodeURIComponent(query)}`,
      accent: '#10B981',
      terms: ['call', 'calls', 'voice', 'video'],
      onSelect: () => window.location.assign(`/calls?search=${encodeURIComponent(query)}`),
    },
    {
      id: 'search-people',
      kind: 'person',
      title: 'Search people',
      description: 'Find contacts, usernames, and collaborators.',
      href: '/chats',
      accent: '#6366F1',
      terms: ['people', 'person', 'users', 'chat', 'contacts'],
      onSelect: () => window.location.assign('/chats'),
    },
    {
      id: 'search-apps',
      kind: 'app',
      title: 'Search apps',
      description: 'Jump between Kylrix apps instantly.',
      href: '/',
      accent: '#F59E0B',
      terms: ['app', 'apps', 'note', 'flow', 'vault', 'connect'],
      onSelect: () => window.location.assign('/'),
    },
  ];

  const contextualHints = snippets.map((snippet) => ({
    id: snippet.id,
    kind: snippet.kind,
    title: snippet.title,
    description: snippet.description,
    href: snippet.href || undefined,
    accent: snippet.kind === 'goal' ? '#A855F7' : snippet.kind === 'moment' ? '#F59E0B' : snippet.kind === 'call' ? '#10B981' : '#6366F1',
    terms: [snippet.title, snippet.description, routeLabel].map((value) => value.toLowerCase()),
    onSelect: () => {
      if (snippet.href) {
        window.location.assign(snippet.href);
      }
    },
  }));

  const pool = [...quickActions, ...searchTargets, ...contextualHints];
  const filtered = normalized
    ? pool.filter((item) => matchesTerms(normalized, item.terms))
    : pool;

  return {
    routeLabel,
    currentApp: 'connect',
    snippets,
    quickActions: (normalized ? filtered : quickActions).slice(0, 5),
    searchTargets: (normalized ? filtered : searchTargets).slice(0, 6),
  };
}

export function PotatoProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [snippets, setSnippets] = useState<PotatoSnippet[]>(() => routeSnippets(pathname, user));

  useEffect(() => {
    setSnippets(routeSnippets(pathname, user));
  }, [pathname, user]);

  const pushSnippet = useCallback((snippet: Omit<PotatoSnippet, 'id'>) => {
    const id = makeId(snippet.kind);
    setSnippets((current) => [...current, { ...snippet, id }]);
    return id;
  }, []);

  const clearSnippets = useCallback(() => {
    setSnippets(routeSnippets(pathname, user));
  }, [pathname, user]);

  const value = useMemo<PotatoContextType>(() => ({
    routeLabel: routeLabelFromPath(pathname),
    currentApp: 'connect',
    snippets,
    pushSnippet,
    clearSnippets,
    buildSearchSurface: (query: string) => buildSurface(query, routeLabelFromPath(pathname), snippets),
  }), [clearSnippets, pathname, pushSnippet, snippets, user, profile]);

  return <PotatoContext.Provider value={value}>{children}</PotatoContext.Provider>;
}

export function usePotato() {
  const context = useContext(PotatoContext);
  if (!context) {
    throw new Error('usePotato must be used within a PotatoProvider');
  }
  return context;
}

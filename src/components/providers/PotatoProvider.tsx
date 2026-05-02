'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth/AuthContext';

export type PotatoSnippetKind = 'chat' | 'post' | 'shared' | 'extension' | 'settings' | 'context' | 'call';

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
  app?: string;
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
  if (pathname === '/' || pathname === '/landing') return 'Landing';
  if (pathname === '/chats') return 'Chats';
  if (pathname.startsWith('/chat/')) return 'Chat';
  if (pathname === '/moments' || pathname.startsWith('/post/')) return 'Feed';
  if (pathname === '/calls' || pathname.startsWith('/call/')) return 'Calls';
  if (pathname === '/settings') return 'Settings';
  return 'Connect';
}

function routeSnippets(pathname: string | null, user: any | null): PotatoSnippet[] {
  const name = user?.name || user?.email || 'your connection';

  if (!pathname) {
    return [
      {
        id: 'connect-default',
        kind: 'context',
        title: 'Connect is ready',
        description: 'Securely communicate with your ecosystem nodes.',
      },
    ];
  }

  if (pathname === '/chats') {
    return [
      {
        id: 'chats-active',
        kind: 'chat',
        title: 'Conversations',
        description: 'Encrypted channels for private and group relay.',
      }
    ];
  }

  if (pathname === '/settings') {
    return [
      {
        id: 'settings-profile',
        kind: 'settings',
        title: 'Connect Settings',
        description: 'Manage your social graph and relay preferences.',
      },
    ];
  }

  return [
    {
      id: 'connect-default',
      kind: 'context',
      title: 'Connect context',
      description: 'Search messages, moments, and ecosystem links.',
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
      id: 'new-chat',
      kind: 'chat',
      title: 'Start a conversation',
      description: 'Open a new encrypted channel with a contact.',
      href: '/chats',
      accent: '#F59E0B',
      terms: ['chat', 'message', 'conversation', 'private'],
      onSelect: () => window.location.assign('/chats'),
    },
    {
        id: 'new-call',
        kind: 'call',
        title: 'Initiate a huddle',
        description: 'Start a live voice or video session.',
        href: '/calls',
        accent: '#6366F1',
        terms: ['call', 'huddle', 'voice', 'video'],
        onSelect: () => window.location.assign('/calls'),
    },
    {
      id: 'browse-moments',
      kind: 'post',
      title: 'Open Moments Feed',
      description: 'Stay updated with your ecosystem activity.',
      href: '/moments',
      accent: '#EC4899',
      terms: ['feed', 'moments', 'post', 'social'],
      onSelect: () => window.location.assign('/moments'),
    },
  ];

  const searchTargets: PotatoAction[] = [
    {
      id: 'search-chats',
      kind: 'chat',
      title: 'Search chats',
      description: 'Find past messages and group threads.',
      href: `/chats?search=${encodeURIComponent(query)}`,
      accent: '#F59E0B',
      terms: ['chat', 'message', 'history'],
      onSelect: () => window.location.assign(`/chats?search=${encodeURIComponent(query)}`),
    },
    {
        id: 'search-moments',
        kind: 'post',
        title: 'Search moments',
        description: 'Find shared posts and ecosystem signals.',
        href: `/moments?search=${encodeURIComponent(query)}`,
        accent: '#EC4899',
        terms: ['moment', 'post', 'feed'],
        onSelect: () => window.location.assign(`/moments?search=${encodeURIComponent(query)}`),
    },
    {
      id: 'search-settings',
      kind: 'settings',
      title: 'Search settings',
      description: 'Jump to relay or privacy controls.',
      href: `/settings?search=${encodeURIComponent(query)}`,
      accent: '#6366F1',
      terms: ['setting', 'settings', 'privacy', 'account'],
      onSelect: () => window.location.assign(`/settings?search=${encodeURIComponent(query)}`),
    },
  ];

  const pool = [...quickActions, ...searchTargets];
  const filtered = normalized ? pool.filter((item) => matchesTerms(normalized, item.terms)) : pool;

  return {
    routeLabel,
    currentApp: 'connect' as const,
    snippets,
    quickActions: (normalized ? filtered : quickActions).slice(0, 5),
    searchTargets: (normalized ? filtered : searchTargets).slice(0, 6),
  };
}

export function PotatoProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
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
  }), [clearSnippets, pathname, pushSnippet, snippets]);

  return <PotatoContext.Provider value={value}>{children}</PotatoContext.Provider>;
}

export function usePotato() {
  const context = useContext(PotatoContext);
  if (!context) {
    throw new Error('usePotato must be used within a PotatoProvider');
  }
  return context;
}

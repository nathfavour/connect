'use client';

import React, { createContext, useContext } from 'react';

export type IslandPanel = 'ecosystem' | 'profile' | 'search';

export type IslandContextType = {
  openPanel: (panel: IslandPanel) => void;
  closePanel: () => void;
  isActive: boolean;
  panel: IslandPanel | null;
};

export const IslandContext = createContext<IslandContextType | undefined>(undefined);

export function useIsland() {
  const context = useContext(IslandContext);
  if (!context) {
    throw new Error('useIsland must be used within an IslandProvider');
  }
  return context;
}

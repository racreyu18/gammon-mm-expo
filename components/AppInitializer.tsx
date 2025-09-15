import React from 'react';
import { useAutoSync } from '../hooks/useOffline';
import { useAppStateRefresh } from '../hooks/useAppStateRefresh';

interface AppInitializerProps {
  children: React.ReactNode;
}

/**
 * Component that initializes app-level hooks that require QueryClient context
 * This must be rendered inside QueryClientProvider
 */
export function AppInitializer({ children }: AppInitializerProps) {
  // Enable auto-sync when coming back online
  useAutoSync(true);
  
  // Enable app state refresh
  useAppStateRefresh();

  return <>{children}</>;
}
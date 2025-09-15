import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAutoRefresh } from './useListUpdates';

export function useAppStateRefresh() {
  const appState = useRef(AppState.currentState);
  const { refreshAllLists } = useAutoRefresh();

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // If app was in background and now comes to foreground, refresh data
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground - refreshing data');
        refreshAllLists();
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => subscription?.remove();
  }, [refreshAllLists]);
}

// Hook for periodic refresh (optional - use sparingly to avoid battery drain)
export function usePeriodicRefresh(intervalMs: number = 5 * 60 * 1000) { // 5 minutes default
  const { refreshAllLists } = useAutoRefresh();

  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if app is in foreground
      if (AppState.currentState === 'active') {
        console.log('Periodic refresh triggered');
        refreshAllLists();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [refreshAllLists, intervalMs]);
}
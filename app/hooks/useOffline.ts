import { useState, useEffect, useCallback } from 'react';
import { 
  networkStatus, 
  NetworkInfo, 
  getOfflineQueue, 
  getSyncManager,
  localStorage 
} from '@gammon/shared-core';
import { logger } from '@gammon/shared-core';

export interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
  isSyncing: boolean;
  pendingRequests: number;
  lastSyncTime?: number;
  networkInfo: NetworkInfo;
}

export interface OfflineActions {
  sync: () => Promise<void>;
  clearCache: () => Promise<void>;
  retryFailedRequests: () => Promise<void>;
  getQueuedRequestsCount: () => Promise<number>;
}

export function useOffline(): OfflineState & OfflineActions {
  const [state, setState] = useState<OfflineState>({
    isOnline: true,
    isOffline: false,
    isSyncing: false,
    pendingRequests: 0,
    networkInfo: {
      status: 'unknown',
      lastChecked: 0,
    },
  });

  // Initialize and setup network status listener
  useEffect(() => {
    // Update state from network status
    const updateNetworkState = (networkInfo: NetworkInfo) => {
      setState(prev => ({
        ...prev,
        isOnline: networkInfo.status === 'online',
        isOffline: networkInfo.status === 'offline',
        networkInfo,
      }));
    };

    // Get initial network status
    const initialStatus = networkStatus.getStatus();
    updateNetworkState(initialStatus);

    // Listen for network status changes
    const unsubscribe = networkStatus.addListener(updateNetworkState);

    // Update pending requests count
    const updatePendingRequests = async () => {
      try {
        const offlineQueue = getOfflineQueue();
        const queuedRequests = offlineQueue.getQueuedRequests();
        setState(prev => ({
          ...prev,
          pendingRequests: queuedRequests.length,
        }));
      } catch (error) {
        logger.error('Failed to get pending requests count', error);
      }
    };

    // Update pending requests count periodically
    updatePendingRequests();
    const interval = setInterval(updatePendingRequests, 10000); // Every 10 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []); // Empty dependency array since all functions are defined inside the effect

  // Sync function
  const sync = useCallback(async () => {
    // Check if already syncing and return early if so
    let shouldProceed = false;
    setState(prev => {
      if (prev.isSyncing) {
        logger.info('Sync already in progress');
        return prev;
      }
      shouldProceed = true;
      return { ...prev, isSyncing: true };
    });

    if (!shouldProceed) {
      return;
    }

    try {
      const syncManager = getSyncManager();
      await syncManager.sync();
      
      setState(prev => ({
        ...prev,
        lastSyncTime: Date.now(),
        pendingRequests: 0, // Assuming sync clears all pending requests
        isSyncing: false,
      }));
      
      logger.info('Sync completed successfully');
    } catch (error) {
      logger.error('Sync failed', error);
      setState(prev => ({ ...prev, isSyncing: false }));
      throw error;
    }
  }, []); // No dependencies needed since we use functional setState

  // Clear cache function
  const clearCache = useCallback(async () => {
    try {
      await localStorage.clear();
      logger.info('Cache cleared successfully');
    } catch (error) {
      logger.error('Failed to clear cache', error);
      throw error;
    }
  }, []);

  // Retry failed requests
  const retryFailedRequests = useCallback(async () => {
    try {
      const offlineQueue = getOfflineQueue();
      await offlineQueue.syncQueue();
      
      // Update pending requests count
      const queuedRequests = offlineQueue.getQueuedRequests();
      setState(prev => ({
        ...prev,
        pendingRequests: queuedRequests.length,
      }));
      
      logger.info('Failed requests retry completed');
    } catch (error) {
      logger.error('Failed to retry requests', error);
      throw error;
    }
  }, []);

  // Get queued requests count
  const getQueuedRequestsCount = useCallback(async () => {
    try {
      const offlineQueue = getOfflineQueue();
      const queuedRequests = offlineQueue.getQueuedRequests();
      return queuedRequests.length;
    } catch (error) {
      logger.error('Failed to get queued requests count', error);
      return 0;
    }
  }, []);

  return {
    ...state,
    sync,
    clearCache,
    retryFailedRequests,
    getQueuedRequestsCount,
  };
}

// Hook for checking if a specific operation should be allowed offline
export function useOfflineCapability(operationType: 'read' | 'write' = 'read') {
  const { isOnline, isOffline } = useOffline();
  
  const canPerformOperation = useCallback(() => {
    if (isOnline) {
      return true; // Always allow operations when online
    }
    
    if (operationType === 'read') {
      return true; // Allow read operations offline (will use cache)
    }
    
    // For write operations offline, we queue them
    return true; // We allow write operations offline by queueing them
  }, [isOnline, operationType]);
  
  const getOperationMessage = useCallback(() => {
    if (isOnline) {
      return null;
    }
    
    if (operationType === 'read') {
      return 'Showing cached data (offline)';
    }
    
    return 'Changes will be synced when connection is restored';
  }, [isOnline, operationType]);
  
  return {
    canPerform: canPerformOperation(),
    message: getOperationMessage(),
    isOnline,
    isOffline,
  };
}

// Hook for automatic sync when coming back online
export function useAutoSync(enabled = true) {
  const { isOnline, sync, isSyncing } = useOffline();
  const [hasTriggeredSync, setHasTriggeredSync] = useState(false);
  
  useEffect(() => {
    if (!enabled) return;
    
    let isMounted = true;
    
    if (isOnline && !isSyncing && !hasTriggeredSync) {
      // Trigger sync when coming back online
      const performSync = async () => {
        try {
          await sync();
          if (isMounted) {
            logger.info('Auto-sync completed');
            setHasTriggeredSync(true);
          }
        } catch (error) {
          if (isMounted) {
            logger.error('Auto-sync failed', error);
            setHasTriggeredSync(true); // Still set to avoid retry loops
          }
        }
      };
      
      performSync();
    }
    
    // Reset the flag when going offline
    if (!isOnline && isMounted) {
      setHasTriggeredSync(false);
    }
    
    return () => {
      isMounted = false;
    };
  }, [isOnline, sync, isSyncing, hasTriggeredSync, enabled]);
  
  return {
    isAutoSyncEnabled: enabled,
    hasTriggeredSync,
  };
}

// Default export for Expo Router (this file should not be treated as a route)
export default function NotARoute() {
  throw new Error('This is a hooks file, not a route component');
}
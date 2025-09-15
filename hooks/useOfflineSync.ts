import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OfflineSyncOptions {
  enableAutoSync?: boolean;
  syncInterval?: number; // in milliseconds
  retryAttempts?: number;
}

export const useOfflineSync = (options: OfflineSyncOptions = {}) => {
  const {
    enableAutoSync = true,
    syncInterval = 30000, // 30 seconds
    retryAttempts = 3
  } = options;

  const queryClient = useQueryClient();
  const appState = useRef(AppState.currentState);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);

  // Store pending operations when offline
  const storePendingOperation = async (operation: any) => {
    try {
      const existing = await AsyncStorage.getItem('pendingOperations');
      const operations = existing ? JSON.parse(existing) : [];
      operations.push({
        ...operation,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      });
      await AsyncStorage.setItem('pendingOperations', JSON.stringify(operations));
    } catch (error) {
      console.error('Failed to store pending operation:', error);
    }
  };

  // Execute pending operations when back online
  const executePendingOperations = async () => {
    try {
      const pending = await AsyncStorage.getItem('pendingOperations');
      if (!pending) return;

      const operations = JSON.parse(pending);
      const successful: string[] = [];

      for (const operation of operations) {
        try {
          // Execute the operation based on type
          switch (operation.type) {
            case 'CREATE_MOVEMENT':
              // await apiService.createMovement(operation.data);
              break;
            case 'APPROVE_REQUEST':
              // await apiService.approveRequest(operation.data.id);
              break;
            case 'REJECT_REQUEST':
              // await apiService.rejectRequest(operation.data.id);
              break;
            case 'MARK_NOTIFICATION_READ':
              // await apiService.markNotificationAsRead(operation.data.id);
              break;
          }
          successful.push(operation.id);
        } catch (error) {
          console.error(`Failed to execute pending operation ${operation.id}:`, error);
        }
      }

      // Remove successful operations
      if (successful.length > 0) {
        const remaining = operations.filter((op: any) => !successful.includes(op.id));
        await AsyncStorage.setItem('pendingOperations', JSON.stringify(remaining));
      }

      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
      
    } catch (error) {
      console.error('Failed to execute pending operations:', error);
    }
  };

  // Sync data with retry logic
  const syncData = async () => {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        await executePendingOperations();
        
        // Invalidate and refetch all queries
        await queryClient.invalidateQueries();
        
        retryCountRef.current = 0; // Reset retry count on success
      }
    } catch (error) {
      console.error('Sync failed:', error);
      
      // Retry logic
      if (retryCountRef.current < retryAttempts) {
        retryCountRef.current++;
        setTimeout(() => syncData(), 5000 * retryCountRef.current); // Exponential backoff
      }
    }
  };

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      syncData();
    }
    appState.current = nextAppState;
  };

  // Handle network state changes
  const handleNetworkChange = (state: any) => {
    if (state.isConnected && enableAutoSync) {
      syncData();
    }
  };

  useEffect(() => {
    if (!enableAutoSync) return;

    // Listen to app state changes
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Listen to network state changes
    const netInfoUnsubscribe = NetInfo.addEventListener(handleNetworkChange);

    // Set up periodic sync
    if (syncInterval > 0) {
      syncTimeoutRef.current = setInterval(async () => {
        const netInfo = await NetInfo.fetch();
        if (netInfo.isConnected) {
          syncData();
        }
      }, syncInterval);
    }

    // Initial sync
    syncData();

    return () => {
      appStateSubscription?.remove();
      netInfoUnsubscribe();
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
    };
  }, [enableAutoSync, syncInterval]);

  return {
    syncData,
    storePendingOperation,
    executePendingOperations
  };
};

// Hook for individual components to queue offline operations
export const useOfflineQueue = () => {
  const { storePendingOperation } = useOfflineSync({ enableAutoSync: false });

  const queueOperation = async (type: string, data: any) => {
    const netInfo = await NetInfo.fetch();
    
    if (!netInfo.isConnected) {
      await storePendingOperation({ type, data });
      return { queued: true };
    }
    
    return { queued: false };
  };

  return { queueOperation };
};
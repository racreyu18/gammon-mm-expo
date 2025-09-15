import { useState, useEffect } from 'react';
import { networkStatus } from '@gammon/shared-core/utils/networkStatus';
import { offlineQueue } from '@gammon/shared-core/utils/offlineQueue';

export interface OfflineCapabilities {
  isOnline: boolean;
  isOffline: boolean;
  queueSize: number;
  addToQueue: (request: {
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    data?: any;
    headers?: Record<string, string>;
    type: 'movement' | 'approval' | 'attachment' | 'notification';
    priority?: 'high' | 'medium' | 'low';
  }) => Promise<void>;
  syncQueue: () => Promise<void>;
  clearQueue: () => void;
}

export function useOfflineCapable(): OfflineCapabilities {
  const [isOnline, setIsOnline] = useState(true);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    // Initialize with current status
    const currentStatus = networkStatus.getStatus();
    setIsOnline(currentStatus.status === 'online');
    setQueueSize(offlineQueue.getQueueSize());

    // Listen for network status changes
    const unsubscribeNetwork = networkStatus.addListener((status) => {
      setIsOnline(status.status === 'online');
    });

    // Listen for queue changes
    const unsubscribeQueue = offlineQueue.onNetworkChange((online) => {
      setIsOnline(online);
      setQueueSize(offlineQueue.getQueueSize());
    });

    // Update queue size periodically
    const interval = setInterval(() => {
      setQueueSize(offlineQueue.getQueueSize());
    }, 1000);

    return () => {
      unsubscribeNetwork();
      unsubscribeQueue();
      clearInterval(interval);
    };
  }, []);

  const addToQueue = async (request: {
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    data?: any;
    headers?: Record<string, string>;
    type: 'movement' | 'approval' | 'attachment' | 'notification';
    priority?: 'high' | 'medium' | 'low';
  }) => {
    await offlineQueue.add({
      ...request,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      priority: request.priority || 'medium',
    });
    setQueueSize(offlineQueue.getQueueSize());
  };

  const syncQueue = async () => {
    if (isOnline) {
      await offlineQueue.syncQueue();
      setQueueSize(offlineQueue.getQueueSize());
    }
  };

  const clearQueue = () => {
    offlineQueue.clearQueue();
    setQueueSize(0);
  };

  return {
    isOnline,
    isOffline: !isOnline,
    queueSize,
    addToQueue,
    syncQueue,
    clearQueue,
  };
}

// Additional exports for compatibility
export const useOfflineCapability = useOfflineCapable;
export const useAutoSync = () => {
  const { syncQueue, isOnline } = useOfflineCapable();
  
  useEffect(() => {
    let isMounted = true;
    
    if (isOnline) {
      const interval = setInterval(async () => {
        if (isMounted) {
          try {
            await syncQueue();
          } catch (error) {
            console.error('Auto sync failed:', error);
          }
        }
      }, 30000); // Auto sync every 30 seconds when online
      
      return () => {
        clearInterval(interval);
        isMounted = false;
      };
    }
    
    return () => {
      isMounted = false;
    };
  }, [isOnline, syncQueue]);
  
  return { syncQueue, isOnline };
};

export default useOfflineCapable;
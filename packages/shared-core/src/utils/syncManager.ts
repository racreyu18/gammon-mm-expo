import { logger } from './logger';
import { offlineQueue, QueuedRequest } from './offlineQueue';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime?: number;
  pendingRequests: number;
  failedRequests: number;
}

export interface SyncManagerConfig {
  enablePeriodicSync: boolean;
  syncInterval: number;
  maxConcurrentRequests: number;
  retryFailedRequests: boolean;
}

export const DEFAULT_SYNC_CONFIG: SyncManagerConfig = {
  enablePeriodicSync: true,
  syncInterval: 60000, // 1 minute
  maxConcurrentRequests: 5,
  retryFailedRequests: true,
};

export class SyncManager {
  private config: SyncManagerConfig;
  private status: SyncStatus;
  private syncTimer?: NodeJS.Timeout;
  private listeners: Array<(status: SyncStatus) => void> = [];
  private activeSyncs = new Set<string>();

  constructor(config: Partial<SyncManagerConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.status = {
      isOnline: true,
      isSyncing: false,
      pendingRequests: 0,
      failedRequests: 0,
    };

    this.setupNetworkListener();
    
    if (this.config.enablePeriodicSync) {
      this.startPeriodicSync();
    }
  }

  private setupNetworkListener() {
    // Listen to offline queue network changes
    offlineQueue.onNetworkChange((isOnline) => {
      this.updateStatus({ isOnline });
      
      if (isOnline && this.status.pendingRequests > 0) {
        this.triggerSync();
      }
    });
  }

  private startPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.status.isOnline && !this.status.isSyncing) {
        this.triggerSync();
      }
    }, this.config.syncInterval);
  }

  public async triggerSync(): Promise<void> {
    if (this.status.isSyncing || !this.status.isOnline) {
      return;
    }

    this.updateStatus({ isSyncing: true });
    logger.info('Starting sync process');

    try {
      await this.syncOfflineQueue();
      await this.syncLocalData();
      
      this.updateStatus({ 
        lastSyncTime: Date.now(),
        pendingRequests: offlineQueue.getQueueSize(),
      });
      
      logger.info('Sync process completed successfully');
    } catch (error) {
      logger.error('Sync process failed', error);
    } finally {
      this.updateStatus({ isSyncing: false });
    }
  }

  private async syncOfflineQueue(): Promise<void> {
    const queuedRequests = offlineQueue.getQueuedRequests();
    if (queuedRequests.length === 0) {
      return;
    }

    logger.info(`Syncing ${queuedRequests.length} queued requests`);
    
    // Process requests in batches to avoid overwhelming the server
    const batches = this.createBatches(queuedRequests, this.config.maxConcurrentRequests);
    
    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(request => this.processQueuedRequest(request))
      );
    }
  }

  private async syncLocalData(): Promise<void> {
    // Sync any locally cached data that needs to be updated
    // This could include:
    // - Fetching latest movements, approvals, notifications
    // - Updating local cache with server data
    // - Resolving any data conflicts
    
    logger.info('Syncing local data with server');
    
    try {
      // Placeholder for actual sync logic
      // In a real implementation, this would:
      // 1. Fetch latest data from server
      // 2. Compare with local cache
      // 3. Resolve conflicts
      // 4. Update local storage
      
      await this.syncMovements();
      await this.syncApprovals();
      await this.syncNotifications();
      
    } catch (error) {
      logger.error('Failed to sync local data', error);
      throw error;
    }
  }

  private async syncMovements(): Promise<void> {
    // Sync movements data
    logger.debug('Syncing movements data');
    // Implementation would go here
  }

  private async syncApprovals(): Promise<void> {
    // Sync approvals data
    logger.debug('Syncing approvals data');
    // Implementation would go here
  }

  private async syncNotifications(): Promise<void> {
    // Sync notifications data
    logger.debug('Syncing notifications data');
    // Implementation would go here
  }

  private async processQueuedRequest(request: QueuedRequest): Promise<void> {
    const syncId = `${request.type}-${request.id}`;
    
    if (this.activeSyncs.has(syncId)) {
      return; // Already processing this request
    }

    this.activeSyncs.add(syncId);
    
    try {
      // The actual request execution would be handled by the specific service
      // For now, we'll delegate to the offline queue
      await offlineQueue.syncQueue();
      
      logger.debug(`Successfully processed queued request: ${request.method} ${request.url}`);
    } catch (error) {
      logger.error(`Failed to process queued request: ${request.method} ${request.url}`, error);
      throw error;
    } finally {
      this.activeSyncs.delete(syncId);
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  public onStatusChange(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private updateStatus(updates: Partial<SyncStatus>) {
    this.status = { ...this.status, ...updates };
    this.listeners.forEach(listener => listener(this.status));
  }

  public forceSync(): Promise<void> {
    return this.triggerSync();
  }

  public pauseSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
    logger.info('Sync paused');
  }

  public resumeSync() {
    if (this.config.enablePeriodicSync && !this.syncTimer) {
      this.startPeriodicSync();
      logger.info('Sync resumed');
    }
  }

  public destroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.listeners = [];
    this.activeSyncs.clear();
  }
}

// Global sync manager instance
export const syncManager = new SyncManager();
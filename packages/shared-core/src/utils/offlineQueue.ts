import { logger } from './logger';

export interface QueuedRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
  type: 'movement' | 'approval' | 'attachment' | 'notification';
}

export interface OfflineQueueConfig {
  maxQueueSize: number;
  maxRetries: number;
  retryDelay: number;
  syncInterval: number;
  enableAutoSync: boolean;
}

export const DEFAULT_OFFLINE_CONFIG: OfflineQueueConfig = {
  maxQueueSize: 100,
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  syncInterval: 30000, // 30 seconds
  enableAutoSync: true,
};

export class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private isOnline = true;
  private isSyncing = false;
  private syncTimer?: NodeJS.Timeout;
  private config: OfflineQueueConfig;
  private listeners: Array<(isOnline: boolean) => void> = [];

  constructor(config: Partial<OfflineQueueConfig> = {}) {
    this.config = { ...DEFAULT_OFFLINE_CONFIG, ...config };
    this.setupNetworkListener();
    
    if (this.config.enableAutoSync) {
      this.startAutoSync();
    }
  }

  private setupNetworkListener() {
    // In a real app, you'd use NetInfo or similar
    // For now, we'll assume online by default
    this.isOnline = true;
  }

  private startAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.queue.length > 0) {
        this.syncQueue();
      }
    }, this.config.syncInterval);
  }

  public setOnlineStatus(isOnline: boolean) {
    const wasOnline = this.isOnline;
    this.isOnline = isOnline;
    
    if (!wasOnline && isOnline && this.queue.length > 0) {
      // Just came back online, sync immediately
      this.syncQueue();
    }
    
    // Notify listeners
    this.listeners.forEach(listener => listener(isOnline));
  }

  public addRequest(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>) {
    if (this.isOnline) {
      // If online, don't queue - let the request go through normally
      return null;
    }

    const queuedRequest: QueuedRequest = {
      ...request,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest low priority item
      const lowPriorityIndex = this.queue.findIndex(item => item.priority === 'low');
      if (lowPriorityIndex !== -1) {
        this.queue.splice(lowPriorityIndex, 1);
        logger.warn('Offline queue full, removed oldest low priority request');
      } else {
        logger.warn('Offline queue full, cannot add new request');
        return null;
      }
    }

    // Insert based on priority
    this.insertByPriority(queuedRequest);
    logger.info(`Added request to offline queue: ${request.method} ${request.url}`);
    
    return queuedRequest.id;
  }

  private insertByPriority(request: QueuedRequest) {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const insertIndex = this.queue.findIndex(
      item => priorityOrder[item.priority] > priorityOrder[request.priority]
    );
    
    if (insertIndex === -1) {
      this.queue.push(request);
    } else {
      this.queue.splice(insertIndex, 0, request);
    }
  }

  public async syncQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.isSyncing = true;
    logger.info(`Starting offline queue sync with ${this.queue.length} requests`);

    const requestsToProcess = [...this.queue];
    const failedRequests: QueuedRequest[] = [];

    for (const request of requestsToProcess) {
      try {
        await this.executeRequest(request);
        // Remove successful request from queue
        this.removeRequest(request.id);
        logger.info(`Successfully synced request: ${request.method} ${request.url}`);
      } catch (error) {
        logger.error(`Failed to sync request: ${request.method} ${request.url}`, error);
        
        request.retryCount++;
        if (request.retryCount >= this.config.maxRetries) {
          // Max retries reached, remove from queue
          this.removeRequest(request.id);
          logger.error(`Max retries reached for request: ${request.id}`);
        } else {
          failedRequests.push(request);
        }
      }
    }

    // Update queue with failed requests
    this.queue = failedRequests;
    this.isSyncing = false;
    
    logger.info(`Offline queue sync completed. ${failedRequests.length} requests remaining`);
  }

  private async executeRequest(request: QueuedRequest): Promise<any> {
    // This would be implemented by the specific service using the queue
    // For now, we'll just simulate the request
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate 90% success rate
        if (Math.random() > 0.1) {
          resolve({ success: true });
        } else {
          reject(new Error('Simulated network error'));
        }
      }, 100);
    });
  }

  public removeRequest(id: string) {
    const index = this.queue.findIndex(request => request.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  public getQueuedRequests(): QueuedRequest[] {
    return [...this.queue];
  }

  public getQueueSize(): number {
    return this.queue.length;
  }

  public clearQueue() {
    this.queue = [];
    logger.info('Offline queue cleared');
  }

  public onNetworkChange(listener: (isOnline: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public destroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.listeners = [];
    this.queue = [];
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global offline queue instance
export const offlineQueue = new OfflineQueue();
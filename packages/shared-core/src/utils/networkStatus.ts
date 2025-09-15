import { logger } from './logger';

export interface NetworkStatusConfig {
  checkInterval: number; // Interval to check network status in ms
  timeout: number; // Timeout for network requests in ms
  retryAttempts: number;
  retryDelay: number;
}

export const DEFAULT_NETWORK_CONFIG: NetworkStatusConfig = {
  checkInterval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export interface NetworkInfo {
  status: NetworkStatus;
  lastChecked: number;
  latency?: number;
  connectionType?: string;
}

export type NetworkStatusListener = (status: NetworkInfo) => void;

export class NetworkStatusManager {
  private config: NetworkStatusConfig;
  private currentStatus: NetworkInfo;
  private listeners: Set<NetworkStatusListener> = new Set();
  private checkInterval?: NodeJS.Timeout;
  private isChecking = false;

  constructor(config: Partial<NetworkStatusConfig> = {}) {
    this.config = { ...DEFAULT_NETWORK_CONFIG, ...config };
    this.currentStatus = {
      status: 'unknown',
      lastChecked: 0,
    };
    
    this.setupEventListeners();
    this.startPeriodicCheck();
  }

  public getStatus(): NetworkInfo {
    return { ...this.currentStatus };
  }

  public isOnline(): boolean {
    return this.currentStatus.status === 'online';
  }

  public isOffline(): boolean {
    return this.currentStatus.status === 'offline';
  }

  public addListener(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    
    // Immediately notify with current status
    listener(this.getStatus());
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public removeListener(listener: NetworkStatusListener): void {
    this.listeners.delete(listener);
  }

  public async checkStatus(force = false): Promise<NetworkInfo> {
    if (this.isChecking && !force) {
      return this.currentStatus;
    }

    this.isChecking = true;
    
    try {
      const startTime = Date.now();
      const status = await this.performNetworkCheck();
      const latency = Date.now() - startTime;
      
      const newStatus: NetworkInfo = {
        status,
        lastChecked: Date.now(),
        latency,
        connectionType: this.getConnectionType(),
      };

      // Only update and notify if status changed
      if (newStatus.status !== this.currentStatus.status) {
        logger.info(`Network status changed: ${this.currentStatus.status} -> ${newStatus.status}`);
        this.currentStatus = newStatus;
        this.notifyListeners();
      } else {
        this.currentStatus = newStatus;
      }

      return this.currentStatus;
    } catch (error) {
      logger.error('Network status check failed', error);
      const errorStatus: NetworkInfo = {
        status: 'offline',
        lastChecked: Date.now(),
      };
      
      if (this.currentStatus.status !== 'offline') {
        this.currentStatus = errorStatus;
        this.notifyListeners();
      }
      
      return this.currentStatus;
    } finally {
      this.isChecking = false;
    }
  }

  public async waitForOnline(timeout = 30000): Promise<boolean> {
    if (this.isOnline()) {
      return true;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeout);

      const unsubscribe = this.addListener((status) => {
        if (status.status === 'online') {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }

  public async retryWithBackoff<T>(
    operation: () => Promise<T>,
    attempts = this.config.retryAttempts
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < attempts; i++) {
      try {
        // Check if we're online before attempting
        if (this.isOffline()) {
          await this.waitForOnline(5000); // Wait up to 5 seconds for connection
        }
        
        return await operation();
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Operation failed (attempt ${i + 1}/${attempts})`, error);
        
        if (i < attempts - 1) {
          const delay = this.config.retryDelay * Math.pow(2, i); // Exponential backoff
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError!;
  }

  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.removeEventListeners();
    this.listeners.clear();
  }

  private async performNetworkCheck(): Promise<NetworkStatus> {
    try {
      // Try multiple approaches to check connectivity
      
      // 1. Check navigator.onLine (if available)
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return 'offline';
      }

      // 2. Try to fetch a small resource with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      try {
        // Use API health endpoint for connectivity check
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
        const response = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-cache',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        return response.ok ? 'online' : 'offline';
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // If it's an abort error, we timed out
        if ((fetchError as Error).name === 'AbortError') {
          return 'offline';
        }
        
        // Other fetch errors might indicate offline status
        return 'offline';
      }
    } catch (error) {
      logger.error('Network check error', error);
      return 'offline';
    }
  }

  private getConnectionType(): string | undefined {
    try {
      // Check for connection type (mainly for web)
      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
        const connection = (navigator as any).connection;
        return connection?.effectiveType || connection?.type;
      }
      
      // For React Native, you might use @react-native-community/netinfo
      // This would require additional setup
      
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private setupEventListeners(): void {
    try {
      // Listen for online/offline events (web)
      if (typeof window !== 'undefined') {
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);
      }
      
      // For React Native, you'd use NetInfo.addEventListener
      // This would require @react-native-community/netinfo package
    } catch (error) {
      logger.warn('Could not setup network event listeners', error);
    }
  }

  private removeEventListeners(): void {
    try {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
      }
    } catch (error) {
      logger.warn('Could not remove network event listeners', error);
    }
  }

  private handleOnline = () => {
    logger.info('Browser online event detected');
    this.checkStatus(true);
  };

  private handleOffline = () => {
    logger.info('Browser offline event detected');
    this.updateStatus('offline');
  };

  private updateStatus(status: NetworkStatus): void {
    if (this.currentStatus.status !== status) {
      this.currentStatus = {
        ...this.currentStatus,
        status,
        lastChecked: Date.now(),
      };
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        logger.error('Network status listener error', error);
      }
    });
  }

  private startPeriodicCheck(): void {
    // Initial check
    this.checkStatus();
    
    // Set up periodic checks
    this.checkInterval = setInterval(() => {
      this.checkStatus();
    }, this.config.checkInterval);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global network status manager instance
export const networkStatus = new NetworkStatusManager();

// Utility functions
export const networkUtils = {
  // Execute operation only when online
  async whenOnline<T>(operation: () => Promise<T>, timeout = 30000): Promise<T> {
    const isOnline = await networkStatus.waitForOnline(timeout);
    if (!isOnline) {
      throw new Error('Network timeout: Could not establish connection');
    }
    return operation();
  },

  // Execute with automatic retry on network errors
  async withRetry<T>(
    operation: () => Promise<T>,
    attempts = 3
  ): Promise<T> {
    return networkStatus.retryWithBackoff(operation, attempts);
  },

  // Check if error is network-related
  isNetworkError(error: any): boolean {
    if (!error) return false;
    
    const networkErrorMessages = [
      'network error',
      'fetch failed',
      'connection refused',
      'timeout',
      'no internet',
      'offline',
    ];
    
    const errorMessage = (error.message || error.toString()).toLowerCase();
    return networkErrorMessages.some(msg => errorMessage.includes(msg));
  },
};
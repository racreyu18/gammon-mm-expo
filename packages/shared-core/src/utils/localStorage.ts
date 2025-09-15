import { logger } from './logger';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt?: number;
  version: string;
}

export interface LocalStorageConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxCacheSize: number; // Maximum number of entries
  enableCompression: boolean;
  keyPrefix: string;
}

export const DEFAULT_STORAGE_CONFIG: LocalStorageConfig = {
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxCacheSize: 1000,
  enableCompression: false,
  keyPrefix: 'gammon_',
};

export class LocalStorage {
  private config: LocalStorageConfig;
  private cache = new Map<string, CacheEntry>();
  private storageAvailable = false;

  constructor(config: Partial<LocalStorageConfig> = {}) {
    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
    this.checkStorageAvailability();
    this.loadFromStorage();
  }

  private checkStorageAvailability() {
    try {
      // Check if localStorage is available (web) or AsyncStorage (React Native)
      if (typeof window !== 'undefined' && window.localStorage) {
        this.storageAvailable = true;
      } else {
        // In React Native, we'd use AsyncStorage
        // For now, we'll use in-memory storage
        this.storageAvailable = false;
        logger.warn('Persistent storage not available, using in-memory cache');
      }
    } catch (error) {
      this.storageAvailable = false;
      logger.error('Storage availability check failed', error);
    }
  }

  private async loadFromStorage() {
    if (!this.storageAvailable) {
      return;
    }

    try {
      // In a real implementation, this would load from AsyncStorage or localStorage
      // For now, we'll start with an empty cache
      logger.debug('Local storage initialized');
    } catch (error) {
      logger.error('Failed to load from storage', error);
    }
  }

  public async set<T>(
    key: string, 
    data: T, 
    ttl?: number,
    version: string = '1.0'
  ): Promise<void> {
    const fullKey = this.getFullKey(key);
    const expiresAt = ttl ? Date.now() + ttl : Date.now() + this.config.defaultTTL;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt,
      version,
    };

    // Check cache size limit
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictOldestEntries();
    }

    this.cache.set(fullKey, entry);
    
    if (this.storageAvailable) {
      await this.persistToStorage(fullKey, entry);
    }

    logger.debug(`Cached data for key: ${key}`);
  }

  public async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const fullKey = this.getFullKey(key);
    let entry = this.cache.get(fullKey);

    // If not in memory cache, try to load from persistent storage
    if (!entry && this.storageAvailable) {
      entry = await this.loadFromPersistentStorage(fullKey);
      if (entry) {
        this.cache.set(fullKey, entry);
      }
    }

    if (!entry) {
      return defaultValue;
    }

    // Check if entry has expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await this.remove(key);
      return defaultValue;
    }

    logger.debug(`Retrieved cached data for key: ${key}`);
    return entry.data as T;
  }

  public async remove(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    this.cache.delete(fullKey);
    
    if (this.storageAvailable) {
      await this.removeFromPersistentStorage(fullKey);
    }

    logger.debug(`Removed cached data for key: ${key}`);
  }

  public async clear(): Promise<void> {
    this.cache.clear();
    
    if (this.storageAvailable) {
      await this.clearPersistentStorage();
    }

    logger.info('Local storage cleared');
  }

  public async has(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    
    if (this.cache.has(fullKey)) {
      return true;
    }

    if (this.storageAvailable) {
      const entry = await this.loadFromPersistentStorage(fullKey);
      return !!entry;
    }

    return false;
  }

  public async keys(): Promise<string[]> {
    const memoryKeys = Array.from(this.cache.keys());
    
    if (this.storageAvailable) {
      // In a real implementation, we'd get keys from persistent storage too
      // For now, just return memory keys
    }

    return memoryKeys.map(key => key.replace(this.config.keyPrefix, ''));
  }

  public async size(): Promise<number> {
    return this.cache.size;
  }

  public async getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        expiredCount++;
      }
      totalSize += this.estimateSize(entry);
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      estimatedSize: totalSize,
      storageAvailable: this.storageAvailable,
    };
  }

  public async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      if (this.storageAvailable) {
        await this.removeFromPersistentStorage(key);
      }
    }

    logger.info(`Cleaned up ${expiredKeys.length} expired cache entries`);
  }

  private evictOldestEntries() {
    // Remove 10% of oldest entries to make room
    const entriesToRemove = Math.floor(this.config.maxCacheSize * 0.1);
    const sortedEntries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
      const [key] = sortedEntries[i];
      this.cache.delete(key);
    }

    logger.debug(`Evicted ${entriesToRemove} oldest cache entries`);
  }

  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  private async persistToStorage(key: string, entry: CacheEntry): Promise<void> {
    try {
      // In a real implementation, this would use AsyncStorage.setItem() or localStorage.setItem()
      // For now, we'll just log the operation
      logger.debug(`Persisting to storage: ${key}`);
    } catch (error) {
      logger.error(`Failed to persist to storage: ${key}`, error);
    }
  }

  private async loadFromPersistentStorage(key: string): Promise<CacheEntry | null> {
    try {
      // In a real implementation, this would use AsyncStorage.getItem() or localStorage.getItem()
      // For now, we'll return null
      return null;
    } catch (error) {
      logger.error(`Failed to load from storage: ${key}`, error);
      return null;
    }
  }

  private async removeFromPersistentStorage(key: string): Promise<void> {
    try {
      // In a real implementation, this would use AsyncStorage.removeItem() or localStorage.removeItem()
      logger.debug(`Removing from storage: ${key}`);
    } catch (error) {
      logger.error(`Failed to remove from storage: ${key}`, error);
    }
  }

  private async clearPersistentStorage(): Promise<void> {
    try {
      // In a real implementation, this would clear all keys with our prefix
      logger.debug('Clearing persistent storage');
    } catch (error) {
      logger.error('Failed to clear persistent storage', error);
    }
  }

  private estimateSize(entry: CacheEntry): number {
    // Rough estimation of entry size in bytes
    return JSON.stringify(entry).length * 2; // Assuming UTF-16 encoding
  }
}

// Global localStorage instance
export const localStorage = new LocalStorage();

// Utility functions for common cache patterns
export const cacheUtils = {
  // Cache with automatic refresh
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await localStorage.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const fresh = await fetchFn();
    await localStorage.set(key, fresh, ttl);
    return fresh;
  },

  // Cache with background refresh
  async getWithBackgroundRefresh<T>(
    key: string,
    fetchFn: () => Promise<T>,
    maxAge: number = 5 * 60 * 1000 // 5 minutes
  ): Promise<T> {
    const cached = await localStorage.get<T>(key);
    
    if (cached !== undefined) {
      // Check if we should refresh in background
      const entry = (localStorage as any).cache.get((localStorage as any).getFullKey(key));
      if (entry && Date.now() - entry.timestamp > maxAge) {
        // Refresh in background
        fetchFn().then(fresh => localStorage.set(key, fresh)).catch(logger.error);
      }
      return cached;
    }

    const fresh = await fetchFn();
    await localStorage.set(key, fresh);
    return fresh;
  },
};
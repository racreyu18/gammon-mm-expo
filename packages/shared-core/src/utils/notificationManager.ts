import { NotificationPayload } from '../models';

export interface NotificationFilter {
  type?: string;
  referenceType?: string;
  read?: boolean;
  since?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byReferenceType: Record<string, number>;
}

export interface NotificationManagerConfig {
  maxCacheSize: number;
  autoMarkReadDelay: number; // milliseconds
  enableAutoMarkRead: boolean;
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationManagerConfig = {
  maxCacheSize: 1000,
  autoMarkReadDelay: 3000, // 3 seconds
  enableAutoMarkRead: true,
};

export class NotificationManager {
  private config: NotificationManagerConfig;
  private notifications: Map<string, NotificationPayload> = new Map();
  private readTimers: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Set<(notifications: NotificationPayload[]) => void> = new Set();
  private statsListeners: Set<(stats: NotificationStats) => void> = new Set();

  constructor(config: Partial<NotificationManagerConfig> = {}) {
    this.config = { ...DEFAULT_NOTIFICATION_CONFIG, ...config };
  }

  /**
   * Adds notifications to the cache
   */
  addNotifications(notifications: NotificationPayload[]): void {
    let hasChanges = false;

    notifications.forEach(notification => {
      if (!this.notifications.has(notification.id)) {
        this.notifications.set(notification.id, { ...notification });
        hasChanges = true;
      }
    });

    // Enforce cache size limit
    this.enforceCacheLimit();

    if (hasChanges) {
      this.notifyListeners();
      this.notifyStatsListeners();
    }
  }

  /**
   * Adds a single notification
   */
  addNotification(notification: NotificationPayload): void {
    this.addNotifications([notification]);
  }

  /**
   * Marks a notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.clearAutoMarkReadTimer(notificationId);
      this.notifyListeners();
      this.notifyStatsListeners();
    }
  }

  /**
   * Marks multiple notifications as read
   */
  markMultipleAsRead(notificationIds: string[]): void {
    let hasChanges = false;

    notificationIds.forEach(id => {
      const notification = this.notifications.get(id);
      if (notification && !notification.read) {
        notification.read = true;
        this.clearAutoMarkReadTimer(id);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.notifyListeners();
      this.notifyStatsListeners();
    }
  }

  /**
   * Marks all notifications as read
   */
  markAllAsRead(): void {
    let hasChanges = false;

    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        hasChanges = true;
      }
    });

    this.clearAllAutoMarkReadTimers();

    if (hasChanges) {
      this.notifyListeners();
      this.notifyStatsListeners();
    }
  }

  /**
   * Schedules auto-mark as read for a notification
   */
  scheduleAutoMarkRead(notificationId: string): void {
    if (!this.config.enableAutoMarkRead) return;

    const notification = this.notifications.get(notificationId);
    if (!notification || notification.read) return;

    // Clear existing timer
    this.clearAutoMarkReadTimer(notificationId);

    // Set new timer
    const timer = setTimeout(() => {
      this.markAsRead(notificationId);
      this.readTimers.delete(notificationId);
    }, this.config.autoMarkReadDelay);

    this.readTimers.set(notificationId, timer);
  }

  /**
   * Cancels auto-mark as read for a notification
   */
  cancelAutoMarkRead(notificationId: string): void {
    this.clearAutoMarkReadTimer(notificationId);
  }

  /**
   * Gets all notifications with optional filtering
   */
  getNotifications(filter?: NotificationFilter): NotificationPayload[] {
    let notifications = Array.from(this.notifications.values());

    if (filter) {
      if (filter.type) {
        notifications = notifications.filter(n => n.type === filter.type);
      }

      if (filter.referenceType) {
        notifications = notifications.filter(n => n.referenceType === filter.referenceType);
      }

      if (filter.read !== undefined) {
        notifications = notifications.filter(n => n.read === filter.read);
      }

      if (filter.since) {
        const sinceDate = new Date(filter.since);
        notifications = notifications.filter(n => new Date(n.receivedAt) >= sinceDate);
      }
    }

    // Sort by received date (newest first)
    return notifications.sort((a, b) => 
      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    );
  }

  /**
   * Gets unread notifications
   */
  getUnreadNotifications(): NotificationPayload[] {
    return this.getNotifications({ read: false });
  }

  /**
   * Gets notification statistics
   */
  getStats(): NotificationStats {
    const notifications = Array.from(this.notifications.values());
    const unread = notifications.filter(n => !n.read);
    
    const byType: Record<string, number> = {};
    const byReferenceType: Record<string, number> = {};

    notifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
      byReferenceType[n.referenceType] = (byReferenceType[n.referenceType] || 0) + 1;
    });

    return {
      total: notifications.length,
      unread: unread.length,
      byType,
      byReferenceType,
    };
  }

  /**
   * Removes a notification
   */
  removeNotification(notificationId: string): void {
    if (this.notifications.delete(notificationId)) {
      this.clearAutoMarkReadTimer(notificationId);
      this.notifyListeners();
      this.notifyStatsListeners();
    }
  }

  /**
   * Clears all notifications
   */
  clear(): void {
    this.notifications.clear();
    this.clearAllAutoMarkReadTimers();
    this.notifyListeners();
    this.notifyStatsListeners();
  }

  /**
   * Subscribes to notification changes
   */
  subscribe(listener: (notifications: NotificationPayload[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribes to notification statistics changes
   */
  subscribeToStats(listener: (stats: NotificationStats) => void): () => void {
    this.statsListeners.add(listener);
    return () => this.statsListeners.delete(listener);
  }

  /**
   * Private: Enforces cache size limit
   */
  private enforceCacheLimit(): void {
    if (this.notifications.size <= this.config.maxCacheSize) return;

    const notifications = Array.from(this.notifications.values())
      .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

    const toRemove = notifications.slice(0, this.notifications.size - this.config.maxCacheSize);
    toRemove.forEach(n => {
      this.notifications.delete(n.id);
      this.clearAutoMarkReadTimer(n.id);
    });
  }

  /**
   * Private: Clears auto-mark read timer for a notification
   */
  private clearAutoMarkReadTimer(notificationId: string): void {
    const timer = this.readTimers.get(notificationId);
    if (timer) {
      clearTimeout(timer);
      this.readTimers.delete(notificationId);
    }
  }

  /**
   * Private: Clears all auto-mark read timers
   */
  private clearAllAutoMarkReadTimers(): void {
    this.readTimers.forEach(timer => clearTimeout(timer));
    this.readTimers.clear();
  }

  /**
   * Private: Notifies all listeners of changes
   */
  private notifyListeners(): void {
    const notifications = this.getNotifications();
    this.listeners.forEach(listener => {
      try {
        listener(notifications);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  /**
   * Private: Notifies all stats listeners of changes
   */
  private notifyStatsListeners(): void {
    const stats = this.getStats();
    this.statsListeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('Error in notification stats listener:', error);
      }
    });
  }

  /**
   * Cleanup method to clear all timers
   */
  destroy(): void {
    this.clearAllAutoMarkReadTimers();
    this.listeners.clear();
    this.statsListeners.clear();
  }
}

export default NotificationManager;
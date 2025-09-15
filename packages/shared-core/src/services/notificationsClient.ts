import { NotificationPayload } from '../models';

export interface NotificationListParams {
  since?: string; // ISO date-time string
  limit?: number;
  offset?: number;
}

export interface Notification {
  id: string;
  type: string;
  referenceType: string;
  referenceId: string;
  message: string;
  receivedAt: string;
  read?: boolean;
}

export class NotificationsClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    };
  }

  /**
   * List notifications with optional filtering
   */
  async listNotifications(params?: NotificationListParams): Promise<Notification[]> {
    const searchParams = new URLSearchParams();
    
    if (params?.since) {
      searchParams.append('since', params.since);
    }
    
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }
    
    if (params?.offset) {
      searchParams.append('offset', params.offset.toString());
    }

    const url = `${this.baseUrl}/notifications${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to list notifications: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/notifications/${id}/read`, {
      method: 'POST',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to mark notification as read: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(ids: string[]): Promise<void> {
    const promises = ids.map(id => this.markAsRead(id));
    await Promise.all(promises);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const notifications = await this.listNotifications();
    return notifications.filter(n => !n.read).length;
  }

  /**
   * Update authorization token
   */
  updateAuthToken(token: string): void {
    this.headers.Authorization = `Bearer ${token}`;
  }
}

export default NotificationsClient;
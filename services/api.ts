import { Platform } from 'react-native';

// API Configuration
const API_CONFIG = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://material.gammonconstruction.com/api',
  timeout: 30000,
};

// Types
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Movement Types
export interface Movement {
  id: string;
  type: 'Issue' | 'Receipt' | 'Transfer' | 'Adjustment';
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  fromLocation?: string;
  toLocation?: string;
  requestedBy: string;
  requestedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  description?: string;
}

// Approval Types
export interface Approval {
  id: string;
  type: 'Movement' | 'Purchase' | 'Transfer';
  status: 'Pending' | 'Approved' | 'Rejected';
  title: string;
  description: string;
  requestedBy: string;
  requestedDate: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  amount?: number;
  currency?: string;
  attachments?: string[];
}

// Notification Types
export interface Notification {
  id: string;
  type: 'Info' | 'Warning' | 'Error' | 'Success';
  title: string;
  message: string;
  isRead: boolean;
  createdDate: string;
  actionUrl?: string;
  priority: 'Low' | 'Medium' | 'High';
}

// API Client Class
class ApiService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.timeout = API_CONFIG.timeout;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        data,
        success: true,
      };
    } catch (error) {
      console.error('API Request Error:', error);
      return {
        data: null as T,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Movements API
  async getMovements(params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Movement>>> {
    // Mock data for development
    const mockMovements: Movement[] = [
      {
        id: '1',
        type: 'Issue',
        status: 'Pending',
        itemCode: 'ITM001',
        itemName: 'Steel Rebar 12mm',
        quantity: 100,
        unit: 'kg',
        fromLocation: 'Warehouse A',
        toLocation: 'Site B',
        requestedBy: 'John Doe',
        requestedDate: '2024-01-15T10:30:00Z',
        priority: 'High',
        description: 'Urgent requirement for foundation work',
      },
      {
        id: '2',
        type: 'Receipt',
        status: 'Completed',
        itemCode: 'ITM002',
        itemName: 'Concrete Mix',
        quantity: 50,
        unit: 'm³',
        toLocation: 'Warehouse A',
        requestedBy: 'Jane Smith',
        requestedDate: '2024-01-14T14:20:00Z',
        approvedBy: 'Mike Johnson',
        approvedDate: '2024-01-14T15:00:00Z',
        priority: 'Medium',
        description: 'Weekly concrete delivery',
      },
    ];

    return {
      data: {
        data: mockMovements,
        total: mockMovements.length,
        page: params?.page || 1,
        limit: params?.limit || 10,
        hasMore: false,
      },
      success: true,
    };
  }

  async createMovement(movement: Partial<Movement>): Promise<ApiResponse<Movement>> {
    // Mock implementation
    const newMovement: Movement = {
      id: Date.now().toString(),
      type: movement.type || 'Issue',
      status: 'Pending',
      itemCode: movement.itemCode || '',
      itemName: movement.itemName || '',
      quantity: movement.quantity || 0,
      unit: movement.unit || '',
      fromLocation: movement.fromLocation,
      toLocation: movement.toLocation,
      requestedBy: movement.requestedBy || 'Current User',
      requestedDate: new Date().toISOString(),
      priority: movement.priority || 'Medium',
      description: movement.description,
    };

    return {
      data: newMovement,
      success: true,
      message: 'Movement created successfully',
    };
  }

  // Approvals API
  async getApprovals(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Approval>>> {
    // Mock data for development
    const mockApprovals: Approval[] = [
      {
        id: '1',
        type: 'Movement',
        status: 'Pending',
        title: 'Steel Rebar Issue Request',
        description: 'Request to issue 100kg steel rebar for foundation work',
        requestedBy: 'John Doe',
        requestedDate: '2024-01-15T10:30:00Z',
        priority: 'High',
        amount: 5000,
        currency: 'HKD',
      },
      {
        id: '2',
        type: 'Purchase',
        status: 'Pending',
        title: 'Concrete Purchase Order',
        description: 'Purchase order for 50m³ concrete mix',
        requestedBy: 'Jane Smith',
        requestedDate: '2024-01-14T14:20:00Z',
        priority: 'Medium',
        amount: 25000,
        currency: 'HKD',
      },
    ];

    return {
      data: {
        data: mockApprovals,
        total: mockApprovals.length,
        page: params?.page || 1,
        limit: params?.limit || 10,
        hasMore: false,
      },
      success: true,
    };
  }

  async approveRequest(id: string): Promise<ApiResponse<void>> {
    // Mock implementation
    return {
      data: undefined,
      success: true,
      message: 'Request approved successfully',
    };
  }

  async rejectRequest(id: string, reason?: string): Promise<ApiResponse<void>> {
    // Mock implementation
    return {
      data: undefined,
      success: true,
      message: 'Request rejected successfully',
    };
  }

  // Notifications API
  async getNotifications(params?: {
    isRead?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Notification>>> {
    // Mock data for development
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'Info',
        title: 'New Movement Request',
        message: 'John Doe has requested steel rebar for Site B',
        isRead: false,
        createdDate: '2024-01-15T10:30:00Z',
        actionUrl: '/movements/1',
        priority: 'High',
      },
      {
        id: '2',
        type: 'Success',
        title: 'Approval Completed',
        message: 'Concrete purchase order has been approved',
        isRead: true,
        createdDate: '2024-01-14T15:00:00Z',
        actionUrl: '/approvals/2',
        priority: 'Medium',
      },
      {
        id: '3',
        type: 'Warning',
        title: 'Low Stock Alert',
        message: 'Steel rebar stock is running low in Warehouse A',
        isRead: false,
        createdDate: '2024-01-14T09:15:00Z',
        priority: 'High',
      },
    ];

    return {
      data: {
        data: mockNotifications,
        total: mockNotifications.length,
        page: params?.page || 1,
        limit: params?.limit || 10,
        hasMore: false,
      },
      success: true,
    };
  }

  async markNotificationAsRead(id: string): Promise<ApiResponse<void>> {
    // Mock implementation
    return {
      data: undefined,
      success: true,
      message: 'Notification marked as read',
    };
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    // Mock implementation
    return {
      data: undefined,
      success: true,
      message: 'All notifications marked as read',
    };
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
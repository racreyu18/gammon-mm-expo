import AuthService from './authService';
import { apiConfig } from '../config/azure';

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Movement related interfaces
export interface Movement {
  id: string;
  type: 'IN' | 'OUT' | 'TRANSFER';
  itemCode: string;
  itemDescription: string;
  quantity: number;
  unit: string;
  location: string;
  reference: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface CreateMovementRequest {
  type: 'IN' | 'OUT' | 'TRANSFER';
  itemCode: string;
  quantity: number;
  location: string;
  reference: string;
  notes?: string;
}

// Inventory related interfaces
export interface InventoryItem {
  id: string;
  itemCode: string;
  description: string;
  quantity: number;
  unit: string;
  location: string;
  lastUpdated: string;
  minStock?: number;
  maxStock?: number;
}

class ApiService {
  private static instance: ApiService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = apiConfig.baseUrl;
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // Generic request method with authentication
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const accessToken = await AuthService.getAccessToken();
      
      if (!accessToken) {
        throw new ApiError({
          message: 'Authentication required',
          status: 401,
          code: 'UNAUTHORIZED'
        });
      }

      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token
          const refreshed = await AuthService.refreshToken();
          if (refreshed) {
            // Retry request with new token
            return this.request<T>(endpoint, options);
          } else {
            // Redirect to login
            await AuthService.logout();
            throw new ApiError({
              message: 'Session expired. Please login again.',
              status: 401,
              code: 'SESSION_EXPIRED'
            });
          }
        }

        const errorData = await response.json().catch(() => ({}));
        throw new ApiError({
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          code: errorData.code
        });
      }

      const data = await response.json();
      return {
        data,
        success: true
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      console.error('API request error:', error);
      throw new ApiError({
        message: error instanceof Error ? error.message : 'Network error occurred',
        status: 0,
        code: 'NETWORK_ERROR'
      });
    }
  }

  // GET request
  public async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  public async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  // PUT request
  public async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  // DELETE request
  public async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // PATCH request
  public async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  // Movement API methods
  public async getMovements(page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<Movement>>> {
    return this.get<PaginatedResponse<Movement>>(`/movements?page=${page}&limit=${limit}`);
  }

  public async getMovement(id: string): Promise<ApiResponse<Movement>> {
    return this.get<Movement>(`/movements/${id}`);
  }

  public async createMovement(movement: CreateMovementRequest): Promise<ApiResponse<Movement>> {
    return this.post<Movement>('/movements', movement);
  }

  public async updateMovement(id: string, movement: Partial<Movement>): Promise<ApiResponse<Movement>> {
    return this.put<Movement>(`/movements/${id}`, movement);
  }

  public async deleteMovement(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/movements/${id}`);
  }

  public async approveMovement(id: string): Promise<ApiResponse<Movement>> {
    return this.patch<Movement>(`/movements/${id}/approve`);
  }

  public async rejectMovement(id: string, reason?: string): Promise<ApiResponse<Movement>> {
    return this.patch<Movement>(`/movements/${id}/reject`, { reason });
  }

  // Inventory API methods
  public async getInventory(page = 1, limit = 20, search?: string): Promise<ApiResponse<PaginatedResponse<InventoryItem>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (search) {
      params.append('search', search);
    }

    return this.get<PaginatedResponse<InventoryItem>>(`/inventory?${params.toString()}`);
  }

  public async getInventoryItem(id: string): Promise<ApiResponse<InventoryItem>> {
    return this.get<InventoryItem>(`/inventory/${id}`);
  }

  public async updateInventoryItem(id: string, item: Partial<InventoryItem>): Promise<ApiResponse<InventoryItem>> {
    return this.put<InventoryItem>(`/inventory/${id}`, item);
  }

  public async searchItems(query: string): Promise<ApiResponse<InventoryItem[]>> {
    return this.get<InventoryItem[]>(`/inventory/search?q=${encodeURIComponent(query)}`);
  }

  // Barcode scanning
  public async getItemByBarcode(barcode: string): Promise<ApiResponse<InventoryItem>> {
    return this.get<InventoryItem>(`/inventory/barcode/${encodeURIComponent(barcode)}`);
  }

  // Reports and analytics
  public async getMovementReport(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return this.get<any>(`/reports/movements?start=${startDate}&end=${endDate}`);
  }

  public async getInventoryReport(): Promise<ApiResponse<any>> {
    return this.get<any>('/reports/inventory');
  }

  public async getLowStockItems(): Promise<ApiResponse<InventoryItem[]>> {
    return this.get<InventoryItem[]>('/inventory/low-stock');
  }

  // User profile
  public async getUserProfile(): Promise<ApiResponse<any>> {
    return this.get<any>('/user/profile');
  }

  public async updateUserProfile(profile: any): Promise<ApiResponse<any>> {
    return this.put<any>('/user/profile', profile);
  }

  // Health check
  public async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.get<{ status: string; timestamp: string }>('/health');
  }
}

// Custom error class for API errors
class ApiError extends Error {
  public status: number;
  public code?: string;

  constructor({ message, status, code }: { message: string; status: number; code?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export { ApiError };
export default ApiService.getInstance();
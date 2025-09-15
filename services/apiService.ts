import authService from './authService';
import { apiConfig } from '../config/api';

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

// Project related interfaces (based on Ionic patterns)
export interface Project {
  id: string;
  projectNumber: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

// Location related interfaces
export interface Location {
  id: string;
  locationCode: string;
  locationEnglish: string;
  locationChinese: string;
  projectId: string;
  isActive: boolean;
}

// Area related interfaces
export interface Area {
  id: string;
  areaCode: string;
  areaName: string;
  locationId: string;
  isActive: boolean;
}

// Bin related interfaces
export interface Bin {
  id: string;
  binCode: string;
  binName: string;
  areaId: string;
  capacity?: number;
  isActive: boolean;
}

// Item related interfaces
export interface Item {
  id: string;
  itemCode: string;
  itemName: string;
  description?: string;
  categoryId: string;
  subCategoryId?: string;
  unit: string;
  isActive: boolean;
}

export interface ItemCategory {
  id: string;
  categoryCode: string;
  categoryName: string;
  description?: string;
  isActive: boolean;
}

export interface ItemSubCategory {
  id: string;
  subCategoryCode: string;
  subCategoryName: string;
  categoryId: string;
  description?: string;
  isActive: boolean;
}

// Movement related interfaces
export interface Movement {
  id: string;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  itemCode: string;
  itemDescription: string;
  quantity: number;
  unit: string;
  fromLocationId?: string;
  toLocationId?: string;
  binId?: string;
  reference: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
}

export interface CreateMovementRequest {
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  itemCode: string;
  quantity: number;
  fromLocationId?: string;
  toLocationId?: string;
  binId?: string;
  reference: string;
  notes?: string;
}

// Approval related interfaces
export interface ApprovalHeader {
  id: string;
  approvalType: string;
  referenceNumber: string;
  description?: string;
  requestedBy: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  comments?: string;
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

export interface InventoryBalance {
  id: string;
  itemId: string;
  locationId: string;
  binId?: string;
  quantity: number;
  unit: string;
  lastUpdated: string;
}

class ApiService {
  private static instance: ApiService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = apiConfig.baseURL;
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
      const accessToken = await authService.getAccessToken();
      
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
        ...apiConfig.headers,
        ...options.headers
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token
          const refreshed = await authService.refreshToken();
          if (refreshed) {
            // Retry request with new token
            return this.request<T>(endpoint, options);
          } else {
            // Redirect to login
            await authService.logout();
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

  // Project API methods
  public async getProjects(params?: { projectNumber?: string }): Promise<ApiResponse<Project[]>> {
    const queryParams = new URLSearchParams();
    if (params?.projectNumber) {
      queryParams.append('projectNumber', params.projectNumber);
    }
    
    const endpoint = `/projects${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<Project[]>(endpoint);
  }

  public async getProject(id: string): Promise<ApiResponse<Project>> {
    return this.get<Project>(`/projects/${id}`);
  }

  // Location API methods
  public async getLocations(projectId?: string): Promise<ApiResponse<Location[]>> {
    const endpoint = projectId ? `/locations?projectId=${projectId}` : '/locations';
    return this.get<Location[]>(endpoint);
  }

  public async getLocation(id: string): Promise<ApiResponse<Location>> {
    return this.get<Location>(`/locations/${id}`);
  }

  // Area API methods
  public async getAreas(locationId?: string): Promise<ApiResponse<Area[]>> {
    const endpoint = locationId ? `/areas?locationId=${locationId}` : '/areas';
    return this.get<Area[]>(endpoint);
  }

  public async getArea(id: string): Promise<ApiResponse<Area>> {
    return this.get<Area>(`/areas/${id}`);
  }

  // Bin API methods
  public async getBins(areaId?: string): Promise<ApiResponse<Bin[]>> {
    const endpoint = areaId ? `/bins?areaId=${areaId}` : '/bins';
    return this.get<Bin[]>(endpoint);
  }

  public async getBin(id: string): Promise<ApiResponse<Bin>> {
    return this.get<Bin>(`/bins/${id}`);
  }

  // Item API methods
  public async getItems(params?: { 
    categoryId?: string; 
    subCategoryId?: string; 
    search?: string;
  }): Promise<ApiResponse<Item[]>> {
    const queryParams = new URLSearchParams();
    if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params?.subCategoryId) queryParams.append('subCategoryId', params.subCategoryId);
    if (params?.search) queryParams.append('search', params.search);
    
    const endpoint = `/items${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<Item[]>(endpoint);
  }

  public async getItem(id: string): Promise<ApiResponse<Item>> {
    return this.get<Item>(`/items/${id}`);
  }

  // Item Category API methods
  public async getItemCategories(): Promise<ApiResponse<ItemCategory[]>> {
    return this.get<ItemCategory[]>('/item-categories');
  }

  public async getItemSubCategories(categoryId?: string): Promise<ApiResponse<ItemSubCategory[]>> {
    const endpoint = categoryId ? `/item-subcategories?categoryId=${categoryId}` : '/item-subcategories';
    return this.get<ItemSubCategory[]>(endpoint);
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

  // Approval API methods
  public async getApprovals(params?: {
    approvalType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<ApprovalHeader>>> {
    const queryParams = new URLSearchParams();
    if (params?.approvalType) queryParams.append('approvalType', params.approvalType);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const endpoint = `/approvals${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<PaginatedResponse<ApprovalHeader>>(endpoint);
  }

  public async getApproval(id: string): Promise<ApiResponse<ApprovalHeader>> {
    return this.get<ApprovalHeader>(`/approvals/${id}`);
  }

  public async approveRequest(id: string, comments?: string): Promise<ApiResponse<ApprovalHeader>> {
    return this.post<ApprovalHeader>(`/approvals/${id}/approve`, { comments });
  }

  public async rejectRequest(id: string, comments: string): Promise<ApiResponse<ApprovalHeader>> {
    return this.post<ApprovalHeader>(`/approvals/${id}/reject`, { comments });
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

  // Inventory Balance API methods
  public async getInventoryBalances(params?: {
    itemId?: string;
    locationId?: string;
    binId?: string;
  }): Promise<ApiResponse<InventoryBalance[]>> {
    const queryParams = new URLSearchParams();
    if (params?.itemId) queryParams.append('itemId', params.itemId);
    if (params?.locationId) queryParams.append('locationId', params.locationId);
    if (params?.binId) queryParams.append('binId', params.binId);
    
    const endpoint = `/inventory-balances${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<InventoryBalance[]>(endpoint);
  }

  public async getInventoryBalance(id: string): Promise<ApiResponse<InventoryBalance>> {
    return this.get<InventoryBalance>(`/inventory-balances/${id}`);
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
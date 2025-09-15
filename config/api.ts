import Constants from 'expo-constants';

// API Configuration for Gammon MM Expo App
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface ApiEndpoints {
  // Authentication
  login: string;
  logout: string;
  refresh: string;
  verify: string;
  
  // Projects
  projects: string;
  projectDetails: (projectId: string) => string;
  projectLocations: (projectId: string) => string;
  
  // Inventory
  inventory: {
    items: string;
    search: string;
    issue: string;
    receive: string;
    return: string;
    writeoff: string;
    transfer: string;
    movements: string;
  };
  
  // Requests
  requests: {
    base: string;
    approve: (requestId: string) => string;
    reject: (requestId: string) => string;
    myRequests: string;
    pendingApproval: string;
  };
  
  // Locations
  locations: string;
  
  // Notifications
  notifications: {
    register: string;
    unregister: string;
    list: string;
    markRead: string;
  };
  
  // Upload/Download
  upload: string;
  download: (fileId: string) => string;
}

// Environment-specific configurations
const environments = {
  development: {
    baseUrl: 'http://localhost:7060/api',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  staging: {
    baseUrl: 'https://gammon-mm-staging.azurewebsites.net/api',
    timeout: 15000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  production: {
    baseUrl: 'https://material.gammonconstruction.com/api',
    timeout: 20000,
    retryAttempts: 2,
    retryDelay: 2000,
  },
} as const;

// Get current environment
export const getCurrentEnvironment = (): keyof typeof environments => {
  const isDev = __DEV__;
  
  // Check for environment-specific configuration from Expo config
  if (Constants.expoConfig?.extra?.environment) {
    return Constants.expoConfig.extra.environment as keyof typeof environments;
  }
  
  // Default environment logic
  return isDev ? 'development' : 'production';
};

// API Configuration
export const apiConfig: ApiConfig = environments[getCurrentEnvironment()];

// API Endpoints - matching original project structure
export const apiEndpoints: ApiEndpoints = {
  // Authentication
  login: '/auth/login',
  logout: '/auth/logout',
  refresh: '/auth/refresh',
  verify: '/auth/verify',
  
  // Projects
  projects: '/projects',
  projectDetails: (projectId: string) => `/projects/${projectId}`,
  projectLocations: (projectId: string) => `/projects/${projectId}/locations`,
  
  // Inventory
  inventory: {
    items: '/inventory/items',
    search: '/inventory/search',
    issue: '/inventory/issue',
    receive: '/inventory/receive',
    return: '/inventory/return',
    writeoff: '/inventory/writeoff',
    transfer: '/inventory/transfer',
    movements: '/inventory/movements',
  },
  
  // Requests
  requests: {
    base: '/requests',
    approve: (requestId: string) => `/requests/${requestId}/approve`,
    reject: (requestId: string) => `/requests/${requestId}/reject`,
    myRequests: '/requests/my',
    pendingApproval: '/requests/pending-approval',
  },
  
  // Locations
  locations: '/locations',
  
  // Notifications
  notifications: {
    register: '/notifications/register',
    unregister: '/notifications/unregister',
    list: '/notifications',
    markRead: '/notifications/mark-read',
  },
  
  // Upload/Download
  upload: '/files/upload',
  download: (fileId: string) => `/files/download/${fileId}`,
};

// Legacy API endpoints for backward compatibility
export const API_ENDPOINTS = {
  MOVEMENTS: '/movement-transactions',
  APPROVALS: '/approvals',
  NOTIFICATIONS: '/notifications',
  ATTACHMENTS: '/attachments',
} as const;

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error Response Type
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Request Configuration
export interface RequestConfig {
  showLoader?: boolean;
  showError?: boolean;
  retryOnError?: boolean;
  timeout?: number;
}
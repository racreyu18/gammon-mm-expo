import { ApiConfig } from '@gammon/shared-core';
import Constants from 'expo-constants';

// API configuration based on environment
const getApiConfig = (): ApiConfig => {
  const isDev = __DEV__;
  
  // Default to development API
  let baseUrl = 'http://localhost:3000/api';
  
  // Check for environment-specific configuration
  if (Constants.expoConfig?.extra?.apiUrl) {
    baseUrl = Constants.expoConfig.extra.apiUrl;
  } else if (!isDev) {
    // Production API URL
    baseUrl = 'https://api.gammon.com';
  }

  return {
    baseUrl,
    timeout: 30000,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  };
};

export const apiConfig = getApiConfig();

// Export individual service configurations
export const API_ENDPOINTS = {
  MOVEMENTS: '/movement-transactions',
  APPROVALS: '/approvals',
  NOTIFICATIONS: '/notifications',
  ATTACHMENTS: '/attachments',
} as const;
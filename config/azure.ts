import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface AzureConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
  authority: string;
  scopes: string[];
}

const getRedirectUri = (): string => {
  if (Platform.OS === 'web') {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && window.location) {
      return `${window.location.origin}/auth`;
    }
    // Fallback for server-side rendering or when window is not available
    return 'http://localhost:8081/auth';
  }
  return Constants.expoConfig?.scheme ? `${Constants.expoConfig.scheme}://auth` : 'exp://localhost:8081/--/auth';
};

export const azureConfig: AzureConfig = {
  clientId: process.env.EXPO_PUBLIC_AZURE_CLIENT_ID || '',
  tenantId: process.env.AZURE_TENANT_ID || '',
  redirectUri: getRedirectUri(),
  authority: process.env.AZURE_AUTHORITY || '',
  scopes: [
    'openid',
    'profile',
    'email',
    'User.Read',
    process.env.API_SCOPE || ''
  ].filter(Boolean)
};

export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || '',
  scope: process.env.API_SCOPE || ''
};

// Validate configuration
export const validateAzureConfig = (): boolean => {
  const required = ['clientId', 'tenantId', 'authority'];
  return required.every(key => azureConfig[key as keyof AzureConfig]);
};
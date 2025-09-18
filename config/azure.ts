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
    return 'http://localhost:8081/auth';
  }
  return 'gammonmmexpo://auth';
};

export const azureConfig: AzureConfig = {
  clientId: process.env.EXPO_PUBLIC_AZURE_CLIENT_ID || '',
  tenantId: process.env.EXPO_PUBLIC_AZURE_TENANT_ID || '',
  redirectUri: getRedirectUri(),
  authority: process.env.EXPO_PUBLIC_AZURE_AUTHORITY || 'https://login.microsoftonline.com/988687c9-cef9-453f-9b1d-0e3ffe89fe50',
  scopes: [
    'openid',
    'profile',
    'email',
    'User.Read',
    process.env.API_SCOPE || 'api://051eb053-51a2-4bd1-b469-0ac2012e6792/erp.mm.api'
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
import { AuthAdapter, AuthToken, UserInfo } from '@gammon/shared-core';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_INFO_KEY = 'user_info';

export class ExpoAuthAdapter implements AuthAdapter {
  async login(username: string, password: string): Promise<AuthToken> {
    try {
      // TODO: Implement actual authentication with your backend
      // This is a placeholder implementation
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const token: AuthToken = await response.json();
      
      // Store tokens securely
      await SecureStore.setItemAsync(TOKEN_KEY, token.accessToken);
      if (token.refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token.refreshToken);
      }

      return token;
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async loginWithBiometric(): Promise<AuthToken> {
    try {
      // Check if biometric authentication is available
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        throw new Error('Biometric authentication not available');
      }

      // Authenticate with biometrics
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your account',
        fallbackLabel: 'Use passcode',
      });

      if (!result.success) {
        throw new Error('Biometric authentication failed');
      }

      // Retrieve stored token
      const accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      
      if (!accessToken) {
        throw new Error('No stored authentication token');
      }

      return {
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresIn: 3600, // TODO: Get actual expiry
        tokenType: 'Bearer',
      };
    } catch (error) {
      throw new Error(`Biometric login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async logout(): Promise<void> {
    try {
      // Clear stored tokens
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_INFO_KEY);
      
      // TODO: Call logout endpoint if needed
    } catch (error) {
      console.warn('Error during logout:', error);
    }
  }

  async refreshToken(): Promise<AuthToken> {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // TODO: Implement token refresh with your backend
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const token: AuthToken = await response.json();
      
      // Store new tokens
      await SecureStore.setItemAsync(TOKEN_KEY, token.accessToken);
      if (token.refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token.refreshToken);
      }

      return token;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCurrentToken(): Promise<AuthToken | null> {
    try {
      const accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      
      if (!accessToken) {
        return null;
      }

      return {
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresIn: 3600, // TODO: Calculate actual expiry
        tokenType: 'Bearer',
      };
    } catch (error) {
      console.warn('Error getting current token:', error);
      return null;
    }
  }

  async getCurrentUser(): Promise<UserInfo | null> {
    try {
      const userInfoJson = await SecureStore.getItemAsync(USER_INFO_KEY);
      
      if (!userInfoJson) {
        // Try to fetch user info from API
        const token = await this.getCurrentToken();
        if (!token) {
          return null;
        }

        // TODO: Fetch user info from your backend
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
          },
        });

        if (!response.ok) {
          return null;
        }

        const userInfo: UserInfo = await response.json();
        
        // Cache user info
        await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(userInfo));
        
        return userInfo;
      }

      return JSON.parse(userInfoJson);
    } catch (error) {
      console.warn('Error getting current user:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getCurrentToken();
    return token !== null;
  }
}
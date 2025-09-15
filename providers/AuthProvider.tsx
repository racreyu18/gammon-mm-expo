import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import authService, { UserProfile, AuthTokens } from '../services/authService';
import { Alert } from 'react-native';

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasFunction: (functionName: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Check authentication status on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      await authService.initializeAuth();
      const authenticated = await authService.isAuthenticated();
      
      if (authenticated) {
        const userProfile = await authService.getCurrentUser();
        setUser(userProfile);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth status check error:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      setIsLoading(true);
      const result = await authService.login();
      
      setUser(result.user);
      setIsAuthenticated(true);
      
      Alert.alert(
        'Login Successful',
        `Welcome back, ${result.user.name}!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Login Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
      
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      
      setUser(null);
      setIsAuthenticated(false);
      
      Alert.alert(
        'Logged Out',
        'You have been successfully logged out.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if logout fails, clear local state
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAuth = async () => {
    try {
      const tokens = await authService.refreshToken();
      
      if (tokens) {
        const userProfile = await authService.getCurrentUser();
        setUser(userProfile);
        setIsAuthenticated(true);
      } else {
        // Refresh failed, user needs to login again
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth refresh error:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const hasRole = (role: string): boolean => {
    return authService.hasRole(role);
  };

  const hasFunction = (functionName: string): boolean => {
    return authService.hasFunction(functionName);
  };

  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    refreshAuth,
    hasRole,
    hasFunction
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
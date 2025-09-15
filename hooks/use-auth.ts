import { useState, useEffect, useCallback } from 'react';

// User interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

// Auth state interface
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Mock user data for development
const mockUser: User = {
  id: '1',
  email: 'user@gammon.com',
  name: 'John Doe',
  role: 'Site Manager',
  permissions: ['read:movements', 'write:movements', 'approve:requests'],
};

// Custom hook for authentication
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Initialize auth state
  useEffect(() => {
    // Simulate checking for existing authentication
    const checkAuth = async () => {
      try {
        // In a real app, this would check for stored tokens, validate them, etc.
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        
        // For development, assume user is authenticated
        setAuthState({
          user: mockUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
        });
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Simulate login API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For development, accept any credentials
      setAuthState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      
      return { success: false, error: errorMessage };
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Simulate logout API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      
      return { success: false, error: errorMessage };
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!authState.isAuthenticated) return;
    
    try {
      // Simulate API call to refresh user data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAuthState(prev => ({
        ...prev,
        user: mockUser,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, [authState.isAuthenticated]);

  // Check if user has specific permission
  const hasPermission = useCallback((permission: string) => {
    return authState.user?.permissions.includes(permission) || false;
  }, [authState.user]);

  // Check if user has specific role
  const hasRole = useCallback((role: string) => {
    return authState.user?.role === role;
  }, [authState.user]);

  return {
    // State
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
    
    // Actions
    login,
    logout,
    refreshUser,
    
    // Utilities
    hasPermission,
    hasRole,
  };
}

export default useAuth;
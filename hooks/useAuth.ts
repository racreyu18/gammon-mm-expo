import { useState, useEffect, createContext, useContext } from 'react';
import authService, { AuthState, UserProfile, UserSecurity } from '../services/authService';

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roleName: string) => Promise<boolean>;
  hasFunction: (functionName: string) => Promise<boolean>;
  refreshAuth: () => Promise<void>;
}

// Create auth context
export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    tokens: null,
    userSecurity: null,
    error: null
  });

  useEffect(() => {
    // Initialize auth state and subscribe to changes
    const initializeAuth = async () => {
      try {
        await authService.initializeAuth();
      } catch (error) {
        console.error('Error initializing auth:', error);
      }
    };

    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange((newState) => {
      setAuthState(newState);
    });

    initializeAuth();

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const login = async (): Promise<void> => {
    try {
      await authService.login();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const hasRole = async (roleName: string): Promise<boolean> => {
    return await authService.hasRole(roleName);
  };

  const hasFunction = async (functionName: string): Promise<boolean> => {
    return await authService.hasFunction(functionName);
  };

  const refreshAuth = async (): Promise<void> => {
    try {
      await authService.refreshToken();
    } catch (error) {
      console.error('Auth refresh failed:', error);
      throw error;
    }
  };

  return {
    ...authState,
    login,
    logout,
    hasRole,
    hasFunction,
    refreshAuth
  };
}

// Hook to use auth context
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
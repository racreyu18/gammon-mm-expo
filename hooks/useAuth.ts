import { useState, useEffect, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

export interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

// Create auth context
export const AuthContext = createContext<AuthContextType | null>(null);

// Mock user for development
const MOCK_USER: User = {
  id: '1',
  username: 'admin',
  email: 'admin@gammon.com',
  role: 'admin',
  permissions: ['read', 'write', 'approve', 'scan']
};

export function useAuth(): AuthContextType {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    token: null
  });

  useEffect(() => {
    // Simulate checking for existing auth token
    const checkAuth = async () => {
      try {
        // In a real app, you'd check for stored token and validate it
        const storedToken = await AsyncStorage.getItem('auth_token');
        if (storedToken) {
          setAuthState({
            user: MOCK_USER,
            isAuthenticated: true,
            isLoading: false,
            token: storedToken
          });
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock authentication - in real app, call your auth API
      if (username === 'admin' && password === 'password') {
        const token = 'mock_jwt_token_' + Date.now();
        await AsyncStorage.setItem('auth_token', token);
        
        setAuthState({
          user: MOCK_USER,
          isAuthenticated: true,
          isLoading: false,
          token
        });
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('auth_token');
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        token: null
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      // In a real app, call your refresh token endpoint
      const newToken = 'refreshed_token_' + Date.now();
      await AsyncStorage.setItem('auth_token', newToken);
      
      setAuthState(prev => ({
        ...prev,
        token: newToken
      }));
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    }
  };

  return {
    ...authState,
    login,
    logout,
    refreshToken
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
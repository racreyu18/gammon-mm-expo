import React, { useState, useCallback } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingStateConfig {
  state: LoadingState;
  message?: string;
  error?: string;
  showSpinner?: boolean;
}

export class LoadingStateManager {
  static create(initialState: LoadingState = 'idle'): LoadingStateConfig {
    return {
      state: initialState,
      showSpinner: true
    };
  }

  static setLoading(config: LoadingStateConfig, message?: string): LoadingStateConfig {
    return { ...config, state: 'loading', message, error: undefined };
  }

  static setSuccess(config: LoadingStateConfig, message?: string): LoadingStateConfig {
    return { ...config, state: 'success', message, error: undefined };
  }

  static setError(config: LoadingStateConfig, error: string): LoadingStateConfig {
    return { ...config, state: 'error', error, message: undefined };
  }

  static setIdle(config: LoadingStateConfig): LoadingStateConfig {
    return { ...config, state: 'idle', message: undefined, error: undefined };
  }

  static isLoading(state: LoadingState): boolean {
    return state === 'loading';
  }

  static isError(state: LoadingState): boolean {
    return state === 'error';
  }

  static isSuccess(state: LoadingState): boolean {
    return state === 'success';
  }

  static isIdle(state: LoadingState): boolean {
    return state === 'idle';
  }
}

export interface LoadingIndicatorProps {
  state: LoadingState;
  message?: string;
  error?: string;
  size?: 'small' | 'large';
  color?: string;
  style?: any;
  textStyle?: any;
  errorStyle?: any;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  state,
  message,
  error,
  size = 'small',
  color = '#3B82F6',
  style,
  textStyle,
  errorStyle
}) => {
  if (state === 'loading') {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size={size} color={color} />
        {message && (
          <Text style={[styles.message, textStyle]}>{message}</Text>
        )}
      </View>
    );
  }

  if (state === 'error' && error) {
    return (
      <View style={[styles.container, style]}>
        <Text style={[styles.error, errorStyle]}>{error}</Text>
      </View>
    );
  }

  return null;
};

export interface FullScreenLoadingProps {
  visible: boolean;
  message?: string;
  error?: string;
  color?: string;
  backgroundColor?: string;
}

export const FullScreenLoading: React.FC<FullScreenLoadingProps> = ({
  visible,
  message,
  error,
  color = '#3B82F6',
  backgroundColor = 'rgba(255, 255, 255, 0.9)'
}) => {
  if (!visible) return null;

  return (
    <View style={[styles.fullScreen, { backgroundColor }]}>
      {error ? (
        <Text style={[styles.fullScreenError, { color: '#dc3545' }]}>{error}</Text>
      ) : (
        <>
          <ActivityIndicator size="large" color={color} />
          {message && (
            <Text style={[styles.fullScreenText, { color }]}>{message}</Text>
          )}
        </>
      )}
    </View>
  );
};

export interface ButtonLoadingProps {
  isLoading: boolean;
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  style?: any;
  textStyle?: any;
  loadingColor?: string;
  loadingText?: string;
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  isLoading,
  onPress,
  children,
  disabled = false,
  style,
  textStyle,
  loadingColor = '#ffffff',
  loadingText
}) => {
  return (
    <TouchableOpacity
      style={[styles.buttonLoading, style]}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          <ActivityIndicator size="small" color={loadingColor} />
          {loadingText && (
            <Text style={[styles.buttonLoadingText, textStyle, { color: loadingColor }]}>
              {loadingText}
            </Text>
          )}
        </>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

export interface AsyncOperationOptions {
  errorMessage?: string;
  successMessage?: string;
  showAlert?: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export interface AsyncOperationResult {
  executeAsync: <T>(
    operation: () => Promise<T>,
    options?: AsyncOperationOptions
  ) => Promise<T | undefined>;
  executeSubmit: <T>(
    operation: () => Promise<T>,
    options?: AsyncOperationOptions
  ) => Promise<T | undefined>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useAsyncOperation = (): AsyncOperationResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    options: AsyncOperationOptions = {}
  ): Promise<T | undefined> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await operation();
      
      if (options.successMessage && options.showAlert !== false) {
        Alert.alert('Success', options.successMessage);
      }
      
      if (options.onSuccess) {
        options.onSuccess();
      }
      
      return result;
    } catch (err: any) {
      const errorMessage = options.errorMessage || err.message || 'An error occurred';
      setError(errorMessage);
      
      if (options.showAlert !== false) {
        Alert.alert('Error', errorMessage);
      }
      
      if (options.onError) {
        options.onError(err);
      }
      
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const executeSubmit = useCallback(async <T>(
    operation: () => Promise<T>,
    options: AsyncOperationOptions = {}
  ): Promise<T | undefined> => {
    return executeAsync(operation, {
      showAlert: false,
      ...options
    });
  }, [executeAsync]);

  return {
    executeAsync,
    executeSubmit,
    isLoading,
    error,
    clearError
  };
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  message: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  error: {
    fontSize: 14,
    color: '#dc3545',
    textAlign: 'center',
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  fullScreenText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  fullScreenError: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLoadingText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
});
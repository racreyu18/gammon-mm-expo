import { useCallback } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

interface ErrorHandlingOptions {
  showUserFeedback?: boolean;
  logErrors?: boolean;
  retryCallback?: () => void;
}

export const useErrorHandling = (options: ErrorHandlingOptions = {}) => {
  const {
    showUserFeedback = true,
    logErrors = true,
    retryCallback
  } = options;

  const handleError = useCallback(async (
    error: any,
    context: string,
    customMessage?: string
  ) => {
    // Log error for debugging
    if (logErrors) {
      console.error(`[${context}] Error:`, error);
    }

    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    const isOffline = !netInfo.isConnected;

    // Determine error message
    let userMessage = customMessage;
    
    if (!userMessage) {
      if (isOffline) {
        userMessage = 'You appear to be offline. Please check your internet connection and try again.';
      } else if (error?.response?.status === 401) {
        userMessage = 'Your session has expired. Please log in again.';
      } else if (error?.response?.status === 403) {
        userMessage = 'You do not have permission to perform this action.';
      } else if (error?.response?.status === 404) {
        userMessage = 'The requested resource was not found.';
      } else if (error?.response?.status >= 500) {
        userMessage = 'Server error. Please try again later.';
      } else if (error?.code === 'NETWORK_ERROR') {
        userMessage = 'Network error. Please check your connection.';
      } else if (error?.code === 'TIMEOUT') {
        userMessage = 'Request timed out. Please try again.';
      } else {
        userMessage = 'An unexpected error occurred. Please try again.';
      }
    }

    // Show user feedback
    if (showUserFeedback) {
      const buttons = [
        { text: 'OK', style: 'default' as const }
      ];

      if (retryCallback) {
        buttons.unshift({
          text: 'Retry',
          style: 'default' as const,
          onPress: retryCallback
        });
      }

      Alert.alert(
        'Error',
        userMessage,
        buttons
      );
    }

    return {
      isOffline,
      statusCode: error?.response?.status,
      message: userMessage,
      originalError: error
    };
  }, [showUserFeedback, logErrors, retryCallback]);

  const handleNetworkError = useCallback((error: any, context: string) => {
    return handleError(error, context, 'Network connection failed. Please check your internet connection.');
  }, [handleError]);

  const handleAuthError = useCallback((error: any, context: string) => {
    return handleError(error, context, 'Authentication failed. Please log in again.');
  }, [handleError]);

  const handleValidationError = useCallback((error: any, context: string) => {
    const validationMessage = error?.response?.data?.message || 'Please check your input and try again.';
    return handleError(error, context, validationMessage);
  }, [handleError]);

  const handleServerError = useCallback((error: any, context: string) => {
    return handleError(error, context, 'Server is temporarily unavailable. Please try again later.');
  }, [handleError]);

  return {
    handleError,
    handleNetworkError,
    handleAuthError,
    handleValidationError,
    handleServerError
  };
};

// Hook for specific list operation errors
export const useListErrorHandling = () => {
  const { handleError } = useErrorHandling();

  const handleListFetchError = useCallback((error: any) => {
    return handleError(error, 'List Fetch', 'Failed to load data. Pull to refresh or try again.');
  }, [handleError]);

  const handleListUpdateError = useCallback((error: any, operation: string) => {
    return handleError(error, `List Update - ${operation}`, `Failed to ${operation.toLowerCase()}. Please try again.`);
  }, [handleError]);

  const handleListCreateError = useCallback((error: any) => {
    return handleError(error, 'List Create', 'Failed to create item. Please check your input and try again.');
  }, [handleError]);

  const handleListDeleteError = useCallback((error: any) => {
    return handleError(error, 'List Delete', 'Failed to delete item. Please try again.');
  }, [handleError]);

  return {
    handleListFetchError,
    handleListUpdateError,
    handleListCreateError,
    handleListDeleteError
  };
};
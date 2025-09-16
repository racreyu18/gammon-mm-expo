import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { LoadingIndicator } from '../utils/loadingState';
import LoginScreen from './LoginScreen';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const colorScheme = useColorScheme();

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <LoadingIndicator 
          state="loading"
          message="Checking authentication..."
          size="large"
          color={Colors[colorScheme ?? 'light'].tint}
          style={styles.loadingContainer}
          textStyle={styles.loadingText}
        />
      </ThemedView>
    );
  }

  if (!isAuthenticated) {
    return fallback || <LoginScreen />;
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
});

export default AuthGuard;
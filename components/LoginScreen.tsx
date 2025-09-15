import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { IconSymbol } from './ui/icon-symbol';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    
    try {
      setIsLoggingIn(true);
      await login();
    } catch (error) {
      console.error('Login failed:', error);
      // Error handling is done in the AuthProvider
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGuestMode = () => {
    Alert.alert(
      'Guest Mode',
      'Guest mode is not available. Please sign in with your Microsoft account to continue.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Header */}
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
            <IconSymbol name="cube.box" size={48} color="white" />
          </View>
          <ThemedText style={styles.title}>Gammon MM</ThemedText>
          <ThemedText style={styles.subtitle}>Material Management System</ThemedText>
        </View>

        {/* Login Section */}
        <View style={styles.loginSection}>
          <ThemedText style={styles.welcomeText}>
            {t('login.welcome', 'Welcome back!')}
          </ThemedText>
          <ThemedText style={styles.instructionText}>
            {t('login.instruction', 'Sign in with your Microsoft account to access the material management system.')}
          </ThemedText>

          {/* Microsoft Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, { opacity: isLoggingIn ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={isLoggingIn}
          >
            <View style={styles.microsoftLogo}>
              <IconSymbol name="microsoft.logo" size={24} color="white" />
            </View>
            <ThemedText style={styles.loginButtonText}>
              {isLoggingIn 
                ? t('login.signingIn', 'Signing in...') 
                : t('login.signInMicrosoft', 'Sign in with Microsoft')
              }
            </ThemedText>
          </TouchableOpacity>

          {/* Guest Mode Button */}
          <TouchableOpacity
            style={[styles.guestButton, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}
            onPress={handleGuestMode}
          >
            <ThemedText style={[styles.guestButtonText, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
              {t('login.guestMode', 'Continue as Guest')}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <ThemedText style={styles.featuresTitle}>
            {t('login.features', 'Features')}
          </ThemedText>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <IconSymbol name="barcode.viewfinder" size={20} color={Colors[colorScheme ?? 'light'].tint} />
              <ThemedText style={styles.featureText}>
                {t('login.feature.scanning', 'Barcode Scanning')}
              </ThemedText>
            </View>
            
            <View style={styles.featureItem}>
              <IconSymbol name="doc.text" size={20} color={Colors[colorScheme ?? 'light'].tint} />
              <ThemedText style={styles.featureText}>
                {t('login.feature.movements', 'Movement Tracking')}
              </ThemedText>
            </View>
            
            <View style={styles.featureItem}>
              <IconSymbol name="chart.bar" size={20} color={Colors[colorScheme ?? 'light'].tint} />
              <ThemedText style={styles.featureText}>
                {t('login.feature.inventory', 'Inventory Management')}
              </ThemedText>
            </View>
            
            <View style={styles.featureItem}>
              <IconSymbol name="checkmark.seal" size={20} color={Colors[colorScheme ?? 'light'].tint} />
              <ThemedText style={styles.featureText}>
                {t('login.feature.approvals', 'Approval Workflow')}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>
          {t('login.footer', 'Powered by Gammon Construction Limited')}
        </ThemedText>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  loginSection: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: width - 48,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 32,
    lineHeight: 24,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0078d4',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  microsoftLogo: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  guestButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  featuresSection: {
    marginTop: 40,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    opacity: 0.5,
    textAlign: 'center',
  },
});

export default LoginScreen;
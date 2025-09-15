// Configure Reanimated logger FIRST to prevent undefined level errors
import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
  try {
    const { configureReanimatedLogger, ReanimatedLogLevel } = require('react-native-reanimated');
    configureReanimatedLogger({
      level: ReanimatedLogLevel.warn,
      strict: false, // Disable strict mode to reduce warnings
    });
  } catch (error) {
    console.warn('Failed to configure Reanimated logger:', error);
  }
}

import 'react-native-gesture-handler';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useColorScheme } from '../hooks/use-color-scheme';
import { AppProviders } from '@/providers/app-providers';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { useAutoSync } from '../hooks/useOffline';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    // SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'), // Font file not available
  });
  
  // Enable auto-sync when coming back online
  useAutoSync(true);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppProviders>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="scan" options={{ headerShown: false }} />
          <Stack.Screen name="inventory" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="movements" options={{ headerShown: false }} />
          <Stack.Screen name="approvals" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen 
            name="settings/offline" 
            options={{ 
              title: 'Offline Settings',
              headerShown: true 
            }} 
          />
        </Stack>
        <OfflineIndicator />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AppProviders>
  );
}

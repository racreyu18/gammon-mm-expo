import { Tabs, Redirect } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAuth } from '@/providers/AuthProvider';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="movements"
        options={{
          title: t('navigation.movements'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="shippingbox.fill" color={color} />,
          href: '/movements',
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: t('navigation.approvals'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="checkmark.circle.fill" color={color} />,
          href: '/approvals',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('navigation.notifications'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bell.fill" color={color} />,
          href: '/notifications',
        }}
      />
      <Tabs.Screen
        name="scanning"
        options={{
          title: t('navigation.scanning'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="qrcode.viewfinder" color={color} />,
          href: '/scanning',
        }}
      />
    </Tabs>
  );
}

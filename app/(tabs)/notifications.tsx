import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

export default function NotificationsScreen() {
  const { t } = useTranslation();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#FFEAA7', dark: '#2D3436' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="bell.fill"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          {t('navigation.notifications')}
        </ThemedText>
      </ThemedView>
      <ThemedText>
        System notifications and alerts will be displayed here.
      </ThemedText>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
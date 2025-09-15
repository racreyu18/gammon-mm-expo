import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet, ScrollView, View, Platform } from 'react-native';

// Conditionally import Reanimated for non-web platforms
let Animated: any;
let useAnimatedRef: any;
let useAnimatedStyle: any;
let useScrollOffset: any;
let interpolate: any;

if (Platform.OS !== 'web') {
  try {
    const reanimated = require('react-native-reanimated');
    Animated = reanimated.default;
    useAnimatedRef = reanimated.useAnimatedRef;
    useAnimatedStyle = reanimated.useAnimatedStyle;
    useScrollOffset = reanimated.useScrollOffset;
    interpolate = reanimated.interpolate;
  } catch (error) {
    console.warn('Failed to load react-native-reanimated:', error);
  }
}

import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const backgroundColor = useThemeColor({}, 'background');
  const colorScheme = useColorScheme() ?? 'light';
  
  // Use conditional components and hooks based on platform
  if (Platform.OS === 'web' || !Animated) {
    // Web fallback without animations
    return (
      <ScrollView style={{ backgroundColor, flex: 1 }}>
        <View
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor[colorScheme] },
          ]}>
          {headerImage}
        </View>
        <ThemedView style={styles.content}>{children}</ThemedView>
      </ScrollView>
    );
  }
  
  // Native implementation with Reanimated
  const scrollRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(scrollRef);
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
          ),
        },
        {
          scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [2, 1, 1]),
        },
      ],
    };
  });

  return (
    <Animated.ScrollView
      ref={scrollRef}
      style={{ backgroundColor, flex: 1 }}
      scrollEventThrottle={16}>
      <Animated.View
        style={[
          styles.header,
          { backgroundColor: headerBackgroundColor[colorScheme] },
          headerAnimatedStyle,
        ]}>
        {headerImage}
      </Animated.View>
      <ThemedView style={styles.content}>{children}</ThemedView>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
  },
});

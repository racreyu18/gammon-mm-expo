import { Platform, Text } from 'react-native';

// Conditionally import Animated for non-web platforms
let Animated: any;
if (Platform.OS !== 'web') {
  try {
    Animated = require('react-native-reanimated').default;
  } catch (error) {
    console.warn('Failed to load react-native-reanimated:', error);
  }
}

export function HelloWave() {
  const AnimatedComponent = Platform.OS === 'web' || !Animated ? Text : Animated.Text;
  
  return (
    <AnimatedComponent
      style={{
        fontSize: 28,
        lineHeight: 32,
        marginTop: -6,
        ...(Platform.OS === 'web' ? {
          // Web-compatible CSS animation
          animation: 'wave 1.2s ease-in-out 0s 4 normal forwards',
        } : {
          // Native Reanimated animation properties
          animationName: {
            '50%': { transform: [{ rotate: '25deg' }] },
          },
          animationIterationCount: 4,
          animationDuration: '300ms',
        })
      }}>
      👋
    </AnimatedComponent>
  );
}

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Basic loading spinner
export const LoadingSpinner: React.FC<{
  size?: 'small' | 'large';
  color?: string;
  text?: string;
}> = ({ size = 'large', color, text }) => {
  const colorScheme = useColorScheme();
  const spinnerColor = color || Colors[colorScheme ?? 'light'].tint;

  return (
    <View style={styles.spinnerContainer}>
      <ActivityIndicator 
        size={size} 
        color={spinnerColor}
        accessibilityLabel="Loading"
        accessibilityHint="Content is being loaded"
      />
      {text && (
        <Text style={[styles.loadingText, { color: Colors[colorScheme ?? 'light'].text }]}>
          {text}
        </Text>
      )}
    </View>
  );
};

// Skeleton loading animation
const SkeletonPulse: React.FC<{ style?: any; children?: React.ReactNode }> = ({ 
  style, 
  children 
}) => {
  const colorScheme = useColorScheme();
  const pulseAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          backgroundColor: Colors[colorScheme ?? 'light'].tabIconDefault,
          opacity,
        },
        style,
      ]}
      accessibilityLabel="Loading content"
    >
      {children}
    </Animated.View>
  );
};

// Skeleton components for different content types
export const SkeletonText: React.FC<{
  width?: string | number;
  height?: number;
  lines?: number;
}> = ({ width = '100%', height = 16, lines = 1 }) => (
  <View>
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonPulse
        key={index}
        style={[
          styles.skeletonText,
          {
            width: index === lines - 1 && lines > 1 ? '70%' : width,
            height,
            marginBottom: index < lines - 1 ? 8 : 0,
          },
        ]}
      />
    ))}
  </View>
);

export const SkeletonCard: React.FC = () => {
  const colorScheme = useColorScheme();
  
  return (
    <View style={[styles.skeletonCard, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <View style={styles.skeletonCardHeader}>
        <SkeletonPulse style={styles.skeletonAvatar} />
        <View style={styles.skeletonCardContent}>
          <SkeletonText width="60%" height={18} />
          <SkeletonText width="40%" height={14} />
        </View>
      </View>
      <SkeletonText lines={3} height={14} />
      <View style={styles.skeletonCardFooter}>
        <SkeletonPulse style={styles.skeletonButton} />
        <SkeletonPulse style={styles.skeletonButton} />
      </View>
    </View>
  );
};

export const SkeletonList: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <View style={styles.skeletonList}>
    {Array.from({ length: items }).map((_, index) => (
      <SkeletonListItem key={index} />
    ))}
  </View>
);

export const SkeletonListItem: React.FC = () => {
  const colorScheme = useColorScheme();
  
  return (
    <View style={[styles.skeletonListItem, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <SkeletonPulse style={styles.skeletonListIcon} />
      <View style={styles.skeletonListContent}>
        <SkeletonText width="80%" height={16} />
        <SkeletonText width="60%" height={12} />
      </View>
      <SkeletonPulse style={styles.skeletonListAction} />
    </View>
  );
};

// Inventory-specific skeleton screens
export const InventoryItemSkeleton: React.FC = () => {
  const colorScheme = useColorScheme();
  
  return (
    <View style={[styles.inventoryItemSkeleton, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <View style={styles.inventoryItemHeader}>
        <SkeletonText width="70%" height={20} />
        <SkeletonPulse style={styles.skeletonBadge} />
      </View>
      <SkeletonText width="50%" height={14} />
      <SkeletonText width="40%" height={14} />
      <View style={styles.inventoryItemFooter}>
        <SkeletonText width="30%" height={16} />
        <SkeletonText width="25%" height={16} />
      </View>
    </View>
  );
};

export const MovementItemSkeleton: React.FC = () => {
  const colorScheme = useColorScheme();
  
  return (
    <View style={[styles.movementItemSkeleton, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <View style={styles.movementItemHeader}>
        <SkeletonPulse style={styles.skeletonStatusIcon} />
        <View style={styles.movementItemContent}>
          <SkeletonText width="60%" height={16} />
          <SkeletonText width="40%" height={12} />
        </View>
        <SkeletonText width="20%" height={14} />
      </View>
      <SkeletonText width="80%" height={12} />
    </View>
  );
};

// Full page loading states
export const PageLoadingState: React.FC<{ message?: string }> = ({ 
  message = "Loading..." 
}) => (
  <View style={styles.pageLoading}>
    <LoadingSpinner text={message} />
  </View>
);

export const EmptyState: React.FC<{
  title: string;
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, message, icon, action }) => {
  const colorScheme = useColorScheme();
  
  return (
    <View style={styles.emptyState}>
      {icon && <View style={styles.emptyStateIcon}>{icon}</View>}
      <Text style={[styles.emptyStateTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
        {title}
      </Text>
      <Text style={[styles.emptyStateMessage, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
        {message}
      </Text>
      {action && <View style={styles.emptyStateAction}>{action}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  skeletonText: {
    borderRadius: 4,
  },
  skeletonCard: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skeletonCardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  skeletonCardContent: {
    flex: 1,
    gap: 6,
  },
  skeletonCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  skeletonButton: {
    width: 80,
    height: 32,
    borderRadius: 6,
  },
  skeletonList: {
    gap: 1,
  },
  skeletonListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  skeletonListIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 12,
  },
  skeletonListContent: {
    flex: 1,
    gap: 6,
  },
  skeletonListAction: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  inventoryItemSkeleton: {
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  inventoryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skeletonBadge: {
    width: 60,
    height: 20,
    borderRadius: 10,
  },
  inventoryItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  movementItemSkeleton: {
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  movementItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  skeletonStatusIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  movementItemContent: {
    flex: 1,
    gap: 4,
  },
  pageLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyStateAction: {
    marginTop: 16,
  },
});

export default {
  LoadingSpinner,
  SkeletonText,
  SkeletonCard,
  SkeletonList,
  SkeletonListItem,
  InventoryItemSkeleton,
  MovementItemSkeleton,
  PageLoadingState,
  EmptyState,
};
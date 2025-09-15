import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../hooks/useOffline';

export interface OfflineIndicatorProps {
  showWhenOnline?: boolean;
  position?: 'top' | 'bottom';
  style?: any;
}

export function OfflineIndicator({ 
  showWhenOnline = false, 
  position = 'top',
  style 
}: OfflineIndicatorProps) {
  const { isOnline, isOffline, isSyncing, pendingRequests, sync } = useOffline();

  // Don't show when online unless explicitly requested
  if (isOnline && !showWhenOnline && !isSyncing && pendingRequests === 0) {
    return null;
  }

  const handlePress = () => {
    if (isOnline && pendingRequests > 0) {
      sync();
    }
  };

  const getStatusInfo = () => {
    if (isSyncing) {
      return {
        text: 'Syncing...',
        icon: 'sync' as const,
        color: '#007AFF',
        backgroundColor: '#E3F2FD',
      };
    }
    
    if (isOffline) {
      return {
        text: pendingRequests > 0 
          ? `Offline - ${pendingRequests} pending changes`
          : 'Offline',
        icon: 'cloud-offline' as const,
        color: '#FF6B6B',
        backgroundColor: '#FFEBEE',
      };
    }
    
    if (pendingRequests > 0) {
      return {
        text: `${pendingRequests} changes to sync`,
        icon: 'cloud-upload' as const,
        color: '#FF9500',
        backgroundColor: '#FFF3E0',
      };
    }
    
    return {
      text: 'Online',
      icon: 'cloud-done' as const,
      color: '#4CAF50',
      backgroundColor: '#E8F5E8',
    };
  };

  const statusInfo = getStatusInfo();
  const containerStyle = [
    styles.container,
    position === 'bottom' ? styles.bottom : styles.top,
    { backgroundColor: statusInfo.backgroundColor },
    style,
  ];

  return (
    <TouchableOpacity 
      style={containerStyle} 
      onPress={handlePress}
      disabled={!isOnline || pendingRequests === 0 || isSyncing}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Ionicons 
          name={statusInfo.icon} 
          size={16} 
          color={statusInfo.color} 
          style={styles.icon}
        />
        <Text style={[styles.text, { color: statusInfo.color }]}>
          {statusInfo.text}
        </Text>
        {isOnline && pendingRequests > 0 && !isSyncing && (
          <Ionicons 
            name="chevron-forward" 
            size={14} 
            color={statusInfo.color} 
            style={styles.chevron}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    boxShadow: '0 2px 3.84px rgba(0, 0, 0, 0.1)',
    elevation: 5,
    zIndex: 1000,
  },
  top: {
    top: 60, // Below status bar
  },
  bottom: {
    bottom: 100, // Above tab bar
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  chevron: {
    marginLeft: 4,
  },
});

// Compact version for use in headers or toolbars
export function CompactOfflineIndicator({ style }: { style?: any }) {
  const { isOnline, isOffline, isSyncing, pendingRequests } = useOffline();

  if (isOnline && !isSyncing && pendingRequests === 0) {
    return null;
  }

  const getStatusInfo = () => {
    if (isSyncing) {
      return {
        icon: 'sync' as const,
        color: '#007AFF',
      };
    }
    
    if (isOffline) {
      return {
        icon: 'cloud-offline' as const,
        color: '#FF6B6B',
      };
    }
    
    return {
      icon: 'cloud-upload' as const,
      color: '#FF9500',
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={[styles.compactContainer, style]}>
      <Ionicons 
        name={statusInfo.icon} 
        size={20} 
        color={statusInfo.color}
      />
      {pendingRequests > 0 && (
        <View style={[styles.badge, { backgroundColor: statusInfo.color }]}>
          <Text style={styles.badgeText}>
            {pendingRequests > 99 ? '99+' : pendingRequests.toString()}
          </Text>
        </View>
      )}
    </View>
  );
}

const compactStyles = StyleSheet.create({
  compactContainer: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

// Merge styles
Object.assign(styles, compactStyles);

// Default export for Expo Router
export default OfflineIndicator;
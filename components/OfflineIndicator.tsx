import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useOfflineCapable } from '../hooks/useOffline';
import { IconSymbol } from './ui/icon-symbol';

export function OfflineIndicator() {
  const { isOffline, queueSize } = useOfflineCapable();

  if (!isOffline && queueSize === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <IconSymbol name="wifi.slash" size={16} color="#F59E0B" />
      <Text style={styles.text}>
        {isOffline ? 'Offline' : 'Syncing'}
        {queueSize > 0 && ` (${queueSize} pending)`}
      </Text>
    </View>
  );
}

export function CompactOfflineIndicator() {
  const { isOffline, queueSize } = useOfflineCapable();

  if (!isOffline && queueSize === 0) {
    return null;
  }

  return (
    <View style={styles.compactContainer}>
      <IconSymbol name="wifi.slash" size={14} color="#F59E0B" />
      {queueSize > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{queueSize}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  text: {
    marginLeft: 8,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
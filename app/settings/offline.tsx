import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../hooks/useOffline';
import { logger } from '@gammon/shared-core';

export default function OfflineSettingsScreen() {
  const {
    isOnline,
    isOffline,
    isSyncing,
    pendingRequests,
    lastSyncTime,
    sync,
    clearCache,
    retryFailedRequests,
    getQueuedRequestsCount,
  } = useOffline();

  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  React.useEffect(() => {
    // Update queued requests count
    getQueuedRequestsCount().then(setQueuedCount);
  }, [getQueuedRequestsCount, pendingRequests]);

  const handleSync = async () => {
    try {
      await sync();
      Alert.alert('Success', 'Sync completed successfully');
    } catch (error) {
      Alert.alert('Error', 'Sync failed. Please try again.');
      logger.error('Manual sync failed', error);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached data. You may need to reload data when back online. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              await clearCache();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
              logger.error('Cache clear failed', error);
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleRetryFailed = async () => {
    try {
      await retryFailedRequests();
      Alert.alert('Success', 'Failed requests retried successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to retry requests');
      logger.error('Retry failed requests failed', error);
    }
  };

  const formatLastSyncTime = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getConnectionStatusColor = () => {
    if (isSyncing) return '#007AFF';
    if (isOffline) return '#FF6B6B';
    return '#4CAF50';
  };

  const getConnectionStatusText = () => {
    if (isSyncing) return 'Syncing...';
    if (isOffline) return 'Offline';
    return 'Online';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Connection Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Status</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons
              name={isOffline ? 'cloud-offline' : 'cloud-done'}
              size={24}
              color={getConnectionStatusColor()}
            />
            <View style={styles.statusInfo}>
              <Text style={[styles.statusText, { color: getConnectionStatusColor() }]}>
                {getConnectionStatusText()}
              </Text>
              <Text style={styles.statusSubtext}>
                Last sync: {formatLastSyncTime(lastSyncTime)}
              </Text>
            </View>
            {isSyncing && <ActivityIndicator size="small" color="#007AFF" />}
          </View>
        </View>
      </View>

      {/* Pending Changes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Changes</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Queued Requests</Text>
              <Text style={styles.rowSubtitle}>
                {queuedCount} requests waiting to sync
              </Text>
            </View>
            <Text style={styles.badge}>{queuedCount}</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity
          style={[styles.actionButton, !isOnline && styles.disabledButton]}
          onPress={handleSync}
          disabled={!isOnline || isSyncing}
        >
          <Ionicons name="sync" size={20} color={!isOnline ? '#999' : '#007AFF'} />
          <Text style={[styles.actionText, !isOnline && styles.disabledText]}>
            Sync Now
          </Text>
          {isSyncing && <ActivityIndicator size="small" color="#007AFF" />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, queuedCount === 0 && styles.disabledButton]}
          onPress={handleRetryFailed}
          disabled={queuedCount === 0}
        >
          <Ionicons name="refresh" size={20} color={queuedCount === 0 ? '#999' : '#FF9500'} />
          <Text style={[styles.actionText, queuedCount === 0 && styles.disabledText]}>
            Retry Failed Requests
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton, isClearing && styles.disabledButton]}
          onPress={handleClearCache}
          disabled={isClearing}
        >
          <Ionicons name="trash" size={20} color={isClearing ? '#999' : '#FF6B6B'} />
          <Text style={[styles.actionText, styles.dangerText, isClearing && styles.disabledText]}>
            Clear Cache
          </Text>
          {isClearing && <ActivityIndicator size="small" color="#FF6B6B" />}
        </TouchableOpacity>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Auto Sync</Text>
              <Text style={styles.rowSubtitle}>
                Automatically sync when connection is restored
              </Text>
            </View>
            <Switch
              value={autoSyncEnabled}
              onValueChange={setAutoSyncEnabled}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={autoSyncEnabled ? '#007AFF' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Cache Data</Text>
              <Text style={styles.rowSubtitle}>
                Store data locally for offline access
              </Text>
            </View>
            <Switch
              value={cacheEnabled}
              onValueChange={setCacheEnabled}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={cacheEnabled ? '#007AFF' : '#f4f3f4'}
            />
          </View>
        </View>
      </View>

      {/* Debug Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Debug Information</Text>
        <View style={styles.debugCard}>
          <Text style={styles.debugText}>Network Status: {isOnline ? 'Online' : 'Offline'}</Text>
          <Text style={styles.debugText}>Sync Status: {isSyncing ? 'Active' : 'Idle'}</Text>
          <Text style={styles.debugText}>Pending Requests: {pendingRequests}</Text>
          <Text style={styles.debugText}>Queued Requests: {queuedCount}</Text>
          <Text style={styles.debugText}>Last Sync: {formatLastSyncTime(lastSyncTime)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 2px 3.84px rgba(0, 0, 0, 0.1)',
    elevation: 5,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 2px 3.84px rgba(0, 0, 0, 0.1)',
    elevation: 5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  rowSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    boxShadow: '0 2px 3.84px rgba(0, 0, 0, 0.1)',
    elevation: 5,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 12,
    flex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
  dangerButton: {
    borderColor: '#FF6B6B',
    borderWidth: 1,
  },
  dangerText: {
    color: '#FF6B6B',
  },
  debugCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#495057',
    marginBottom: 4,
  },
});
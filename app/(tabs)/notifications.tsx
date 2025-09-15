import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert 
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import { apiService } from '../../services/api';
import { useAuth } from '../../providers/AuthProvider';
import { Notification } from '../../services/api';
import { useNotificationUpdates } from '../../hooks/useListUpdates';
import { useAppStateRefresh } from '../../hooks/useAppStateRefresh';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  
  // Use list update hooks
  const { markAsReadMutation, markAllAsReadMutation, invalidateNotifications } = useNotificationUpdates();
  
  // Enable automatic refresh when app comes to foreground
  useAppStateRefresh();

  // Fetch notifications
  const notificationsQuery = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => apiService.getNotifications({ 
      isRead: filter === 'all' ? undefined : filter === 'read' 
    }),
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000,
  });

  // Enhanced refresh function
  const handleManualRefresh = useCallback(async () => {
    try {
      await notificationsQuery.refetch();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh notifications. Please try again.');
    }
  }, [notificationsQuery.refetch]);

  const handlePullToRefresh = useCallback(async () => {
    await handleManualRefresh();
  }, [handleManualRefresh]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return '✓';
      case 'movement':
        return '📦';
      case 'alert':
        return '⚠️';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'approval':
        return '#10B981';
      case 'movement':
        return '#3B82F6';
      case 'alert':
        return '#F59E0B';
      case 'system':
        return '#6B7280';
      default:
        return '#8B5CF6';
    }
  };

  const handleNotificationPress = (notification: any) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id, {
        onSuccess: () => {
          Alert.alert('Success', 'Notification marked as read');
        },
        onError: () => {
          Alert.alert('Error', 'Failed to mark notification as read');
        }
      });
    }
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'approval':
        router.push('/approvals');
        break;
      case 'movement':
        router.push('/movements');
        break;
      default:
        break;
    }
  };

  const renderNotification = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !item.isRead && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationHeader}>
        <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) }]}>
          <Text style={styles.iconText}>{getNotificationIcon(item.type)}</Text>
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          <Text style={styles.notificationTime}>
            {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
          </Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  if (notificationsQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  if (notificationsQuery.error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load notifications</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => notificationsQuery.refetch()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('navigation.notifications')}</Text>
        {notificationsQuery.data?.data?.some((n: any) => !n.isRead) && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={() => markAllAsReadMutation.mutate(undefined, {
              onSuccess: () => {
                Alert.alert('Success', 'All notifications marked as read');
              },
              onError: () => {
                Alert.alert('Error', 'Failed to mark all notifications as read');
              }
            })}
            disabled={markAllAsReadMutation.isPending}
          >
            <Text style={styles.markAllButtonText}>
              {markAllAsReadMutation.isPending ? 'Marking...' : 'Mark All Read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'unread', 'read'] as const).map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={[
              styles.filterButton,
              filter === filterOption && styles.filterButtonActive
            ]}
            onPress={() => setFilter(filterOption)}
          >
            <Text style={[
              styles.filterButtonText,
              filter === filterOption && styles.filterButtonTextActive
            ]}>
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={notificationsQuery.data?.data || []}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={notificationsQuery.isFetching}
            onRefresh={handlePullToRefresh}
            tintColor="#3B82F6"
            title="Pull to refresh"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  markAllButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  markAllButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 20,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
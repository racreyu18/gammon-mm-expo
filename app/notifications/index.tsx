import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createNotificationsService, Notification } from '@gammon/shared-core';
import { useAuth } from '@/hooks/useAuth';

// Configure service with proper base URL and token provider
const serviceConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.gammon-mm.com',
  tokenProvider: async () => {
    // This will be implemented when auth is properly set up
    return 'mock-token';
  }
};

const notificationsService = createNotificationsService(serviceConfig);

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notifications', filter, token],
    queryFn: () => notificationsService.list(token, { 
      read: filter === 'all' ? undefined : filter === 'read' 
    }),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!token,
  });

  // Get unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count', token],
    queryFn: () => notificationsService.getUnreadCount(token),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!token,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      Alert.alert(t('common.error'), error.message);
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllRead(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      Alert.alert(t('common.done'), 'All notifications marked as read');
    },
    onError: (error) => {
      Alert.alert(t('common.error'), error.message);
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => notificationsService.deleteNotification(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      Alert.alert(t('common.error'), error.message);
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    // Handle navigation based on notification type
    // This would typically navigate to the relevant screen
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      Alert.alert(
        'Mark All as Read',
        `Mark all ${unreadCount} notifications as read?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark All',
            onPress: () => markAllAsReadMutation.mutate(),
          },
        ]
      );
    }
  };

  const handleDeleteNotification = (notification: Notification) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteNotificationMutation.mutate(notification.id),
        },
      ]
    );
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'movement':
        return '📦';
      case 'approval':
        return '✅';
      case 'system':
        return '⚙️';
      case 'alert':
        return '⚠️';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'movement':
        return '#3B82F6';
      case 'approval':
        return '#10B981';
      case 'system':
        return '#6B7280';
      case 'alert':
        return '#EF4444';
      default:
        return '#8B5CF6';
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification,
      ]}
      onPress={() => handleNotificationPress(item)}
      onLongPress={() => handleDeleteNotification(item)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationLeft}>
            <Text style={styles.notificationIcon}>
              {getNotificationIcon(item.type)}
            </Text>
            <View style={styles.notificationInfo}>
              <Text style={[
                styles.notificationTitle,
                !item.read && styles.unreadText,
              ]}>
                {item.title}
              </Text>
              <Text style={styles.notificationTime}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>
          
          <View style={styles.notificationRight}>
            {!item.read && (
              <View style={[
                styles.unreadDot,
                { backgroundColor: getNotificationColor(item.type) },
              ]} />
            )}
            <View style={[
              styles.typeBadge,
              { backgroundColor: getNotificationColor(item.type) },
            ]}>
              <Text style={styles.typeText}>{item.type}</Text>
            </View>
          </View>
        </View>
        
        <Text style={[
          styles.notificationMessage,
          !item.read && styles.unreadText,
        ]}>
          {item.message}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFilterButton = (filterType: typeof filter, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.activeFilterButton,
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === filterType && styles.activeFilterButtonText,
        ]}
      >
        {label}
        {filterType === 'unread' && unreadCount > 0 && (
          <Text style={styles.countBadge}> ({unreadCount})</Text>
        )}
      </Text>
    </TouchableOpacity>
  );

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('errors.network')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('notifications.title')}</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            <Text style={styles.markAllButtonText}>
              {markAllAsReadMutation.isPending ? t('common.loading') : 'Mark All Read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterContainer}>
        {renderFilterButton('all', t('notifications.all'))}
        {renderFilterButton('unread', t('notifications.unread'))}
        {renderFilterButton('read', t('notifications.read'))}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading ? t('common.loading') : 'No notifications found'}
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  countBadge: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  notificationRight: {
    alignItems: 'flex-end',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  unreadText: {
    color: '#111827',
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
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
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
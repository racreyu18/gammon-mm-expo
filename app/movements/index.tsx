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
import { router } from 'expo-router';
import { createMovementService, MovementTransaction } from '@gammon/shared-core';
import { useAuth } from '../../hooks/useAuth';

// Configure service with proper base URL and token provider
const serviceConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.gammon-mm.com',
  tokenProvider: async () => {
    // This will be implemented when auth is properly set up
    return 'mock-token';
  }
};

const movementService = createMovementService(serviceConfig);

export default function MovementsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch movements
  const {
    data: movements = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['movements', token],
    queryFn: () => movementService.listMovements(token),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!token,
  });

  // Update movement status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MovementTransaction['status'] }) =>
      movementService.updateMovementStatus(id, status, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      Alert.alert(t('common.done'), 'Movement status updated successfully');
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

  const handleStatusUpdate = (movement: MovementTransaction) => {
    const nextStatus = getNextStatus(movement.status);
    if (nextStatus) {
      updateStatusMutation.mutate({ id: movement.id, status: nextStatus });
    }
  };

  const getNextStatus = (currentStatus: MovementTransaction['status']): MovementTransaction['status'] | null => {
    switch (currentStatus) {
      case 'draft':
        return 'pending';
      case 'pending':
        return 'approved';
      case 'approved':
        return 'completed';
      default:
        return null;
    }
  };

  const getStatusColor = (status: MovementTransaction['status']) => {
    switch (status) {
      case 'draft':
        return '#6B7280';
      case 'pending':
        return '#F59E0B';
      case 'approved':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      case 'completed':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const renderMovementItem = ({ item }: { item: MovementTransaction }) => (
    <TouchableOpacity
      style={styles.movementItem}
      onPress={() => router.push(`/movements/${item.id}`)}
    >
      <View style={styles.movementHeader}>
        <Text style={styles.movementType}>{item.type}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{t(`movements.status.${item.status}`)}</Text>
        </View>
      </View>
      
      <Text style={styles.movementDescription}>{item.description}</Text>
      
      <View style={styles.movementFooter}>
        <Text style={styles.movementDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        
        {getNextStatus(item.status) && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleStatusUpdate(item)}
            disabled={updateStatusMutation.isPending}
          >
            <Text style={styles.actionButtonText}>
              {updateStatusMutation.isPending ? t('common.loading') : `→ ${t(`movements.status.${getNextStatus(item.status)}`)}`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
        <Text style={styles.title}>{t('movements.title')}</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/movements/create')}
        >
          <Text style={styles.createButtonText}>{t('movements.create')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={movements}
        renderItem={renderMovementItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
          {isLoading ? t('common.loading') : t('movements.empty')}
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
  createButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  movementItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  movementType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  movementDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  movementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  movementDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#374151',
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
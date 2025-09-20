import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert 
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiService } from '@/services/api';
import { useAuth } from '@/providers/AuthProvider';
import { Movement } from '@/services/api';
import { useMovementUpdates } from '@/hooks/useListUpdates';
import { useAppStateRefresh } from '@/hooks/useAppStateRefresh';
import { useListPerformance, useSearchPerformance } from '@/hooks/useListPerformance';

export default function MovementsScreen() {
  const { t } = useTranslation();
  const { isAuthenticated, hasFunction } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Use list update hooks
  const { invalidateMovements, updateMovementInCache } = useMovementUpdates();
  
  // Enable automatic refresh when app comes to foreground
  useAppStateRefresh();

  // Performance optimization hooks
  const { filteredData: searchFilteredMovements } = useSearchPerformance(
    movements || [],
    searchQuery,
    ['type', 'sourceLocation', 'targetLocation', 'createdBy'],
    300
  );

  const {
    data: movementsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['movements', searchQuery, statusFilter],
    queryFn: () => apiService.getMovements({
      search: searchQuery || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });

  const movements = movementsData?.data || [];

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    try {
      await refetch();
      // You could also call invalidateMovements() here for a full cache refresh
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh movements. Please try again.');
    }
  }, [refetch]);

  // Enhanced refresh with feedback
  const handlePullToRefresh = useCallback(async () => {
    await handleManualRefresh();
  }, [handleManualRefresh]);

  const renderMovement = useCallback(({ item }: { item: Movement }) => (
    <TouchableOpacity
      style={styles.movementCard}
      onPress={() => router.push(`/movements/${item.id}`)}
    >
      <View style={styles.movementHeader}>
        <Text style={styles.movementType}>{item.type}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.movementRoute}>
        {item.sourceLocation} → {item.targetLocation}
      </Text>
      <View style={styles.movementFooter}>
        <Text style={styles.movementDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <Text style={styles.movementUser}>By: {item.createdBy}</Text>
      </View>
    </TouchableOpacity>
  ), []);

  const keyExtractor = useCallback((item: Movement) => item.id, []);

  // Apply performance optimizations to the list
  const {
    data: optimizedMovements,
    performanceProps,
    flatListRef
  } = useListPerformance(
    searchFilteredMovements.filter(movement => 
      statusFilter === 'all' || movement.status === statusFilter
    ),
    keyExtractor,
    renderMovement,
    {
      windowSize: 10,
      initialNumToRender: 8,
      maxToRenderPerBatch: 5,
      updateCellsBatchingPeriod: 50,
      removeClippedSubviews: true,
    }
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return '#6B7280';
      case 'staged': return '#F59E0B';
      case 'submitted': return '#3B82F6';
      case 'confirmed': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'cancelled': return '#9CA3AF';
      default: return '#6B7280';
    }
  };

  const statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Staged', value: 'staged' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Confirmed', value: 'confirmed' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('navigation.movements')}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleManualRefresh}
            disabled={isLoading}
          >
            <Text style={styles.refreshButtonText}>↻</Text>
          </TouchableOpacity>
          {hasFunction('movement.create') && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/movements/create')}
            >
              <Text style={styles.createButtonText}>+ New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search movements..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={statusOptions}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === item.value && styles.filterButtonActive
              ]}
              onPress={() => setStatusFilter(item.value)}
            >
              <Text style={[
                styles.filterButtonText,
                statusFilter === item.value && styles.filterButtonTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading movements...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load movements</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={optimizedMovements}
          keyExtractor={keyExtractor}
          renderItem={renderMovement}
          refreshControl={
            <RefreshControl 
              refreshing={isLoading} 
              onRefresh={handlePullToRefresh}
              tintColor="#3B82F6"
              title="Pull to refresh"
            />
          }
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No movements found</Text>
            </View>
          }
          {...performanceProps}
        />
      )}
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  refreshButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
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
    fontSize: 14,
  },
  searchContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
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
  movementCard: {
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
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  movementType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  movementRoute: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
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
  movementUser: {
    fontSize: 12,
    color: '#9CA3AF',
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
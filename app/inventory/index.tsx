import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { createMovementService, MovementTransaction } from '@gammon/shared-core';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineCapable } from '../../hooks/useOffline';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';

// Configure service with proper base URL and token provider
const serviceConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.gammon-mm.com',
  tokenProvider: async () => {
    // This will be implemented when auth is properly set up
    return 'mock-token';
  }
};

const movementService = createMovementService(serviceConfig);

export default function InventoryScreen() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const { isOnline } = useOfflineCapable();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'available' | 'reserved' | 'low_stock'>('all');

  // Fetch inventory items
  const {
    data: items = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['inventory', searchQuery, filter, token],
    queryFn: () => inventoryService.searchItems(token, {
      query: searchQuery,
      status: filter === 'all' ? undefined : filter,
      limit: 50
    }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!token,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleItemPress = (item: InventoryItem) => {
    router.push(`/inventory/${item.id}`);
  };

  const handleScanPress = () => {
    router.push('/scanning');
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'available': return '#10B981';
      case 'reserved': return '#F59E0B';
      case 'out_of_stock': return '#EF4444';
      case 'low_stock': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getQuantityColor = (item: InventoryItem) => {
    if (item.quantity === 0) return '#EF4444';
    if (item.quantity <= (item.minQuantity || 0)) return '#F59E0B';
    return '#10B981';
  };

  const renderFilterButton = (filterType: typeof filter, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.activeFilterButton,
        { borderColor: Colors[colorScheme ?? 'light'].tint }
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === filterType && styles.activeFilterButtonText,
          { color: filter === filterType ? 'white' : Colors[colorScheme ?? 'light'].tint }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: Colors[colorScheme ?? 'light'].text }]}>
            {item.name}
          </Text>
          <Text style={[styles.itemCode, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            {item.code || item.barcode}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.itemDetails}>
        <View style={styles.quantityInfo}>
          <Text style={[styles.quantityLabel, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            Quantity:
          </Text>
          <Text style={[styles.quantityValue, { color: getQuantityColor(item) }]}>
            {item.quantity} {item.unit || 'units'}
          </Text>
        </View>
        
        {item.location && (
          <View style={styles.locationInfo}>
            <IconSymbol size={16} name="location" color={Colors[colorScheme ?? 'light'].tabIconDefault} />
            <Text style={[styles.locationText, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
              {item.location}
            </Text>
          </View>
        )}
      </View>

      {item.description && (
        <Text style={[styles.itemDescription, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
          {item.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <Text style={[styles.errorText, { color: Colors[colorScheme ?? 'light'].text }]}>
          {t('errors.network')}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
          {t('inventory.title')}
        </Text>
        
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            <IconSymbol size={20} name="magnifyingglass" color={Colors[colorScheme ?? 'light'].tabIconDefault} />
            <TextInput
              style={[styles.searchInput, { color: Colors[colorScheme ?? 'light'].text }]}
              placeholder={t('inventory.search_placeholder')}
              placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>
          
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
            onPress={handleScanPress}
          >
            <IconSymbol size={20} name="qrcode.viewfinder" color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterContainer}>
        {renderFilterButton('all', t('inventory.all'))}
        {renderFilterButton('available', t('inventory.available'))}
        {renderFilterButton('reserved', t('inventory.reserved'))}
        {renderFilterButton('low_stock', t('inventory.low_stock'))}
      </View>

      {!isOnline && (
        <View style={styles.offlineNotice}>
          <IconSymbol size={16} name="wifi.slash" color="#F59E0B" />
          <Text style={styles.offlineText}>
            {t('inventory.offline_notice')}
          </Text>
        </View>
      )}

      <FlatList
        data={items}
        renderItem={renderInventoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol size={48} name="archivebox" color={Colors[colorScheme ?? 'light'].tabIconDefault} />
            <Text style={[styles.emptyText, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
              {isLoading ? t('common.loading') : searchQuery ? t('inventory.no_results') : t('inventory.no_items')}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.scanPromptButton} onPress={handleScanPress}>
                <Text style={styles.scanPromptText}>{t('inventory.scan_to_add')}</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: 'white',
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    gap: 8,
  },
  offlineText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  itemCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemCode: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
    textTransform: 'capitalize',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityLabel: {
    fontSize: 14,
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
  },
  itemDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  scanPromptButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanPromptText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
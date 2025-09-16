import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useOffline } from '../../hooks/useOffline';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { InventoryClient, InventoryItem } from '@gammon/shared-core';
import InventorySearchFilter, { InventorySearchParams } from '../components/InventorySearchFilter';
import InventoryItemCard from '../components/InventoryItemCard';
import { LoadingIndicator } from '../../utils/loadingState';

// Configure inventory service
const inventoryService = new InventoryClient(
  process.env.EXPO_PUBLIC_API_URL || 'https://api.gammon-mm.com'
);

export default function InventoryScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const colorScheme = useColorScheme();
  const [searchParams, setSearchParams] = useState<InventorySearchParams>({
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const [refreshing, setRefreshing] = useState(false);

  // Update auth token when available
  useEffect(() => {
    if (user?.token) {
      inventoryService.updateAuthToken(user.token);
    }
  }, [user?.token]);

  // Query for inventory items
  const { data: inventoryItems, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', searchParams],
    queryFn: async () => {
      const params = {
        query: searchParams.query,
        status: searchParams.status,
        category: searchParams.category,
        location: searchParams.location,
        minQuantity: searchParams.minQuantity,
        maxQuantity: searchParams.maxQuantity,
        sortBy: searchParams.sortBy,
        sortOrder: searchParams.sortOrder,
        showLowStock: searchParams.showLowStock,
        showOutOfStock: searchParams.showOutOfStock,
        offset: 0,
        limit: 50,
      };
      return await inventoryService.searchItems(params);
    },
    enabled: !!user?.token,
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



  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <InventoryItemCard item={item} />
  );

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <Text style={[styles.errorText, { color: Colors[colorScheme ?? 'light'].text }]}>
          {t('errors.network')}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => refetch()}
          accessibilityLabel="Retry loading inventory"
          accessibilityHint="Attempts to reload the inventory data"
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Sample data for filters (in real app, this would come from API)
  const categories = ['Electronics', 'Tools', 'Safety Equipment', 'Materials'];
  const locations = ['Warehouse A', 'Warehouse B', 'Site 1', 'Site 2'];

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      {/* Header with Scan Button */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
          {t('inventory.title')}
        </Text>
        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={() => router.push('/scan')}
          accessibilityLabel="Scan barcode"
          accessibilityHint="Opens the barcode scanner to find inventory items"
          accessibilityRole="button"
        >
          <IconSymbol size={24} name="qrcode.viewfinder" color="white" />
        </TouchableOpacity>
      </View>

      {/* Search and Filter Component */}
      <InventorySearchFilter
        searchParams={searchParams}
        onSearchParamsChange={setSearchParams}
        categories={categories}
        locations={locations}
      />

      {isOffline && (
        <View style={styles.offlineNotice}>
          <IconSymbol size={16} name="wifi.slash" color="#F59E0B" />
          <Text style={styles.offlineText}>
            {t('inventory.offline_notice')}
          </Text>
        </View>
      )}

      <FlatList
        data={inventoryItems || []}
        renderItem={renderInventoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors[colorScheme ?? 'light'].tint}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <LoadingIndicator 
                message={t('common.loading')} 
                size="large"
                color={Colors[colorScheme ?? 'light'].tint}
              />
            ) : (
              <>
                <IconSymbol size={64} name="archivebox" color={Colors[colorScheme ?? 'light'].tabIconDefault} />
                <Text style={[styles.emptyText, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                  {t('inventory.no_items')}
                </Text>
              </>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
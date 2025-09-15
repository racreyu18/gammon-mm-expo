import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';

export interface InventorySearchParams {
  query?: string;
  status?: string;
  category?: string;
  location?: string;
  minQuantity?: number;
  maxQuantity?: number;
  sortBy?: 'name' | 'quantity' | 'lastUpdated' | 'status';
  sortOrder?: 'asc' | 'desc';
  showLowStock?: boolean;
  showOutOfStock?: boolean;
}

interface InventorySearchFilterProps {
  searchParams: InventorySearchParams;
  onSearchParamsChange: (params: InventorySearchParams) => void;
  categories?: string[];
  locations?: string[];
}

export default function InventorySearchFilter({
  searchParams,
  onSearchParamsChange,
  categories = [],
  locations = [],
}: InventorySearchFilterProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const [showFilters, setShowFilters] = useState(false);
  const [tempParams, setTempParams] = useState<InventorySearchParams>(searchParams);

  const handleSearchChange = (query: string) => {
    onSearchParamsChange({ ...searchParams, query });
  };

  const handleQuickFilter = (filter: Partial<InventorySearchParams>) => {
    onSearchParamsChange({ ...searchParams, ...filter });
  };

  const applyFilters = () => {
    onSearchParamsChange(tempParams);
    setShowFilters(false);
  };

  const resetFilters = () => {
    const resetParams: InventorySearchParams = {
      query: searchParams.query,
      sortBy: 'name',
      sortOrder: 'asc',
    };
    setTempParams(resetParams);
    onSearchParamsChange(resetParams);
    setShowFilters(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchParams.status) count++;
    if (searchParams.category) count++;
    if (searchParams.location) count++;
    if (searchParams.minQuantity !== undefined) count++;
    if (searchParams.maxQuantity !== undefined) count++;
    if (searchParams.showLowStock) count++;
    if (searchParams.showOutOfStock) count++;
    return count;
  };

  const renderQuickFilters = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickFilters}>
      <TouchableOpacity
        style={[
          styles.quickFilterButton,
          searchParams.status === 'available' && styles.activeQuickFilter,
          { borderColor: Colors[colorScheme ?? 'light'].tint }
        ]}
        onPress={() => handleQuickFilter({ status: searchParams.status === 'available' ? undefined : 'available' })}
      >
        <Text style={[
          styles.quickFilterText,
          searchParams.status === 'available' && styles.activeQuickFilterText,
          { color: searchParams.status === 'available' ? 'white' : Colors[colorScheme ?? 'light'].tint }
        ]}>
          {t('inventory.available')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.quickFilterButton,
          searchParams.showLowStock && styles.activeQuickFilter,
          { borderColor: Colors[colorScheme ?? 'light'].tint }
        ]}
        onPress={() => handleQuickFilter({ showLowStock: !searchParams.showLowStock })}
      >
        <Text style={[
          styles.quickFilterText,
          searchParams.showLowStock && styles.activeQuickFilterText,
          { color: searchParams.showLowStock ? 'white' : Colors[colorScheme ?? 'light'].tint }
        ]}>
          {t('inventory.low_stock')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.quickFilterButton,
          searchParams.status === 'reserved' && styles.activeQuickFilter,
          { borderColor: Colors[colorScheme ?? 'light'].tint }
        ]}
        onPress={() => handleQuickFilter({ status: searchParams.status === 'reserved' ? undefined : 'reserved' })}
      >
        <Text style={[
          styles.quickFilterText,
          searchParams.status === 'reserved' && styles.activeQuickFilterText,
          { color: searchParams.status === 'reserved' ? 'white' : Colors[colorScheme ?? 'light'].tint }
        ]}>
          {t('inventory.reserved')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Text style={[styles.modalCancelText, { color: Colors[colorScheme ?? 'light'].tint }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
            {t('inventory.filters')}
          </Text>
          <TouchableOpacity onPress={applyFilters}>
            <Text style={[styles.modalApplyText, { color: Colors[colorScheme ?? 'light'].tint }]}>
              {t('common.apply')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              {t('inventory.status')}
            </Text>
            <View style={styles.filterOptions}>
              {['available', 'reserved', 'out_of_stock'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterOption,
                    tempParams.status === status && styles.activeFilterOption,
                    { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }
                  ]}
                  onPress={() => setTempParams({
                    ...tempParams,
                    status: tempParams.status === status ? undefined : status
                  })}
                >
                  <Text style={[
                    styles.filterOptionText,
                    tempParams.status === status && styles.activeFilterOptionText,
                    { color: tempParams.status === status ? 'white' : Colors[colorScheme ?? 'light'].text }
                  ]}>
                    {t(`inventory.${status}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category Filter */}
          {categories.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
                {t('inventory.category')}
              </Text>
              <View style={styles.filterOptions}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterOption,
                      tempParams.category === category && styles.activeFilterOption,
                      { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }
                    ]}
                    onPress={() => setTempParams({
                      ...tempParams,
                      category: tempParams.category === category ? undefined : category
                    })}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      tempParams.category === category && styles.activeFilterOptionText,
                      { color: tempParams.category === category ? 'white' : Colors[colorScheme ?? 'light'].text }
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Location Filter */}
          {locations.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
                {t('inventory.location')}
              </Text>
              <View style={styles.filterOptions}>
                {locations.map((location) => (
                  <TouchableOpacity
                    key={location}
                    style={[
                      styles.filterOption,
                      tempParams.location === location && styles.activeFilterOption,
                      { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }
                    ]}
                    onPress={() => setTempParams({
                      ...tempParams,
                      location: tempParams.location === location ? undefined : location
                    })}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      tempParams.location === location && styles.activeFilterOptionText,
                      { color: tempParams.location === location ? 'white' : Colors[colorScheme ?? 'light'].text }
                    ]}>
                      {location}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Quantity Range */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              {t('inventory.quantity_range')}
            </Text>
            <View style={styles.quantityInputs}>
              <View style={styles.quantityInputContainer}>
                <Text style={[styles.quantityLabel, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                  {t('inventory.min_quantity')}
                </Text>
                <TextInput
                  style={[styles.quantityInput, { 
                    borderColor: Colors[colorScheme ?? 'light'].tabIconDefault,
                    color: Colors[colorScheme ?? 'light'].text 
                  }]}
                  value={tempParams.minQuantity?.toString() || ''}
                  onChangeText={(text) => setTempParams({
                    ...tempParams,
                    minQuantity: text ? parseInt(text) : undefined
                  })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
                />
              </View>
              <View style={styles.quantityInputContainer}>
                <Text style={[styles.quantityLabel, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                  {t('inventory.max_quantity')}
                </Text>
                <TextInput
                  style={[styles.quantityInput, { 
                    borderColor: Colors[colorScheme ?? 'light'].tabIconDefault,
                    color: Colors[colorScheme ?? 'light'].text 
                  }]}
                  value={tempParams.maxQuantity?.toString() || ''}
                  onChangeText={(text) => setTempParams({
                    ...tempParams,
                    maxQuantity: text ? parseInt(text) : undefined
                  })}
                  keyboardType="numeric"
                  placeholder="∞"
                  placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
                />
              </View>
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              {t('inventory.sort_by')}
            </Text>
            <View style={styles.filterOptions}>
              {[
                { key: 'name', label: t('inventory.name') },
                { key: 'quantity', label: t('inventory.quantity') },
                { key: 'lastUpdated', label: t('inventory.last_updated') },
                { key: 'status', label: t('inventory.status') },
              ].map((sort) => (
                <TouchableOpacity
                  key={sort.key}
                  style={[
                    styles.filterOption,
                    tempParams.sortBy === sort.key && styles.activeFilterOption,
                    { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }
                  ]}
                  onPress={() => setTempParams({
                    ...tempParams,
                    sortBy: sort.key as any
                  })}
                >
                  <Text style={[
                    styles.filterOptionText,
                    tempParams.sortBy === sort.key && styles.activeFilterOptionText,
                    { color: tempParams.sortBy === sort.key ? 'white' : Colors[colorScheme ?? 'light'].text }
                  ]}>
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.sortOrderContainer}>
              <Text style={[styles.sortOrderLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
                {t('inventory.sort_order')}
              </Text>
              <View style={styles.sortOrderButtons}>
                <TouchableOpacity
                  style={[
                    styles.sortOrderButton,
                    tempParams.sortOrder === 'asc' && styles.activeSortOrderButton,
                    { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }
                  ]}
                  onPress={() => setTempParams({ ...tempParams, sortOrder: 'asc' })}
                >
                  <IconSymbol size={16} name="arrow.up" color={
                    tempParams.sortOrder === 'asc' ? 'white' : Colors[colorScheme ?? 'light'].text
                  } />
                  <Text style={[
                    styles.sortOrderButtonText,
                    tempParams.sortOrder === 'asc' && styles.activeSortOrderButtonText,
                    { color: tempParams.sortOrder === 'asc' ? 'white' : Colors[colorScheme ?? 'light'].text }
                  ]}>
                    {t('common.ascending')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sortOrderButton,
                    tempParams.sortOrder === 'desc' && styles.activeSortOrderButton,
                    { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }
                  ]}
                  onPress={() => setTempParams({ ...tempParams, sortOrder: 'desc' })}
                >
                  <IconSymbol size={16} name="arrow.down" color={
                    tempParams.sortOrder === 'desc' ? 'white' : Colors[colorScheme ?? 'light'].text
                  } />
                  <Text style={[
                    styles.sortOrderButtonText,
                    tempParams.sortOrder === 'desc' && styles.activeSortOrderButtonText,
                    { color: tempParams.sortOrder === 'desc' ? 'white' : Colors[colorScheme ?? 'light'].text }
                  ]}>
                    {t('common.descending')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Special Filters */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              {t('inventory.special_filters')}
            </Text>
            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
                {t('inventory.show_low_stock')}
              </Text>
              <Switch
                value={tempParams.showLowStock || false}
                onValueChange={(value) => setTempParams({ ...tempParams, showLowStock: value })}
                trackColor={{ false: Colors[colorScheme ?? 'light'].tabIconDefault, true: Colors[colorScheme ?? 'light'].tint }}
              />
            </View>
            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
                {t('inventory.show_out_of_stock')}
              </Text>
              <Switch
                value={tempParams.showOutOfStock || false}
                onValueChange={(value) => setTempParams({ ...tempParams, showOutOfStock: value })}
                trackColor={{ false: Colors[colorScheme ?? 'light'].tabIconDefault, true: Colors[colorScheme ?? 'light'].tint }}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
            <Text style={[styles.resetButtonText, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
              {t('common.reset')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
          <IconSymbol size={20} name="magnifyingglass" color={Colors[colorScheme ?? 'light'].tabIconDefault} />
          <TextInput
            style={[styles.searchInput, { color: Colors[colorScheme ?? 'light'].text }]}
            placeholder={t('inventory.search_placeholder')}
            placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
            value={searchParams.query || ''}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {searchParams.query && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <IconSymbol size={20} name="xmark.circle.fill" color={Colors[colorScheme ?? 'light'].tabIconDefault} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={() => {
            setTempParams(searchParams);
            setShowFilters(true);
          }}
        >
          <IconSymbol size={20} name="line.3.horizontal.decrease.circle" color="white" />
          {getActiveFilterCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Filters */}
      {renderQuickFilters()}

      {/* Filter Modal */}
      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickFilters: {
    flexDirection: 'row',
  },
  quickFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  activeQuickFilter: {
    backgroundColor: '#3B82F6',
  },
  quickFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeQuickFilterText: {
    color: 'white',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancelText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalApplyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 32,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeFilterOption: {
    backgroundColor: '#3B82F6',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterOptionText: {
    color: 'white',
  },
  quantityInputs: {
    flexDirection: 'row',
    gap: 16,
  },
  quantityInputContainer: {
    flex: 1,
  },
  quantityLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  quantityInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  sortOrderContainer: {
    marginTop: 16,
  },
  sortOrderLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  sortOrderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortOrderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  activeSortOrderButton: {
    backgroundColor: '#3B82F6',
  },
  sortOrderButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeSortOrderButtonText: {
    color: 'white',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
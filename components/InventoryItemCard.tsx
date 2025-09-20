import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { IconSymbol } from './ui/icon-symbol';
import { Colors } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';

interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  status: string;
  location?: string;
  category?: string;
  lastUpdated?: string;
  minQuantity?: number;
}

interface InventoryItemCardProps {
  item: InventoryItem;
  onPress?: (item: InventoryItem) => void;
}

export default function InventoryItemCard({ item, onPress }: InventoryItemCardProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return '#10B981';
      case 'reserved':
        return '#F59E0B';
      case 'out_of_stock':
        return '#EF4444';
      case 'low_stock':
        return '#F97316';
      default:
        return Colors[colorScheme ?? 'light'].tabIconDefault;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'checkmark.circle.fill';
      case 'reserved':
        return 'clock.fill';
      case 'out_of_stock':
        return 'xmark.circle.fill';
      case 'low_stock':
        return 'exclamationmark.triangle.fill';
      default:
        return 'circle.fill';
    }
  };

  const isLowStock = item.minQuantity && item.quantity <= item.minQuantity;

  const handlePress = () => {
    if (onPress) {
      onPress(item);
    } else {
      router.push(`/inventory/${item.id}`);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          borderColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        }
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.name, { color: Colors[colorScheme ?? 'light'].text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.category && (
            <Text style={[styles.category, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
              {item.category}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <IconSymbol 
            size={12} 
            name={getStatusIcon(item.status)} 
            color="white" 
          />
          <Text style={styles.statusText}>
            {t(`inventory.${item.status}`)}
          </Text>
        </View>
      </View>

      {item.description && (
        <Text 
          style={[styles.description, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]} 
          numberOfLines={2}
        >
          {item.description}
        </Text>
      )}

      <View style={styles.details}>
        <View style={styles.quantityContainer}>
          <IconSymbol 
            size={16} 
            name="number.square" 
            color={isLowStock ? '#EF4444' : Colors[colorScheme ?? 'light'].text} 
          />
          <Text style={[
            styles.quantity,
            { color: isLowStock ? '#EF4444' : Colors[colorScheme ?? 'light'].text }
          ]}>
            {item.quantity} {item.unit || 'units'}
          </Text>
          {isLowStock && (
            <View style={styles.lowStockWarning}>
              <IconSymbol size={12} name="exclamationmark.triangle.fill" color="#EF4444" />
              <Text style={styles.lowStockText}>{t('inventory.low_stock')}</Text>
            </View>
          )}
        </View>

        {item.location && (
          <View style={styles.locationContainer}>
            <IconSymbol 
              size={16} 
              name="location" 
              color={Colors[colorScheme ?? 'light'].tabIconDefault} 
            />
            <Text style={[styles.location, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
              {item.location}
            </Text>
          </View>
        )}
      </View>

      {item.lastUpdated && (
        <Text style={[styles.lastUpdated, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
          {t('inventory.last_updated')}: {new Date(item.lastUpdated).toLocaleDateString()}
        </Text>
      )}

      <View style={styles.actionIndicator}>
        <IconSymbol 
          size={16} 
          name="chevron.right" 
          color={Colors[colorScheme ?? 'light'].tabIconDefault} 
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
  },
  lowStockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  lowStockText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 14,
    fontWeight: '500',
  },
  lastUpdated: {
    fontSize: 12,
    marginTop: 4,
  },
  actionIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -8 }],
  },
});
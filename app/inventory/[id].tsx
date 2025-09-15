import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { InventoryClient, InventoryItem } from '@gammon/shared-core';
import { createMovementClient } from '@gammon/shared-core/services/movementClient';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineCapable } from '../../hooks/useOffline';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';

// Configure services
const inventoryService = new InventoryClient(
  process.env.EXPO_PUBLIC_API_URL || 'https://api.gammon-mm.com'
);

export default function InventoryItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const { isOnline } = useOfflineCapable();
  const queryClient = useQueryClient();
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'receive' | 'issue' | 'transfer' | 'adjustment'>('issue');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  // Create movement service with token provider
  const movementService = React.useMemo(() => createMovementClient({
    baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.gammon-mm.com',
    tokenProvider: async () => token || ''
  }), [token]);

  // Update auth tokens when available
  React.useEffect(() => {
    if (token) {
      inventoryService.updateAuthToken(token);
    }
  }, [token]);

  // Fetch item details
  const {
    data: item,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['inventory-item', id, token],
    queryFn: () => inventoryService.getItem(id!),
    enabled: !!token && !!id,
  });

  // Fetch movement history
  const {
    data: movements = [],
  } = useQuery({
    queryKey: ['inventory-movements', id, token],
    queryFn: async () => {
      try {
        const result = await movementService.listMovements({ 
          limit: 50,
          offset: 0 
        });
        // Filter movements for this specific item if needed
        return Array.isArray(result) ? result.filter((m: any) => m.itemId === id) : [];
      } catch (error) {
        console.warn('Failed to fetch movements:', error);
        return [];
      }
    },
    enabled: !!token && !!id,
  });

  // Create movement mutation
  const createMovementMutation = useMutation({
    mutationFn: async (data: {
      itemId: string;
      type: 'receive' | 'issue' | 'transfer' | 'adjustment';
      quantity: number;
      notes?: string;
    }) => {
      const movementData = {
        itemId: data.itemId,
        type: data.type,
        quantity: data.quantity,
        notes: data.notes || '',
        status: 'pending' as const
      };
      return movementService.createMovement(movementData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-item', id] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements', id] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setShowMovementModal(false);
      setQuantity('');
      setNotes('');
      Alert.alert(t('success.title'), t('inventory.movement_created'));
    },
    onError: (error: any) => {
      Alert.alert(t('errors.title'), error.message || t('errors.network'));
    },
  });

  const handleCreateMovement = () => {
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      Alert.alert(t('errors.title'), t('inventory.invalid_quantity'));
      return;
    }

    if (movementType === 'issue' && Number(quantity) > (item?.quantity || 0)) {
      Alert.alert(t('errors.title'), t('inventory.insufficient_quantity'));
      return;
    }

    createMovementMutation.mutate({
      itemId: id!,
      type: movementType,
      quantity: Number(quantity),
      notes: notes.trim() || undefined,
    });
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

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case 'receive': return 'plus.circle.fill';
      case 'issue': return 'minus.circle.fill';
      case 'transfer': return 'arrow.left.arrow.right.circle.fill';
      case 'adjustment': return 'pencil.circle.fill';
      default: return 'circle.fill';
    }
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'receive': return '#10B981';
      case 'issue': return '#EF4444';
      case 'transfer': return '#3B82F6';
      case 'adjustment': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <Text style={[styles.loadingText, { color: Colors[colorScheme ?? 'light'].text }]}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <Text style={[styles.errorText, { color: Colors[colorScheme ?? 'light'].text }]}>
          {t('errors.item_not_found')}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol size={24} name="chevron.left" color={Colors[colorScheme ?? 'light'].text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
            {t('inventory.item_details')}
          </Text>
        </View>

        {/* Item Info Card */}
        <View style={[styles.card, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
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

          {item.description && (
            <Text style={[styles.description, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
              {item.description}
            </Text>
          )}

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                {t('inventory.quantity')}
              </Text>
              <Text style={[styles.detailValue, { color: getQuantityColor(item) }]}>
                {item.quantity} {item.unit || 'units'}
              </Text>
            </View>

            {item.minQuantity && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                  {t('inventory.min_quantity')}
                </Text>
                <Text style={[styles.detailValue, { color: Colors[colorScheme ?? 'light'].text }]}>
                  {item.minQuantity} {item.unit || 'units'}
                </Text>
              </View>
            )}

            {item.location && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                  {t('inventory.location')}
                </Text>
                <Text style={[styles.detailValue, { color: Colors[colorScheme ?? 'light'].text }]}>
                  {item.location}
                </Text>
              </View>
            )}

            {item.category && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                  {t('inventory.category')}
                </Text>
                <Text style={[styles.detailValue, { color: Colors[colorScheme ?? 'light'].text }]}>
                  {item.category}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.receiveButton]}
            onPress={() => {
              setMovementType('receive');
              setShowMovementModal(true);
            }}
            disabled={!isOnline}
          >
            <IconSymbol size={20} name="plus.circle" color="white" />
            <Text style={styles.actionButtonText}>{t('inventory.receive')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.issueButton]}
            onPress={() => {
              setMovementType('issue');
              setShowMovementModal(true);
            }}
            disabled={!isOnline || item.quantity === 0}
          >
            <IconSymbol size={20} name="minus.circle" color="white" />
            <Text style={styles.actionButtonText}>{t('inventory.issue')}</Text>
          </TouchableOpacity>
        </View>

        {/* Movement History */}
        <View style={[styles.card, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
          <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
            {t('inventory.movement_history')}
          </Text>
          
          {movements.length === 0 ? (
            <Text style={[styles.emptyText, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
              {t('inventory.no_movements')}
            </Text>
          ) : (
            movements.map((movement, index) => (
              <View key={index} style={styles.movementItem}>
                <View style={styles.movementHeader}>
                  <View style={styles.movementInfo}>
                    <IconSymbol
                      size={16}
                      name={getMovementTypeIcon(movement.type)}
                      color={getMovementTypeColor(movement.type)}
                    />
                    <Text style={[styles.movementType, { color: Colors[colorScheme ?? 'light'].text }]}>
                      {t(`inventory.movement_types.${movement.type}`)}
                    </Text>
                  </View>
                  <Text style={[styles.movementDate, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                    {new Date(movement.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.movementDetails}>
                  <Text style={[styles.movementQuantity, { color: getMovementTypeColor(movement.type) }]}>
                    {movement.type === 'issue' ? '-' : '+'}{movement.quantity} {item.unit || 'units'}
                  </Text>
                  {movement.notes && (
                    <Text style={[styles.movementNotes, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                      {movement.notes}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Movement Modal */}
      <Modal
        visible={showMovementModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMovementModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMovementModal(false)}>
              <Text style={[styles.modalCancelText, { color: Colors[colorScheme ?? 'light'].tint }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
              {t(`inventory.movement_types.${movementType}`)}
            </Text>
            <TouchableOpacity
              onPress={handleCreateMovement}
              disabled={createMovementMutation.isPending}
            >
              <Text style={[styles.modalSaveText, { color: Colors[colorScheme ?? 'light'].tint }]}>
                {createMovementMutation.isPending ? t('common.saving') : t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
                {t('inventory.quantity')}
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  color: Colors[colorScheme ?? 'light'].text,
                  borderColor: Colors[colorScheme ?? 'light'].tabIconDefault
                }]}
                value={quantity}
                onChangeText={setQuantity}
                placeholder={t('inventory.enter_quantity')}
                placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
                {t('inventory.notes')} ({t('common.optional')})
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { 
                  color: Colors[colorScheme ?? 'light'].text,
                  borderColor: Colors[colorScheme ?? 'light'].tabIconDefault
                }]}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('inventory.enter_notes')}
                placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {movementType === 'issue' && item.quantity < Number(quantity || 0) && (
              <View style={styles.warningContainer}>
                <IconSymbol size={16} name="exclamationmark.triangle" color="#F59E0B" />
                <Text style={styles.warningText}>
                  {t('inventory.insufficient_quantity_warning')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  card: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemCode: {
    fontSize: 16,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  receiveButton: {
    backgroundColor: '#10B981',
  },
  issueButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  movementItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  movementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  movementType: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  movementDate: {
    fontSize: 14,
  },
  movementDetails: {
    gap: 4,
  },
  movementQuantity: {
    fontSize: 16,
    fontWeight: '600',
  },
  movementNotes: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginTop: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
  },
});
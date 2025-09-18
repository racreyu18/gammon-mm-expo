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
import { createMovementService, MovementTransaction, MovementServiceConfig } from '@gammon/shared-core';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineCapable } from '../../hooks/useOffline';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { FormValidator, CommonSchemas, InputSanitizer } from '../../utils/inputValidation';
import { ButtonLoading, useAsyncOperation } from '../../utils/loadingState';

export default function InventoryItemScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  // Configure movement service with current token
  const movementService = React.useMemo(() => {
    const apiConfig: MovementServiceConfig = {
      baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.gammon-mm.com',
      tokenProvider: async () => token || '',
    };
    return createMovementService(apiConfig);
  }, [token]);
  const colorScheme = useColorScheme();
  const { isOnline } = useOfflineCapable();
  const queryClient = useQueryClient();
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'receive' | 'issue' | 'transfer' | 'adjustment'>('issue');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});
  
  // Use loading state utilities for movement creation
  const { execute: executeMovementCreation, isLoading: isCreatingMovement } = useAsyncOperation();



  // Mock item details (since we don't have an inventory service yet)
  const item = React.useMemo(() => {
    if (!id) return null;
    return {
      id,
      name: `Item ${id}`,
      code: `ITEM-${id}`,
      description: `Description for item ${id}`,
      quantity: 100, // Mock quantity
      status: 'active' as const,
      location: 'Warehouse A',
      category: 'General',
    };
  }, [id]);
  
  const isLoading = false;
  const error = null;
  const refetch = () => Promise.resolve();

  // Fetch movement history
  const {
    data: movements = [],
  } = useQuery({
    queryKey: ['inventory-movements', id, token],
    queryFn: async () => {
      try {
        const result = await movementService.list();
        // Return all movements since we don't have item-specific filtering yet
        return Array.isArray(result) ? result : [];
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
      type: 'receive' | 'issue' | 'transfer' | 'adjustment';
      quantity: number;
      notes?: string;
    }) => {
      const movementData: MovementTransactionCreate = {
        type: data.type,
        sourceLocationId: 'warehouse-a', // Mock source location
        targetLocationId: 'warehouse-b', // Mock target location
        quantity: data.quantity,
        // Note: notes field is not part of MovementTransactionCreate interface
      };
      return movementService.create(movementData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-item', id] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements', id] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setShowMovementModal(false);
      setQuantity('');
      setNotes('');
      setValidationErrors({});
      setFieldTouched({});
      Alert.alert(t('success.title'), t('inventory.movement_created'));
    },
    onError: (error: any) => {
      Alert.alert(t('errors.title'), error.message || t('errors.network'));
    },
  });

  const handleCreateMovement = () => {
    // Validate form data
    const formData = { quantity, notes };
    const schema = {
      quantity: CommonSchemas.materialMovement.quantity,
      notes: { required: false, type: 'string' as const, maxLength: 500 }
    };
    
    const validationResult = FormValidator.validate(formData, schema);
    
    if (!validationResult.isValid) {
      setValidationErrors(validationResult.errors);
      setFieldTouched({ quantity: true, notes: true });
      
      const firstError = Object.values(validationResult.errors)[0];
      Alert.alert(t('errors.title'), firstError);
      return;
    }

    if (movementType === 'issue' && Number(quantity) > (item?.quantity || 0)) {
      Alert.alert(t('errors.title'), t('inventory.insufficient_quantity'));
      return;
    }

    executeMovementCreation(async () => {
      await createMovementMutation.mutateAsync({
        type: movementType,
        quantity: Number(quantity),
        notes: notes.trim() || undefined,
      });
    }, {
      errorMessage: t('errors.network'),
      onError: (error) => {
        console.error('Movement creation error:', error);
        Alert.alert(t('errors.title'), error.message || t('errors.network'));
      }
    });
  };

  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    
    // Clear validation error when user starts typing
    if (validationErrors.quantity) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.quantity;
        return newErrors;
      });
    }
  };

  const handleQuantityBlur = () => {
    setFieldTouched(prev => ({ ...prev, quantity: true }));
    
    // Sanitize and validate quantity on blur
    const sanitizedQuantity = InputSanitizer.sanitizeQuantity(quantity);
    if (sanitizedQuantity !== null) {
      setQuantity(sanitizedQuantity.toString());
    }
    
    const result = FormValidator.validate({ quantity }, { quantity: CommonSchemas.materialMovement.quantity });
    if (!result.isValid && result.errors.quantity) {
      setValidationErrors(prev => ({ ...prev, quantity: result.errors.quantity }));
    }
  };

  const handleNotesChange = (value: string) => {
    const sanitizedNotes = InputSanitizer.sanitizeString(value);
    setNotes(sanitizedNotes);
    
    // Clear validation error when user starts typing
    if (validationErrors.notes) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.notes;
        return newErrors;
      });
    }
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
              disabled={isCreatingMovement}
            >
              <Text style={[styles.modalSaveText, { color: Colors[colorScheme ?? 'light'].tint }]}>
                {isCreatingMovement ? t('common.saving') : t('common.save')}
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
                  borderColor: (fieldTouched.quantity && validationErrors.quantity) 
                    ? '#dc3545' 
                    : Colors[colorScheme ?? 'light'].tabIconDefault
                }]}
                value={quantity}
                onChangeText={handleQuantityChange}
                onBlur={handleQuantityBlur}
                placeholder={t('inventory.enter_quantity')}
                placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
                keyboardType="numeric"
                returnKeyType="next"
              />
              {fieldTouched.quantity && validationErrors.quantity && (
                <Text style={styles.errorText}>{validationErrors.quantity}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
                {t('inventory.notes')} ({t('common.optional')})
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { 
                  color: Colors[colorScheme ?? 'light'].text,
                  borderColor: (fieldTouched.notes && validationErrors.notes) 
                    ? '#dc3545' 
                    : Colors[colorScheme ?? 'light'].tabIconDefault
                }]}
                value={notes}
                onChangeText={handleNotesChange}
                placeholder={t('inventory.enter_notes')}
                placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              {fieldTouched.notes && validationErrors.notes && (
                <Text style={styles.errorText}>{validationErrors.notes}</Text>
              )}
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
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    marginTop: 4,
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
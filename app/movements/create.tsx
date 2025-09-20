import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/providers/AuthProvider';
import { apiService, CreateMovementRequest } from '@/services/api';
import { FormValidator, CommonSchemas, InputSanitizer } from '@/utils/inputValidation';
import { ButtonLoading, useAsyncOperation } from '@/utils/loadingState';

function CreateMovementScreenContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  
  // Use the new loading state utilities
  const { execute: executeSubmit, isLoading: isSubmitting } = useAsyncOperation();
  const [formData, setFormData] = useState({
    itemCode: '',
    description: '',
    quantity: '',
    location: '',
    reference: '',
    notes: '',
    type: 'IN' as 'IN' | 'OUT' | 'TRANSFER'
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});

  const handleInputChange = (field: string, value: string) => {
    // Sanitize input based on field type
    let sanitizedValue = value;
    if (field === 'itemCode') {
      sanitizedValue = InputSanitizer.sanitizeMaterialCode(value);
    } else if (field === 'quantity') {
      // Allow typing but don't sanitize until blur for better UX
      sanitizedValue = value;
    } else {
      sanitizedValue = InputSanitizer.sanitizeString(value);
    }

    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFieldBlur = (field: string) => {
    setFieldTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate individual field on blur
    const fieldValue = formData[field as keyof typeof formData];
    let isValid = true;
    let errorMessage = '';

    if (field === 'itemCode' && fieldValue) {
      const result = FormValidator.validate({ itemCode: fieldValue }, { itemCode: CommonSchemas.materialMovement.itemCode });
      if (!result.isValid && result.errors.itemCode) {
        isValid = false;
        errorMessage = result.errors.itemCode;
      }
    } else if (field === 'quantity' && fieldValue) {
      // Sanitize quantity on blur
      const sanitizedQuantity = InputSanitizer.sanitizeQuantity(fieldValue);
      if (sanitizedQuantity !== null) {
        setFormData(prev => ({ ...prev, quantity: sanitizedQuantity.toString() }));
      }
      
      const result = FormValidator.validate({ quantity: fieldValue }, { quantity: CommonSchemas.materialMovement.quantity });
      if (!result.isValid && result.errors.quantity) {
        isValid = false;
        errorMessage = result.errors.quantity;
      }
    }

    if (!isValid) {
      setValidationErrors(prev => ({ ...prev, [field]: errorMessage }));
    }
  };

  const validateForm = () => {
    // Use comprehensive validation
    const validationResult = FormValidator.validate(formData, CommonSchemas.materialMovement);
    
    if (!validationResult.isValid) {
      setValidationErrors(validationResult.errors);
      // Mark all fields as touched to show errors
      const touchedFields = Object.keys(formData).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setFieldTouched(touchedFields);
      
      // Show first error in alert
      const firstError = Object.values(validationResult.errors)[0];
      Alert.alert(t('error'), firstError);
      return false;
    }
    
    return true;
  };

  const handleSubmit = () => {
    // Validate form
    if (!validateForm()) {
      return;
    }

    const quantity = parseFloat(formData.quantity);

    executeSubmit(async () => {
      const movementData: CreateMovementRequest = {
        type: formData.type,
        itemCode: formData.itemCode.trim(),
        quantity,
        location: formData.location.trim(),
        reference: formData.reference.trim(),
        notes: formData.notes.trim() || undefined
      };

      const response = await apiService.createMovement(movementData);
      
      if (response.success) {
        Alert.alert(
          t('common.success'),
          t('movements.create.success'),
          [
            {
              text: t('common.ok'),
              onPress: () => router.back()
            }
          ]
        );
      }
    }, {
      errorMessage: t('movements.create.error'),
      onError: (error) => {
        console.error('Create movement error:', error);
        let errorMessage = t('movements.create.error');
        if (error.message) {
          errorMessage = error.message;
        }
        Alert.alert(t('common.error'), errorMessage);
      }
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          {t('movements.create.title')}
        </ThemedText>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t('movements.item_code')} *</ThemedText>
            <TextInput
              style={[
                styles.input, 
                { 
                  borderColor: (fieldTouched.itemCode && validationErrors.itemCode) 
                    ? Colors[colorScheme ?? 'light'].destructive 
                    : Colors[colorScheme ?? 'light'].tabIconDefault 
                }
              ]}
              value={formData.itemCode}
              onChangeText={(value) => handleInputChange('itemCode', value)}
              onBlur={() => handleFieldBlur('itemCode')}
              placeholder={t('movements.create.item_code_placeholder')}
              placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
            />
            {fieldTouched.itemCode && validationErrors.itemCode && (
              <ThemedText style={styles.errorText}>{validationErrors.itemCode}</ThemedText>
            )}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t('movements.description')}</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder={t('movements.create.description_placeholder')}
              placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t('movements.quantity')} *</ThemedText>
            <TextInput
              style={[
                styles.input, 
                { 
                  borderColor: (fieldTouched.quantity && validationErrors.quantity) 
                    ? Colors[colorScheme ?? 'light'].destructive 
                    : Colors[colorScheme ?? 'light'].tabIconDefault 
                }
              ]}
              value={formData.quantity}
              onChangeText={(value) => handleInputChange('quantity', value)}
              onBlur={() => handleFieldBlur('quantity')}
              placeholder={t('movements.create.quantity_placeholder')}
              placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
              keyboardType="numeric"
            />
            {fieldTouched.quantity && validationErrors.quantity && (
              <ThemedText style={styles.errorText}>{validationErrors.quantity}</ThemedText>
            )}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t('movements.location')} *</ThemedText>
            <TextInput
              style={[
                styles.input, 
                { 
                  borderColor: (fieldTouched.location && validationErrors.location) 
                    ? Colors[colorScheme ?? 'light'].destructive 
                    : Colors[colorScheme ?? 'light'].tabIconDefault 
                }
              ]}
              value={formData.location}
              onChangeText={(value) => handleInputChange('location', value)}
              onBlur={() => handleFieldBlur('location')}
              placeholder={t('movements.create.location_placeholder')}
              placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
            />
            {fieldTouched.location && validationErrors.location && (
              <ThemedText style={styles.errorText}>{validationErrors.location}</ThemedText>
            )}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t('movements.reference')} *</ThemedText>
            <TextInput
              style={[
                styles.input, 
                { 
                  borderColor: (fieldTouched.reference && validationErrors.reference) 
                    ? Colors[colorScheme ?? 'light'].destructive 
                    : Colors[colorScheme ?? 'light'].tabIconDefault 
                }
              ]}
              value={formData.reference}
              onChangeText={(value) => handleInputChange('reference', value)}
              onBlur={() => handleFieldBlur('reference')}
              placeholder={t('movements.create.reference_placeholder')}
              placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
            />
            {fieldTouched.reference && validationErrors.reference && (
              <ThemedText style={styles.errorText}>{validationErrors.reference}</ThemedText>
            )}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t('movements.notes')}</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}
              value={formData.notes}
              onChangeText={(value) => handleInputChange('notes', value)}
              placeholder={t('movements.create.notes_placeholder')}
              placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>

          <ButtonLoading
            onPress={handleSubmit}
            isLoading={isSubmitting}
            style={[styles.button, styles.submitButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
            textStyle={styles.submitButtonText}
            loadingColor="#fff"
          >
            {t('movements.create.submit')}
          </ButtonLoading>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    // backgroundColor set dynamically
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default function CreateMovementScreen() {
  return (
    <AuthGuard>
      <CreateMovementScreenContent />
    </AuthGuard>
  );
}
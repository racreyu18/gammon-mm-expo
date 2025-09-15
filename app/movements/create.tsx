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
import ApiService, { CreateMovementRequest } from '@/services/apiService';

function CreateMovementScreenContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    itemCode: '',
    description: '',
    quantity: '',
    location: '',
    reference: '',
    notes: '',
    type: 'IN' as 'IN' | 'OUT' | 'TRANSFER'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.itemCode || !formData.quantity || !formData.location || !formData.reference) {
      Alert.alert(t('common.error'), t('movements.validation.required_fields'));
      return;
    }

    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert(t('common.error'), t('movements.validation.invalid_quantity'));
      return;
    }

    try {
      setIsSubmitting(true);
      
      const movementData: CreateMovementRequest = {
        type: formData.type,
        itemCode: formData.itemCode.trim(),
        quantity,
        location: formData.location.trim(),
        reference: formData.reference.trim(),
        notes: formData.notes.trim() || undefined
      };

      const response = await ApiService.createMovement(movementData);
      
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
    } catch (error: any) {
      console.error('Create movement error:', error);
      
      let errorMessage = t('movements.create.error');
      if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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
              style={[styles.input, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}
              value={formData.itemCode}
              onChangeText={(value) => handleInputChange('itemCode', value)}
              placeholder={t('movements.create.item_code_placeholder')}
              placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
            />
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
              style={[styles.input, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}
              value={formData.quantity}
              onChangeText={(value) => handleInputChange('quantity', value)}
              placeholder={t('movements.create.quantity_placeholder')}
              placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t('movements.location')} *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}
              value={formData.location}
              onChangeText={(value) => handleInputChange('location', value)}
              placeholder={t('movements.create.location_placeholder')}
              placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t('movements.reference')} *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}
              value={formData.reference}
              onChangeText={(value) => handleInputChange('reference', value)}
              placeholder={t('movements.create.reference_placeholder')}
              placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
            />
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

          <TouchableOpacity
            style={[styles.button, styles.submitButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>{t('movements.create.submit')}</Text>
            )}
          </TouchableOpacity>
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
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/providers/AuthProvider';
import { apiService } from '../services/api';
import { LoadingIndicator, useAsyncOperation } from '../utils/loadingState';

const { width, height } = Dimensions.get('window');

function ScanningScreenContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  
  // Use async operation hook for processing scan results
  const { executeAsync: executeScanProcessing, isLoading: isProcessing } = useAsyncOperation();

  const startScanning = () => {
    setIsScanning(true);
    // TODO: Implement actual camera scanning logic
    // For now, simulate scanning after 2 seconds
    setTimeout(() => {
      const mockBarcode = 'ITEM-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      setScannedData(mockBarcode);
      setIsScanning(false);
    }, 2000);
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  const handleScanResult = async () => {
    if (scannedData && !isProcessing) {
      await executeScanProcessing(async () => {
        // First, try to get item information from the API
        const itemResponse = await apiService.scanBarcode(scannedData);
        
        if (itemResponse.success && itemResponse.data) {
          const item = itemResponse.data;
          
          Alert.alert(
            t('scanning.item_found'),
            `${t('scanning.item_code')}: ${item.code}\n${t('scanning.description')}: ${item.description}\n${t('scanning.current_stock')}: ${item.stock || 0}`,
            [
              {
                text: t('scanning.scan_again'),
                onPress: () => {
                  setScannedData(null);
                  startScanning();
                }
              },
              {
                text: t('scanning.create_movement'),
                onPress: () => {
                  router.push({
                    pathname: '/movements/create',
                    params: { itemCode: item.code, description: item.description }
                  });
                }
              }
            ]
          );
        } else {
          // Item not found, show option to create new item or manual entry
          Alert.alert(
            t('scanning.item_not_found'),
            `${t('scanning.scanned_code')}: ${scannedData}\n${t('scanning.item_not_found_message')}`,
            [
              {
                text: t('scanning.scan_again'),
                onPress: () => {
                  setScannedData(null);
                  startScanning();
                }
              },
              {
                text: t('scanning.use_code_anyway'),
                onPress: () => {
                  router.push({
                    pathname: '/movements/create',
                    params: { itemCode: scannedData }
                  });
                }
              }
            ]
          );
        }
      }, {
        errorMessage: t('scanning.processing_error'),
        onError: (error) => {
          console.error('Barcode scan error:', error);
          
          // Fallback to basic scan result handling
          Alert.alert(
            t('scanning.result_title'),
            `${t('scanning.scanned_code')}: ${scannedData}`,
            [
              {
                text: t('scanning.scan_again'),
                onPress: () => {
                  setScannedData(null);
                  startScanning();
                }
              },
              {
                text: t('scanning.use_code'),
                onPress: () => {
                  router.push({
                    pathname: '/movements/create',
                    params: { itemCode: scannedData }
                  });
                }
              }
            ]
          );
        }
      });
    }
  };

  // Auto-process scan result when data is available
  useEffect(() => {
    if (scannedData && !isProcessing) {
      handleScanResult();
    }
  }, [scannedData]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityHint="Returns to the previous screen"
          accessibilityRole="button"
        >
          <IconSymbol name="chevron.left" size={24} color={Colors[colorScheme ?? 'light'].text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          {t('scanning.title')}
        </ThemedText>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.scanArea}>
        {!isScanning && !scannedData && (
          <View style={styles.scanPrompt}>
            <IconSymbol 
              name="qrcode.viewfinder" 
              size={120} 
              color={Colors[colorScheme ?? 'light'].tabIconDefault} 
            />
            <ThemedText style={styles.promptText}>
              {t('scanning.prompt')}
            </ThemedText>
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
              onPress={startScanning}
              accessibilityLabel="Start barcode scan"
              accessibilityHint="Opens camera to scan material barcodes"
              accessibilityRole="button"
            >
              <IconSymbol name="camera" size={24} color="#fff" />
              <Text style={styles.scanButtonText}>{t('scanning.start_scan')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isScanning && (
          <View style={styles.scanningView}>
            <View style={styles.scanFrame}>
              <View style={styles.scanCorner} />
              <View style={[styles.scanCorner, styles.topRight]} />
              <View style={[styles.scanCorner, styles.bottomLeft]} />
              <View style={[styles.scanCorner, styles.bottomRight]} />
            </View>
            <ThemedText style={styles.scanningText}>
              {t('scanning.scanning')}
            </ThemedText>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={stopScanning}
              accessibilityLabel="Cancel scan"
              accessibilityHint="Stops the current barcode scanning session"
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isProcessing && (
          <View style={styles.processingView}>
            <LoadingIndicator 
              message={t('scanning.processing')} 
              size="large"
              color={Colors[colorScheme ?? 'light'].tint}
            />
          </View>
        )}
      </View>

      <View style={styles.instructions}>
        <ThemedText style={styles.instructionTitle}>
          {t('scanning.instructions_title')}
        </ThemedText>
        <ThemedText style={styles.instructionText}>
          • {t('scanning.instruction_1')}
        </ThemedText>
        <ThemedText style={styles.instructionText}>
          • {t('scanning.instruction_2')}
        </ThemedText>
        <ThemedText style={styles.instructionText}>
          • {t('scanning.instruction_3')}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  scanPrompt: {
    alignItems: 'center',
  },
  promptText: {
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 24,
    opacity: 0.7,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scanningView: {
    alignItems: 'center',
    width: '100%',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
    marginBottom: 32,
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
    borderWidth: 3,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    top: 'auto',
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scanningText: {
    fontSize: 18,
    marginBottom: 24,
  },
  processingView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  instructions: {
    padding: 24,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.8,
  },
});

export default function ScanningScreen() {
  return (
    <AuthGuard>
      <ScanningScreenContent />
    </AuthGuard>
  );
}
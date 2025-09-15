import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CameraView, BarcodeScanningResult } from 'expo-camera';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOfflineCapable } from '../../hooks/useOffline';
import { adapters } from '@/adapters';

export default function ScanningScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const [isScanning, setIsScanning] = useState(false);
  const { isOnline, addToQueue } = useOfflineCapable();
  const [showCamera, setShowCamera] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const permission = await adapters.scanner.hasPermissions();
      setHasPermission(permission);
    })();
  }, []);

  const requestPermission = async () => {
    const permission = await adapters.scanner.requestPermissions();
    setHasPermission(permission);
    return permission;
  };

  const handleScanItem = async () => {
    if (isScanning) return;
    
    if (hasPermission === null) {
      return;
    }
    
    if (hasPermission === false) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          t('scanning.permission_denied_title'),
          t('scanning.permission_denied_message'),
          [{ text: t('common.ok') }]
        );
        return;
      }
    }
    
    setShowCamera(true);
  };

  const handleBarCodeScanned = ({ type, data }: BarcodeScanningResult) => {
    setShowCamera(false);
    setIsScanning(false);
    
    const result = adapters.scanner.processScanResult({ type, data } as BarcodeScanningResult);
    
    if (!isOnline) {
      addToQueue({
        type: 'SCAN_ITEM',
        payload: { barcode: result.value, type: result.type, timestamp: Date.now() },
        timestamp: Date.now()
      });
      Alert.alert(
        t('scanning.queued_title'),
        t('scanning.queued_scan_message', { code: result.value }),
        [{ text: t('common.ok') }]
      );
      return;
    }
    
    Alert.alert(
      t('scanning.scan_result_title'),
      t('scanning.scan_result_message', { code: result.value, type: result.type }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('scanning.process'), onPress: () => processScanResult(result) }
      ]
    );
  };

  const processScanResult = (result: { value: string; type: string }) => {
    // TODO: Process the scanned barcode (e.g., look up inventory item, create movement)
    console.log('Processing scan result:', result);
    Alert.alert(
      t('scanning.processing_title'),
      t('scanning.processing_message'),
      [{ text: t('common.ok') }]
    );
  };

  const closeCameraModal = () => {
    setShowCamera(false);
    setIsScanning(false);
  };

  const handleManualEntry = () => {
    Alert.alert(
      t('scanning.manual_entry_title'),
      t('scanning.manual_entry_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.ok'), onPress: () => console.log('Manual entry') }
      ]
    );
  };

  const handleBulkScan = () => {
    if (!isOnline) {
      addToQueue({
        type: 'BULK_SCAN',
        payload: { timestamp: Date.now() },
        timestamp: Date.now()
      });
      Alert.alert(
        t('scanning.queued_title'),
        t('scanning.queued_message'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    Alert.alert(
      t('scanning.bulk_scan_title'),
      t('scanning.bulk_scan_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.start'), onPress: () => console.log('Bulk scan started') }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
          {t('scanning.title')}
        </Text>
        <Text style={[styles.subtitle, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
          {t('scanning.subtitle')}
        </Text>
      </View>

      <View style={styles.scanningArea}>
        <View style={[styles.scanFrame, { borderColor: Colors[colorScheme ?? 'light'].tint }]}>
          <IconSymbol 
            size={80} 
            name={showCamera ? "camera.fill" : "qrcode.viewfinder"} 
            color={Colors[colorScheme ?? 'light'].tint} 
          />
          {showCamera && (
            <Text style={[styles.scanningText, { color: Colors[colorScheme ?? 'light'].tint }]}>
              {t('scanning.camera_active')}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.primaryButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={handleScanItem}
          disabled={showCamera || hasPermission === null}
        >
          <IconSymbol size={24} name="camera" color="white" />
          <Text style={styles.primaryButtonText}>
            {showCamera ? t('scanning.camera_active') : t('scanning.scan_item')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secondaryButton, { borderColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={handleManualEntry}
        >
          <IconSymbol size={24} name="keyboard" color={Colors[colorScheme ?? 'light'].tint} />
          <Text style={[styles.secondaryButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>
            {t('scanning.manual_entry')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secondaryButton, { borderColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={handleBulkScan}
        >
          <IconSymbol size={24} name="list.bullet" color={Colors[colorScheme ?? 'light'].tint} />
          <Text style={[styles.secondaryButtonText, { color: Colors[colorScheme ?? 'light'].tint }]}>
            {t('scanning.bulk_scan')}
          </Text>
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <View style={styles.offlineNotice}>
          <IconSymbol size={16} name="wifi.slash" color="#F59E0B" />
          <Text style={styles.offlineText}>
            {t('scanning.offline_notice')}
          </Text>
        </View>
      )}

      <Modal
        visible={showCamera}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: adapters.scanner.getSupportedBarcodeTypes(),
            }}
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraHeader}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeCameraModal}
                >
                  <IconSymbol size={24} name="xmark" color="white" />
                </TouchableOpacity>
                <Text style={styles.cameraTitle}>
                  {t('scanning.camera_title')}
                </Text>
                <View style={styles.placeholder} />
              </View>
              
              <View style={styles.scanningFrame}>
                <View style={styles.scanningFrameBorder} />
              </View>
              
              <View style={styles.cameraFooter}>
                <Text style={styles.cameraInstructions}>
                  {t('scanning.camera_instructions')}
                </Text>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  scanningArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderRadius: 20,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
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
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scanningFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningFrameBorder: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  cameraFooter: {
    paddingHorizontal: 20,
    paddingBottom: 60,
    alignItems: 'center',
  },
  cameraInstructions: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
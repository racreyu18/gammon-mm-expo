import { ScannerAdapter, ScanResult, ScannerType } from '@gammon/shared-core';
import { Camera, CameraView, BarcodeScanningResult } from 'expo-camera';

export class ExpoScannerAdapter implements ScannerAdapter {
  async requestPermissions(): Promise<boolean> {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === 'granted';
  }

  async hasPermissions(): Promise<boolean> {
    const { status } = await Camera.getCameraPermissionsAsync();
    return status === 'granted';
  }

  async scanBarcode(options?: { types?: string[] }): Promise<{ value: string; type: string } | undefined> {
    // This method is called by the scanning screen after barcode detection
    // The actual scanning is handled by the CameraView component
    throw new Error('Use scanBarcode method with CameraView component for actual scanning');
  }

  // Helper method to convert Expo barcode types to our ScannerType
  private mapBarCodeType(type: string): ScannerType {
    switch (type) {
      case 'qr':
        return 'qr';
      case 'pdf417':
        return 'pdf417';
      case 'aztec':
        return 'aztec';
      case 'ean13':
      case 'ean8':
      case 'upc_a':
      case 'upc_e':
      case 'code39':
      case 'code93':
      case 'code128':
      case 'codabar':
      case 'itf14':
        return 'barcode';
      default:
        return 'barcode';
    }
  }

  // Helper method to process scan results
  processScanResult(result: BarcodeScanningResult): { value: string; type: string } {
    return {
      value: result.data,
      type: result.type,
    };
  }

  // Helper method to get supported barcode types
  getSupportedBarcodeTypes(): string[] {
    return [
      'qr',
      'pdf417',
      'aztec',
      'ean13',
      'ean8',
      'upc_a',
      'upc_e',
      'code39',
      'code93',
      'code128',
      'code39mod43',
      'codabar',
      'datamatrix',
      'interleaved2of5',
      'itf14',
    ];
  }

  // Method to validate if a barcode type is supported
  isBarcodeTypeSupported(type: string): boolean {
    return this.getSupportedBarcodeTypes().includes(type.toLowerCase());
  }
}
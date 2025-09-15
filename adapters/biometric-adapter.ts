import { BiometricAdapter, BiometricType } from '@gammon/shared-core';
import * as LocalAuthentication from 'expo-local-authentication';

export class ExpoBiometricAdapter implements BiometricAdapter {
  async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  async getSupportedTypes(): Promise<BiometricType[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const supportedTypes: BiometricType[] = [];

      types.forEach(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            supportedTypes.push('fingerprint');
            break;
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            supportedTypes.push('face');
            break;
          case LocalAuthentication.AuthenticationType.IRIS:
            supportedTypes.push('iris');
            break;
        }
      });

      return supportedTypes;
    } catch (error) {
      console.error('Error getting supported biometric types:', error);
      return [];
    }
  }

  async authenticate(options?: {
    promptMessage?: string;
    cancelLabel?: string;
    fallbackLabel?: string;
  }): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options?.promptMessage || 'Authenticate to continue',
        cancelLabel: options?.cancelLabel || 'Cancel',
        fallbackLabel: options?.fallbackLabel || 'Use Passcode',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Error during biometric authentication:', error);
      return false;
    }
  }

  async hasHardware(): Promise<boolean> {
    try {
      return await LocalAuthentication.hasHardwareAsync();
    } catch (error) {
      console.error('Error checking biometric hardware:', error);
      return false;
    }
  }

  async isEnrolled(): Promise<boolean> {
    try {
      return await LocalAuthentication.isEnrolledAsync();
    } catch (error) {
      console.error('Error checking biometric enrollment:', error);
      return false;
    }
  }

  async getSecurityLevel(): Promise<'none' | 'biometric' | 'device_credential' | 'biometric_strong' | 'biometric_weak'> {
    try {
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
      
      switch (securityLevel) {
        case LocalAuthentication.SecurityLevel.NONE:
          return 'none';
        case LocalAuthentication.SecurityLevel.SECRET:
          return 'device_credential';
        case LocalAuthentication.SecurityLevel.BIOMETRIC:
          return 'biometric';
        default:
          return 'none';
      }
    } catch (error) {
      console.error('Error getting security level:', error);
      return 'none';
    }
  }
}
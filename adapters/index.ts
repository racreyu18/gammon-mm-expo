// Export all adapter implementations for Expo
export * from './auth-adapter';
export * from './storage-adapter';
export * from './push-adapter';
export * from './scanner-adapter';
export * from './network-adapter';
export * from './biometric-adapter';
export * from './updates-adapter';

// Adapter registry for dependency injection
import { AuthAdapter, StorageAdapter, PushAdapter, ScannerAdapter, NetworkAdapter, BiometricAdapter, UpdatesAdapter } from '@gammon/shared-core';
import { ExpoAuthAdapter } from './auth-adapter';
import { ExpoStorageAdapter } from './storage-adapter';
import { ExpoPushAdapter } from './push-adapter';
import { ExpoScannerAdapter } from './scanner-adapter';
import { ExpoNetworkAdapter } from './network-adapter';
import { ExpoBiometricAdapter } from './biometric-adapter';
import { ExpoUpdatesAdapter } from './updates-adapter';

export interface AdapterRegistry {
  auth: AuthAdapter;
  storage: StorageAdapter;
  push: PushAdapter;
  scanner: ScannerAdapter;
  network: NetworkAdapter;
  biometric: BiometricAdapter;
  updates: UpdatesAdapter;
}

// Create adapter instances
export const createAdapterRegistry = (): AdapterRegistry => ({
  auth: new ExpoAuthAdapter(),
  storage: new ExpoStorageAdapter(),
  push: new ExpoPushAdapter(),
  scanner: new ExpoScannerAdapter(),
  network: new ExpoNetworkAdapter(),
  biometric: new ExpoBiometricAdapter(),
  updates: new ExpoUpdatesAdapter(),
});

// Default adapter registry instance
export const adapters = createAdapterRegistry();
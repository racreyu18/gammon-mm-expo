import { StorageAdapter } from '@gammon/shared-core';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class ExpoStorageAdapter implements StorageAdapter {
  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      throw new Error(`Failed to store secure item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSecureItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn(`Failed to get secure item ${key}:`, error);
      return null;
    }
  }

  async removeSecureItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(`Failed to remove secure item ${key}:`, error);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      throw new Error(`Failed to store item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get item ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove item ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
      // Note: SecureStore doesn't have a clear all method
      // Individual secure items need to be removed manually
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.warn('Failed to get all keys:', error);
      return [];
    }
  }

  async multiGet(keys: string[]): Promise<Array<[string, string | null]>> {
    try {
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.warn('Failed to get multiple items:', error);
      return keys.map(key => [key, null]);
    }
  }

  async multiSet(keyValuePairs: Array<[string, string]>): Promise<void> {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      throw new Error(`Failed to set multiple items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.warn('Failed to remove multiple items:', error);
    }
  }
}
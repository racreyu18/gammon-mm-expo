import { NetworkAdapter, ConnectionType } from '@gammon/shared-core';
import NetInfo from '@react-native-community/netinfo';

export class ExpoNetworkAdapter implements NetworkAdapter {
  async isConnected(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected ?? false;
    } catch (error) {
      console.error('Error checking network connection:', error);
      return false;
    }
  }

  async getConnectionType(): Promise<ConnectionType> {
    try {
      const state = await NetInfo.fetch();
      
      if (!state.isConnected) {
        return 'none';
      }

      switch (state.type) {
        case 'wifi':
          return 'wifi';
        case 'cellular':
          return 'cellular';
        case 'ethernet':
          return 'ethernet';
        case 'bluetooth':
          return 'bluetooth';
        case 'wimax':
          return 'wimax';
        case 'vpn':
          return 'vpn';
        case 'other':
          return 'other';
        default:
          return 'unknown';
      }
    } catch (error) {
      console.error('Error getting connection type:', error);
      return 'unknown';
    }
  }

  onConnectionChange(callback: (connected: boolean) => void): () => void {
    const unsubscribe = NetInfo.addEventListener(state => {
      callback(state.isConnected ?? false);
    });

    return unsubscribe;
  }

  // Additional method to get detailed network info
  async getNetworkState() {
    try {
      return await NetInfo.fetch();
    } catch (error) {
      console.error('Error getting network state:', error);
      return null;
    }
  }

  // Method to refresh network state
  async refresh(): Promise<void> {
    try {
      await NetInfo.refresh();
    } catch (error) {
      console.error('Error refreshing network state:', error);
    }
  }
}
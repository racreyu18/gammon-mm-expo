import { UpdatesAdapter, UpdateInfo } from '@gammon/shared-core';
import * as Updates from 'expo-updates';

export class ExpoUpdatesAdapter implements UpdatesAdapter {
  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      if (!Updates.isEnabled) {
        console.warn('Updates are not enabled in this build');
        return null;
      }

      const update = await Updates.checkForUpdateAsync();
      
      if (!update.isAvailable) {
        return null;
      }

      return {
        isAvailable: true,
        version: update.manifest?.version || 'unknown',
        description: update.manifest?.extra?.updateDescription || 'New update available',
        isMandatory: update.manifest?.extra?.isMandatory || false,
        downloadSize: update.manifest?.extra?.downloadSize,
      };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return null;
    }
  }

  async downloadUpdate(): Promise<boolean> {
    try {
      if (!Updates.isEnabled) {
        console.warn('Updates are not enabled in this build');
        return false;
      }

      const result = await Updates.fetchUpdateAsync();
      return result.isNew;
    } catch (error) {
      console.error('Error downloading update:', error);
      return false;
    }
  }

  async applyUpdate(): Promise<void> {
    try {
      if (!Updates.isEnabled) {
        console.warn('Updates are not enabled in this build');
        return;
      }

      await Updates.reloadAsync();
    } catch (error) {
      console.error('Error applying update:', error);
      throw new Error(`Failed to apply update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCurrentVersion(): Promise<string> {
    try {
      if (!Updates.isEnabled) {
        // Return app version from manifest when updates are disabled
        return Updates.manifest?.version || '1.0.0';
      }

      const currentUpdate = await Updates.readLogEntriesAsync(1);
      if (currentUpdate.length > 0) {
        return currentUpdate[0].updateId || 'unknown';
      }

      return Updates.updateId || Updates.manifest?.version || '1.0.0';
    } catch (error) {
      console.error('Error getting current version:', error);
      return '1.0.0';
    }
  }

  async getLastCheckTime(): Promise<Date | null> {
    try {
      if (!Updates.isEnabled) {
        return null;
      }

      const logs = await Updates.readLogEntriesAsync(10);
      const checkLogs = logs.filter(log => 
        log.message.includes('Checking for update') || 
        log.message.includes('checkForUpdateAsync')
      );

      if (checkLogs.length > 0) {
        return new Date(checkLogs[0].timestamp);
      }

      return null;
    } catch (error) {
      console.error('Error getting last check time:', error);
      return null;
    }
  }

  async isUpdatePending(): Promise<boolean> {
    try {
      if (!Updates.isEnabled) {
        return false;
      }

      // Check if there's a downloaded update ready to be applied
      const logs = await Updates.readLogEntriesAsync(5);
      const downloadLogs = logs.filter(log => 
        log.message.includes('Update downloaded') || 
        log.message.includes('fetchUpdateAsync')
      );

      return downloadLogs.length > 0;
    } catch (error) {
      console.error('Error checking pending updates:', error);
      return false;
    }
  }

  async clearUpdateCache(): Promise<void> {
    try {
      if (!Updates.isEnabled) {
        console.warn('Updates are not enabled in this build');
        return;
      }

      // Expo Updates doesn't provide a direct cache clearing method
      // This would typically be handled by the Expo Updates service
      console.log('Update cache clearing is managed by Expo Updates service');
    } catch (error) {
      console.error('Error clearing update cache:', error);
    }
  }

  // Get update logs for debugging
  async getUpdateLogs(count: number = 10): Promise<any[]> {
    try {
      if (!Updates.isEnabled) {
        return [];
      }

      return await Updates.readLogEntriesAsync(count);
    } catch (error) {
      console.error('Error getting update logs:', error);
      return [];
    }
  }
}
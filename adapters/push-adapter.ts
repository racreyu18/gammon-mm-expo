import { PushAdapter, PushNotification } from '@gammon/shared-core';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export class ExpoPushAdapter implements PushAdapter {
  async requestPermissions(): Promise<boolean> {
    try {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          return false;
        }
        
        // Configure Android notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }
        
        return true;
      } else {
        console.warn('Must use physical device for Push Notifications');
        return false;
      }
    } catch (error) {
      console.error('Error requesting push permissions:', error);
      return false;
    }
  }

  async getDeviceToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for Push Notifications');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      return token.data;
    } catch (error) {
      console.error('Error getting device token:', error);
      return null;
    }
  }

  async scheduleNotification(notification: PushNotification): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: notification.sound ? 'default' : false,
        },
        trigger: notification.scheduledTime ? {
          date: new Date(notification.scheduledTime),
        } : null,
      });
      
      return identifier;
    } catch (error) {
      throw new Error(`Failed to schedule notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.warn(`Failed to cancel notification ${notificationId}:`, error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.warn('Failed to cancel all notifications:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.warn('Failed to get badge count:', error);
      return 0;
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.warn('Failed to set badge count:', error);
    }
  }

  onNotificationReceived(callback: (notification: PushNotification) => void): () => void {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const pushNotification: PushNotification = {
        id: notification.request.identifier,
        title: notification.request.content.title || '',
        body: notification.request.content.body || '',
        data: notification.request.content.data,
        sound: !!notification.request.content.sound,
      };
      
      callback(pushNotification);
    });

    return () => subscription.remove();
  }

  onNotificationOpened(callback: (notification: PushNotification) => void): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const pushNotification: PushNotification = {
        id: response.notification.request.identifier,
        title: response.notification.request.content.title || '',
        body: response.notification.request.content.body || '',
        data: response.notification.request.content.data,
        sound: !!response.notification.request.content.sound,
      };
      
      callback(pushNotification);
    });

    return () => subscription.remove();
  }
}
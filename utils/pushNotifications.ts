import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '../api/client';

export async function registerForPushNotifications(): Promise<void> {
  console.log('[Push] appOwnership:', Constants.appOwnership);
  if (Constants.appOwnership === 'expo') return;
  try {
    const Notifications = await import('expo-notifications');
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[Push] permission status:', existingStatus);
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    console.log('[Push] final status:', finalStatus);
    if (finalStatus !== 'granted') return;
    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;
    console.log('[Push] projectId:', projectId);
    if (!projectId) return;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[Push] token:', tokenData.data);
    const res = await api.savePushToken(tokenData.data);
    console.log('[Push] save result:', JSON.stringify(res));
  } catch (e) {
    console.log('[Push] ERROR:', String(e));
  }
}

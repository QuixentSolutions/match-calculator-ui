import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getItem, deleteItem } from '../utils/storage';
import { useState } from 'react';
import { api } from '../api/client';
import { User } from '../types';
import { AuthContext } from '../context/auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.savePushToken(tokenData.data);
  } catch {
    // non-critical — app works fine without push notifications
  }
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    (async () => {
      const stored = await getItem('token');
      if (stored) {
        const res = await api.getMe();
        if (res.success && res.data?.user) {
          setToken(stored);
          setUser(res.data.user);
          registerForPushNotifications();
        } else {
          await deleteItem('token');
        }
      }
      setReady(true);
      SplashScreen.hideAsync();
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inAuth = (segments[0] as string) === '(auth)';

    if (!token) {
      if (!inAuth) router.replace('/(auth)/login');
    } else if (!user?.name) {
      router.replace('/(auth)/profile');
    } else {
      if (inAuth) {
        // Re-verify storage — catches logout where token state hasn't cleared yet
        getItem('token').then((stored) => {
          if (!stored) {
            setToken(null);
            setUser(null);
          } else {
            router.replace('/(main)/home');
          }
        });
      }
    }
  }, [ready, token, user, segments]);

  if (!ready) return null;

  return (
    <AuthContext.Provider value={{ user, setToken, setUser }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </AuthContext.Provider>
  );
}

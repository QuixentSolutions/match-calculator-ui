import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../../constants/theme';

export default function JoinDeepLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        // User is logged in → go to Connect tab with code pre-filled
        router.replace({ pathname: '/(main)/home', params: { code } });
      } else {
        // Not logged in → go to login, store code to use after auth
        await SecureStore.setItemAsync('pendingJoinCode', code ?? '');
        router.replace('/(auth)/login');
      }
    })();
  }, [code, router]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});

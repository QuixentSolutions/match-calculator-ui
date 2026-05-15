import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.code}>404</Text>
      <Text style={styles.title}>Page not found</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(main)/home')}>
        <Text style={styles.btnText}>Go to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: Spacing.xl },
  code: { fontSize: 64, fontWeight: FontWeight.extrabold, color: Colors.primary, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.lg, color: Colors.textSecondary, marginBottom: Spacing.xl },
  btn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: 40, ...Shadow.lg },
  btnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold },
});

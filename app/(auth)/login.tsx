import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, Alert, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../../api/client';
import { Colors, FontSize, FontWeight } from '../../constants/theme';

export default function LoginScreen() {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSendOtp() {
    if (!/^\d{10}$/.test(mobile)) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    const res = await api.sendOtp(mobile);
    setLoading(false);
    if (res.success) {
      router.push({ pathname: '/(auth)/otp', params: { mobile } });
    } else {
      Alert.alert('Error', res.message ?? 'Failed to send OTP. Try again.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Ansora</Text>
          <Text style={styles.subtitle}>
            A private space for two people to{'\n'}discover their compatibility
          </Text>
        </View>

        {/* Input */}
        <View style={styles.inputRow}>
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>+91</Text>
          </View>
          <View style={styles.divider} />
          <TextInput
            style={styles.input}
            placeholder="Enter mobile number"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            maxLength={10}
            value={mobile}
            onChangeText={setMobile}
          />
        </View>

        <Text style={styles.hint}>We'll send a 6-digit verification code</Text>

        {/* Button */}
        <View style={styles.btnWrap}>
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSendOtp}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{loading ? 'Sending…' : 'Continue'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  scroll: {
    flexGrow: 1,
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },

  header: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 90, height: 90, marginBottom: 16 },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  prefix: { paddingRight: 12 },
  prefixText: { fontSize: FontSize.md, color: '#111', fontWeight: FontWeight.medium },
  divider: { width: 1, height: 20, backgroundColor: '#E5E7EB', marginRight: 12 },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: '#111',
    paddingVertical: 0,
  },

  hint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 28,
  },

  btnWrap: { alignItems: 'center' },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});

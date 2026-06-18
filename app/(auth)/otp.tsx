import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet,
  Alert, ScrollView, StatusBar,
  NativeSyntheticEvent, TextInputKeyPressEventData,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { setItem } from '../../utils/storage';
import { api } from '../../api/client';
import { useAuth } from '../../context/auth';
import { registerForPushNotifications } from '../../utils/pushNotifications';
import { Colors, FontSize, FontWeight } from '../../constants/theme';

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const { mobile } = useLocalSearchParams<{ mobile: string }>();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);
  const router = useRouter();
  const { setToken, setUser } = useAuth();

  async function verify(digits: string[]) {
    const code = digits.join('');
    if (code.length !== OTP_LENGTH) {
      Alert.alert('Incomplete OTP', 'Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    const res = await api.verifyOtp(mobile, code);
    setLoading(false);
    if (res.success && res.data) {
      await setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      registerForPushNotifications();
      const pendingCode = await SecureStore.getItemAsync('pendingJoinCode');
      if (pendingCode && res.data.profileComplete) {
        await SecureStore.deleteItemAsync('pendingJoinCode');
        router.replace({ pathname: '/(main)/home', params: { code: pendingCode } });
      } else {
        router.replace(res.data.profileComplete ? '/(main)/home' : '/(auth)/profile');
      }
    } else {
      Alert.alert('Incorrect OTP', res.message ?? 'Invalid or expired OTP. Try again.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    }
  }

  function handleChange(value: string, index: number) {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length > 1) {
      const filled = cleaned.slice(0, OTP_LENGTH).split('');
      const next = Array(OTP_LENGTH).fill('');
      filled.forEach((d, i) => { next[i] = d; });
      setOtp(next);
      inputs.current[Math.min(filled.length - 1, OTP_LENGTH - 1)]?.focus();
      if (filled.length === OTP_LENGTH) verify(next);
      return;
    }
    const digit = cleaned.slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    } else if (digit && index === OTP_LENGTH - 1) {
      inputs.current[index]?.blur();
      verify(next);
    }
  }

  function handleKeyPress(e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleResend() {
    const res = await api.sendOtp(mobile);
    if (res.success) {
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } else {
      Alert.alert('Error', res.message ?? 'Failed to resend OTP.');
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
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Verify Your Number</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.mobile}>+91 {mobile}</Text>
          </Text>
        </View>

        {/* OTP boxes */}
        <Text style={styles.codeLabel}>Verification Code</Text>
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { inputs.current[i] = ref; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(v) => handleChange(v, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={i === 0 ? OTP_LENGTH : 1}
              selectTextOnFocus
              textAlign="center"
            />
          ))}
        </View>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendLink}>Resend</Text>
          </TouchableOpacity>
        </View>

        {/* Button */}
        <View style={styles.btnWrap}>
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={() => verify(otp)}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{loading ? 'Verifying…' : 'Verify & Continue'}</Text>
          </TouchableOpacity>
        </View>

        {/* Back */}
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backText}>← Change number</Text>
        </TouchableOpacity>
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

  header: { alignItems: 'center', marginBottom: 36 },
  logo: { width: 90, height: 90, marginBottom: 16 },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  mobile: { color: Colors.primary, fontWeight: FontWeight.bold },

  codeLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: FontWeight.medium,
    textAlign: 'center',
    marginBottom: 16,
  },

  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  otpBox: {
    width: 44,
    height: 54,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: '#111',
    backgroundColor: '#fff',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    padding: 0,
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    color: Colors.primary,
  },

  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  resendLabel: { fontSize: 13, color: '#6B7280' },
  resendLink: { fontSize: 13, color: Colors.primary, fontWeight: FontWeight.bold },

  btnWrap: { alignItems: 'center', marginBottom: 20 },
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

  backRow: { alignItems: 'center' },
  backText: { fontSize: 13, color: '#9CA3AF' },
});

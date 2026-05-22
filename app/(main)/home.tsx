import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, ScrollView, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { ActiveMatch } from '../../types';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '../../constants/theme';

const CODE_LENGTH = 6;
const CODE_TTL = 10 * 60; // 10 min in seconds

export default function ConnectScreen() {
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(true);

  // Your code panel
  const [myCode, setMyCode] = useState('');
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Partner code panel
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const inputs = useRef<(TextInput | null)[]>([]);

  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await api.getMatches();
      if (res.success && res.data && res.data.matches.length > 0) {
        setActiveMatch(res.data.matches[0]);
      }
      setLoadingMatch(false);
    })();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!codeExpiry) return;
    const tick = () => {
      const s = Math.max(0, Math.floor((codeExpiry.getTime() - Date.now()) / 1000));
      setSecondsLeft(s);
      if (s === 0) setMyCode('');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [codeExpiry]);

  async function handleGenerateCode() {
    setGeneratingCode(true);
    const res = await api.generateCode();
    setGeneratingCode(false);
    if (res.success && res.data) {
      setMyCode(res.data.code);
      setCodeExpiry(new Date(res.data.expiresAt));
    }
  }

  function formatTimer(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  function formatCode(code: string) {
    return code.slice(0, 3) + ' ' + code.slice(3);
  }

  // OTP-style digit input handlers
  function handleDigitChange(value: string, index: number) {
    const cleaned = value.replace(/[^0-9]/g, '');

    if (cleaned.length > 1) {
      const filled = cleaned.slice(0, CODE_LENGTH).split('');
      const next = Array(CODE_LENGTH).fill('');
      filled.forEach((d, i) => { next[i] = d; });
      setDigits(next);
      inputs.current[Math.min(filled.length - 1, CODE_LENGTH - 1)]?.focus();
      if (filled.length === CODE_LENGTH) submitCode(next);
      return;
    }

    const digit = cleaned.slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setConnectError('');

    if (digit && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus();
    else if (digit && index === CODE_LENGTH - 1) { inputs.current[index]?.blur(); submitCode(next); }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function submitCode(codeDigits: string[]) {
    const code = codeDigits.join('');
    if (code.length < CODE_LENGTH) return;
    setConnecting(true);
    setConnectError('');
    const res = await api.connectByCode(code);
    setConnecting(false);
    if (res.success) {
      router.replace('/(main)/matches');
    } else {
      setConnectError(res.message ?? 'Invalid or expired code. Please try again.');
      setDigits(Array(CODE_LENGTH).fill(''));
      inputs.current[0]?.focus();
    }
  }

  if (loadingMatch) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logoImg} resizeMode="cover" />
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Connect</Text>
          <Text style={styles.headerSub}>Link up with your partner</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {activeMatch ? (
          <View style={styles.connectedCard}>
            <View style={styles.connectedIcon}>
              <Ionicons name="heart" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.connectedTitle}>You're Connected!</Text>
            <Text style={styles.connectedSub}>
              Partner: <Text style={styles.connectedName}>{activeMatch.partner?.name ?? 'Your Partner'}</Text>
            </Text>
            <TouchableOpacity
              style={styles.goBtn}
              onPress={() => router.push('/(main)/matches')}
              activeOpacity={0.85}
            >
              <Text style={styles.goBtnText}>Go to Match</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Your Connect Code */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Your Connect Code</Text>
              <Text style={styles.sectionDesc}>
                Generate a 6-digit code and share it with your partner. Valid for 10 minutes.
              </Text>

              {myCode && secondsLeft > 0 ? (
                <>
                  <View style={styles.codeDisplay}>
                    <Text style={styles.codeText}>{formatCode(myCode)}</Text>
                  </View>
                  <View style={styles.timerRow}>
                    <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.timerText}>Expires in {formatTimer(secondsLeft)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.refreshBtn}
                    onPress={handleGenerateCode}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                    <Text style={styles.refreshBtnText}>Generate New Code</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.generateBtn, generatingCode && styles.generateBtnDisabled]}
                  onPress={handleGenerateCode}
                  disabled={generatingCode}
                  activeOpacity={0.85}
                >
                  {generatingCode
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Ionicons name="key-outline" size={18} color="#fff" />
                        <Text style={styles.generateBtnText}>Generate Code</Text>
                      </>}
                </TouchableOpacity>
              )}
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Enter Partner's Code */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Enter Partner's Code</Text>
              <Text style={styles.sectionDesc}>Ask your partner for their 6-digit code and enter it below.</Text>

              <View style={styles.digitsRow}>
                {digits.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => { inputs.current[i] = r; }}
                    style={[styles.digitBox, d ? styles.digitBoxFilled : null]}
                    value={d}
                    onChangeText={(v) => handleDigitChange(v, i)}
                    onKeyPress={(e) => handleKeyPress(e.nativeEvent.key, i)}
                    keyboardType="number-pad"
                    maxLength={i === 0 ? CODE_LENGTH : 1}
                    selectTextOnFocus
                    textAlign="center"
                    editable={!connecting}
                  />
                ))}
              </View>

              {connecting && (
                <View style={styles.connectingRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.connectingText}>Connecting…</Text>
                </View>
              )}

              {!!connectError && (
                <Text style={styles.errorText}>{connectError}</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingTop: 52, paddingBottom: 20, paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  logoWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  logoImg: { width: 38, height: 38, borderRadius: 8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#fff' },
  headerSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  scroll: { padding: Spacing.lg, paddingBottom: 100 },

  connectedCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', gap: 10, ...Shadow.md,
  },
  connectedIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  connectedTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  connectedSub: { fontSize: FontSize.md, color: Colors.textSecondary },
  connectedName: { color: Colors.primary, fontWeight: FontWeight.bold },
  goBtn: {
    marginTop: Spacing.sm, backgroundColor: Colors.primary,
    borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: 40, ...Shadow.lg,
  },
  goBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold },

  sectionCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.lg, ...Shadow.md,
  },
  sectionLabel: {
    fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
  },
  sectionDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 20 },

  codeDisplay: {
    backgroundColor: Colors.primaryLight, borderRadius: Radius.lg,
    paddingVertical: 20, alignItems: 'center', marginBottom: Spacing.sm,
    borderWidth: 2, borderColor: Colors.primary + '40',
  },
  codeText: {
    fontSize: 40, fontWeight: FontWeight.extrabold,
    color: Colors.primary, letterSpacing: 8,
  },
  timerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    justifyContent: 'center', marginBottom: Spacing.md,
  },
  timerText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
  },
  refreshBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },

  generateBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 14, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8, ...Shadow.lg,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: Spacing.lg, gap: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted },

  digitsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  digitBox: {
    width: 40, height: 54, borderRadius: Radius.md,
    borderWidth: 2, borderColor: '#BDBDBD',
    backgroundColor: '#FFFFFF',
    fontSize: FontSize.xxl, fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    padding: 0,
    ...Shadow.sm,
  },
  digitBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },

  connectingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 4,
  },
  connectingText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },

  errorText: {
    marginTop: Spacing.xs, fontSize: FontSize.sm,
    color: Colors.error, textAlign: 'center', lineHeight: 20,
  },
});

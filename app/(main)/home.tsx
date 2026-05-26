import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, ScrollView, Image, Share, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { api } from '../../api/client';
import { ActiveMatch } from '../../types';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '../../constants/theme';

const CODE_LENGTH = 6;

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

  // QR share
  const qrRef = useRef<ViewShot>(null);

  // QR scanner
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanLock = useRef(false);

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

  async function handleShare() {
    if (!myCode) return;
    try {
      const uri = await qrRef.current?.capture?.();
      if (uri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your Ansora connect code',
        });
        return;
      }
    } catch {}
    // Fallback to text share if image capture fails
    await Share.share({
      message: `Here's my Ansora connect code: ${formatCode(myCode)}\n\nEnter it in the Ansora app to connect with me!`,
    });
  }

  async function handleGenerateCode() {
    setGeneratingCode(true);
    const res = await api.generateCode();
    setGeneratingCode(false);
    if (res.success && res.data) {
      setMyCode(res.data.code);
      setCodeExpiry(new Date(res.data.expiresAt));
    }
  }

  async function handleOpenScanner() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    scanLock.current = false;
    setScannerOpen(true);
  }

  const handleScan = useCallback(async ({ data }: { data: string }) => {
    if (scanLock.current) return;
    const code = data.trim().replace(/\s/g, '');
    if (!/^\d{6}$/.test(code)) return;
    scanLock.current = true;
    setScannerOpen(false);
    setConnecting(true);
    setConnectError('');
    const res = await api.connectByCode(code);
    setConnecting(false);
    if (res.success) {
      router.replace('/(main)/matches');
    } else {
      setConnectError(res.message ?? 'Invalid or expired code. Please try again.');
    }
  }, [router]);

  function formatTimer(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  function formatCode(code: string) {
    return code.slice(0, 3) + ' ' + code.slice(3);
  }

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
                Generate a 6-digit code and share it with your partner. Valid for 24 hours.
              </Text>

              {myCode && secondsLeft > 0 ? (
                <>
                  {/* Shareable QR card */}
                  <ViewShot ref={qrRef} options={{ format: 'png', quality: 1 }}>
                    <View style={styles.qrCard}>
                      <Text style={styles.qrCardBrand}>Ansora</Text>
                      <View style={styles.qrBox}>
                        <QRCode value={myCode} size={180} color={Colors.primary} backgroundColor="#fff" />
                      </View>
                      <Text style={styles.qrCardCode}>{formatCode(myCode)}</Text>
                      <Text style={styles.qrCardHint}>Scan or enter code in Ansora app</Text>
                    </View>
                  </ViewShot>

                  <View style={styles.timerRow}>
                    <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.timerText}>Expires in {formatTimer(secondsLeft)}</Text>
                  </View>

                  <View style={styles.codeActionsRow}>
                    <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
                      <Ionicons name="share-social-outline" size={18} color="#fff" />
                      <Text style={styles.shareBtnText}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.refreshBtn} onPress={handleGenerateCode} activeOpacity={0.8}>
                      <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                      <Text style={styles.refreshBtnText}>New Code</Text>
                    </TouchableOpacity>
                  </View>
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
              <Text style={styles.sectionDesc}>Type their 6-digit code or scan their QR code.</Text>

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

              <TouchableOpacity
                style={styles.scanBtn}
                onPress={handleOpenScanner}
                activeOpacity={0.85}
              >
                <Ionicons name="qr-code-outline" size={20} color={Colors.primary} />
                <Text style={styles.scanBtnText}>Scan QR Code</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* QR Scanner Modal */}
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScan}
          />

          {/* Viewfinder corners */}
          <View style={styles.scanCornerTL} />
          <View style={styles.scanCornerTR} />
          <View style={styles.scanCornerBL} />
          <View style={styles.scanCornerBR} />

          {/* Hint */}
          <View style={styles.aimHintWrap} pointerEvents="none">
            <Text style={styles.aimHint}>Align your partner's QR code inside the frame</Text>
          </View>

          {/* Close button */}
          <TouchableOpacity style={styles.scanCloseBtn} onPress={() => setScannerOpen(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const CORNER = 28;
const BORDER = 3;

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

  // QR shareable card
  qrCard: {
    backgroundColor: '#fff', borderRadius: Radius.xl,
    alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20,
    marginBottom: Spacing.sm, borderWidth: 1.5, borderColor: Colors.border,
    gap: 12,
  },
  qrCardBrand: {
    fontSize: FontSize.sm, fontWeight: FontWeight.bold,
    color: Colors.primary, letterSpacing: 2, textTransform: 'uppercase',
  },
  qrBox: {
    padding: 14, backgroundColor: '#fff', borderRadius: Radius.lg,
    borderWidth: 2, borderColor: Colors.primaryLight,
  },
  qrCardCode: {
    fontSize: 32, fontWeight: FontWeight.extrabold,
    color: Colors.primary, letterSpacing: 6,
  },
  qrCardHint: {
    fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center',
  },

  timerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    justifyContent: 'center', marginBottom: Spacing.sm,
  },
  timerText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  codeActionsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 13, ...Shadow.sm,
  },
  shareBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  refreshBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: Radius.md, paddingVertical: 13,
    borderWidth: 2, borderColor: Colors.primary,
  },
  refreshBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },

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

  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: Spacing.md, paddingVertical: 13,
    borderRadius: Radius.md, borderWidth: 2, borderColor: Colors.primary,
  },
  scanBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },

  // Scanner modal
  scannerContainer: { flex: 1, backgroundColor: '#000' },

  scanCornerTL: {
    position: 'absolute', top: '25%', left: '15%',
    width: CORNER, height: CORNER,
    borderTopWidth: BORDER, borderLeftWidth: BORDER,
    borderColor: '#fff', borderTopLeftRadius: 6,
  },
  scanCornerTR: {
    position: 'absolute', top: '25%', right: '15%',
    width: CORNER, height: CORNER,
    borderTopWidth: BORDER, borderRightWidth: BORDER,
    borderColor: '#fff', borderTopRightRadius: 6,
  },
  scanCornerBL: {
    position: 'absolute', bottom: '25%', left: '15%',
    width: CORNER, height: CORNER,
    borderBottomWidth: BORDER, borderLeftWidth: BORDER,
    borderColor: '#fff', borderBottomLeftRadius: 6,
  },
  scanCornerBR: {
    position: 'absolute', bottom: '25%', right: '15%',
    width: CORNER, height: CORNER,
    borderBottomWidth: BORDER, borderRightWidth: BORDER,
    borderColor: '#fff', borderBottomRightRadius: 6,
  },

  aimHintWrap: {
    position: 'absolute', bottom: '20%', left: 0, right: 0, alignItems: 'center',
  },
  aimHint: {
    color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
  },

  scanCloseBtn: {
    position: 'absolute', top: 52, right: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
});

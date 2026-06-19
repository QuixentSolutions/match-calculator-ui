import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, Modal, KeyboardAvoidingView, Platform, ScrollView, StatusBar, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { api } from '../../api/client';
import { useAuth } from '../../context/auth';
import { deleteItem } from '../../utils/storage';
import { Gender, User } from '../../types';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '../../constants/theme';
import Constants from 'expo-constants';
import { PatternDecor } from '../../components/PatternBackground';

const AGE_OPTIONS = ['18–22', '23–27', '28–32', '33–37', '38–45', '45+'];
const AGE_MAP: Record<string, number> = {
  '18–22': 20, '23–27': 25, '28–32': 30, '33–37': 35, '38–45': 40, '45+': 47,
};

function ageToRange(age: number): string {
  if (age <= 22) return '18–22';
  if (age <= 27) return '23–27';
  if (age <= 32) return '28–32';
  if (age <= 37) return '33–37';
  if (age <= 45) return '38–45';
  return '45+';
}

export default function EditProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [cityFocused, setCityFocused] = useState(false);
  const [bioFocused, setBioFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const { setToken, setUser: clearAuthUser } = useAuth();

  useEffect(() => {
    (async () => {
      const res = await api.getMe();
      if (res.success && res.data) {
        const u = res.data.user;
        setUser(u);
        setName(u.name ?? '');
        setGender(u.gender ?? null);
        setAgeRange(u.age ? ageToRange(u.age) : null);
        setCity(u.city ?? '');
        setBio(u.bio ?? '');
        if (u.profileImage) setUser(u);
      }
      setLoading(false);
    })();
  }, []);

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;

    const asset = result.assets[0];
    const mimetype = asset.mimeType ?? 'image/jpeg';
    setUploadingImage(true);
    const res = await api.uploadProfileImage(asset.base64!, mimetype);
    setUploadingImage(false);
    if (res.success && res.data) {
      setUser(prev => prev ? { ...prev, profileImage: res.data!.profileImage } : prev);
    } else {
      Alert.alert('Error', res.message ?? 'Failed to upload image');
    }
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your name.'); return; }
    if (!gender) { Alert.alert('Required', 'Please select your gender.'); return; }
    if (!ageRange) { Alert.alert('Required', 'Please select your age range.'); return; }

    setSaving(true);
    const res = await api.saveProfile(name.trim(), gender, AGE_MAP[ageRange], city.trim(), bio.trim());
    setSaving(false);

    if (res.success) {
      Alert.alert('Saved', 'Your profile has been updated.');
    } else {
      Alert.alert('Error', res.message ?? 'Failed to update profile');
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await deleteItem('token');
    setToken(null);
    clearAuthUser(null);
    router.replace('/(auth)/login');
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    await api.deleteAccount();
    await deleteItem('token');
    setToken(null);
    clearAuthUser(null);
    router.replace('/(auth)/login');
  }

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PatternDecor />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} style={{ backgroundColor: '#FFF5F7' }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.logoWrap} onPress={() => router.replace('/(main)/home')} activeOpacity={0.8}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logoImg} resizeMode="cover" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]}>My Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.avatarCircle}>
            {uploadingImage ? (
              <ActivityIndicator color="#fff" />
            ) : user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditIcon}>✎</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarName}>{user?.name || 'Your Name'}</Text>
          <Text style={styles.avatarMobile}>+91 {user?.mobile}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, nameFocused && styles.inputFocused]}
            placeholder="Enter your full name"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
          />

          <Text style={styles.label}>I am a</Text>
          <View style={styles.genderRow}>
            {([
              { value: 'male', label: 'Man', symbol: 'M' },
              { value: 'female', label: 'Woman', symbol: 'F' },
            ] as { value: Gender; label: string; symbol: string }[]).map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.genderCard, gender === g.value && styles.genderCardActive]}
                onPress={() => setGender(g.value)}
                activeOpacity={0.8}
              >
                <View style={[styles.genderSymbolWrap, gender === g.value && styles.genderSymbolWrapActive]}>
                  <Text style={[styles.genderSymbol, gender === g.value && styles.genderSymbolActive]}>
                    {g.symbol}
                  </Text>
                </View>
                <Text style={[styles.genderLabel, gender === g.value && styles.genderLabelActive]}>
                  {g.label}
                </Text>
                {gender === g.value && (
                  <View style={styles.genderCheck}>
                    <Text style={styles.genderCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Age Range</Text>
          <View style={styles.ageGrid}>
            {AGE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.ageChip, ageRange === opt && styles.ageChipActive]}
                onPress={() => setAgeRange(opt)}
                activeOpacity={0.8}
              >
                <Text style={[styles.ageChipText, ageRange === opt && styles.ageChipTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>City <Text style={styles.optionalTag}>(Optional)</Text></Text>
          <TextInput
            style={[styles.input, cityFocused && styles.inputFocused]}
            placeholder="e.g. Chennai, Mumbai"
            placeholderTextColor={Colors.textMuted}
            value={city}
            onChangeText={setCity}
            onFocus={() => setCityFocused(true)}
            onBlur={() => setCityFocused(false)}
          />

          <Text style={styles.label}>About Me <Text style={styles.optionalTag}>(Optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.inputMulti, bioFocused && styles.inputFocused]}
            placeholder="A short intro about yourself…"
            placeholderTextColor={Colors.textMuted}
            value={bio}
            onChangeText={(v) => setBio(v.slice(0, 200))}
            onFocus={() => setBioFocused(true)}
            onBlur={() => setBioFocused(false)}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.charCount}>{bio.length}/200</Text>

          {/* Info row */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Mobile: +91 {user?.mobile}</Text>
            <Text style={styles.infoNote}>Mobile number cannot be changed.</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>Save Changes</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => setShowLogoutModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => setShowDeleteModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.deleteBtnText}>Delete Account</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>
            v{Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
        </View>
      </ScrollView>

      {/* Logout confirmation modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconWrap}>
              <Text style={styles.modalIcon}>⚠</Text>
            </View>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMsg}>Are you sure you want to logout from Ansora?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalLogoutBtn, loggingOut && { opacity: 0.6 }]}
                onPress={handleLogout}
                disabled={loggingOut}
                activeOpacity={0.85}
              >
                {loggingOut
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalLogoutText}>Logout</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete account confirmation modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconWrap}>
              <Text style={styles.modalIcon}>🗑️</Text>
            </View>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalMsg}>
              This will permanently delete your account and all your data. This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalLogoutBtn, deleting && { opacity: 0.6 }]}
                onPress={handleDeleteAccount}
                disabled={deleting}
                activeOpacity={0.85}
              >
                {deleting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalLogoutText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flexGrow: 1, paddingBottom: 100 },

  header: {
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  logoWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  logoImg: { width: 38, height: 38, borderRadius: 8 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#fff' },

  avatarSection: {
    backgroundColor: Colors.primary, alignItems: 'center',
    paddingBottom: 32, paddingTop: 8,
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
    overflow: 'hidden',
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { color: '#fff', fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primary, borderWidth: 2, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarEditIcon: { color: '#fff', fontSize: 12 },
  avatarName: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  avatarMobile: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm, marginTop: 2 },

  form: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: -20, padding: Spacing.xl,
  },

  label: {
    fontSize: FontSize.xs, fontWeight: FontWeight.semibold,
    color: Colors.textSecondary, marginBottom: Spacing.sm,
    marginTop: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  optionalTag: { color: Colors.textMuted, fontWeight: FontWeight.medium, textTransform: 'none' as const },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, padding: 15,
    fontSize: FontSize.md, color: Colors.textPrimary, ...Shadow.sm,
  },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' as const },
  inputFocused: { borderColor: Colors.primary },
  charCount: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right' as const, marginTop: 4 },

  genderRow: { flexDirection: 'row', gap: 12 },
  genderCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, alignItems: 'center', borderWidth: 2, borderColor: Colors.border, ...Shadow.sm,
  },
  genderCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  genderSymbolWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm,
  },
  genderSymbolWrapActive: { backgroundColor: Colors.primary },
  genderSymbol: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.textMuted },
  genderSymbolActive: { color: '#fff' },
  genderLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  genderLabelActive: { color: Colors.primary },
  genderCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  genderCheckText: { color: '#fff', fontSize: 11, fontWeight: FontWeight.bold },

  ageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ageChip: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface, ...Shadow.sm,
  },
  ageChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  ageChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  ageChipTextActive: { color: Colors.primary },

  infoBox: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
    padding: Spacing.md, marginTop: Spacing.lg,
  },
  infoText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  infoNote: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },

  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.xl, ...Shadow.lg,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  logoutBtn: {
    borderWidth: 1.5, borderColor: Colors.error, borderRadius: Radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: Spacing.md,
  },
  logoutBtnText: { color: Colors.error, fontSize: FontSize.md, fontWeight: FontWeight.semibold },

  deleteBtn: {
    paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm,
  },
  deleteBtnText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textDecorationLine: 'underline' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalBox: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, width: '100%', alignItems: 'center',
    ...Shadow.lg,
  },
  modalIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.errorLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalIcon: { fontSize: 28 },
  modalTitle: {
    fontSize: FontSize.xl, fontWeight: FontWeight.bold,
    color: Colors.textPrimary, marginBottom: Spacing.sm,
  },
  modalMsg: {
    fontSize: FontSize.md, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl,
  },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center',
  },
  modalCancelText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  modalLogoutBtn: {
    flex: 1, backgroundColor: Colors.error,
    borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center',
  },
  modalLogoutText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#fff' },

  versionText: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
});

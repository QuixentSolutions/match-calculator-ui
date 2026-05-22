import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../../api/client';
import { useAuth } from '../../context/auth';
import { Gender } from '../../types';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '../../constants/theme';

const AGE_OPTIONS = ['18–22', '23–27', '28–32', '33–37', '38–45', '45+'];
const AGE_MAP: Record<string, number> = {
  '18–22': 20, '23–27': 25, '28–32': 30, '33–37': 35, '38–45': 40, '45+': 47,
};

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [cityFocused, setCityFocused] = useState(false);
  const [bioFocused, setBioFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your name.'); return; }
    if (!gender) { Alert.alert('Required', 'Please select your gender.'); return; }
    if (!ageRange) { Alert.alert('Required', 'Please select your age range.'); return; }

    setLoading(true);
    const res = await api.saveProfile(name.trim(), gender, AGE_MAP[ageRange], city.trim(), bio.trim());
    setLoading(false);

    if (res.success && res.data) {
      setUser(res.data.user);
      router.replace('/(main)/home');
    } else {
      Alert.alert('Error', res.message ?? 'Failed to save profile');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.headerStep}>STEP 1 OF 1</Text>
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <Text style={styles.headerSub}>Help others know the real you</Text>
        </View>

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

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Saving Profile…' : 'Continue  →'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flexGrow: 1 },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: 24, paddingBottom: 36,
    paddingHorizontal: Spacing.xl, alignItems: 'center',
  },
  headerStep: {
    fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)',
    fontWeight: FontWeight.semibold, letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold,
    color: '#fff', textAlign: 'center', marginBottom: Spacing.xs,
  },
  headerSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  form: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -20, padding: Spacing.xl, paddingBottom: 40,
  },

  label: {
    fontSize: FontSize.sm, fontWeight: FontWeight.semibold,
    color: Colors.textSecondary, marginBottom: Spacing.sm,
    marginTop: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  optionalTag: { color: Colors.textMuted, fontWeight: FontWeight.medium, textTransform: 'none' },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, padding: 15,
    fontSize: FontSize.md, color: Colors.textPrimary, ...Shadow.sm,
  },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' },
  inputFocused: { borderColor: Colors.primary },
  charCount: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },

  genderRow: { flexDirection: 'row', gap: 12 },
  genderCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, alignItems: 'center', borderWidth: 2, borderColor: Colors.border,
    ...Shadow.sm,
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

  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 17, alignItems: 'center', marginTop: Spacing.xl, ...Shadow.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});

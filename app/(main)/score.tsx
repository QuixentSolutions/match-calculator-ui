import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  ScrollView, TouchableOpacity, StatusBar, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../api/client';
import { ScoreResult } from '../../types';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '../../constants/theme';

interface ScoreConfig {
  label: string;
  color: string;
  bgColor: string;
  desc: string;
}

function getScoreConfig(score: number): ScoreConfig {
  if (score >= 85) return { label: 'Highly Compatible', color: Colors.primary, bgColor: Colors.primaryLight, desc: 'Exceptional alignment across values and lifestyle.' };
  if (score >= 70) return { label: 'Strong Match', color: '#C8102E', bgColor: '#FFF0F2', desc: 'Strong compatibility with well-matched values.' };
  if (score >= 55) return { label: 'Good Potential', color: Colors.warning, bgColor: Colors.warningLight, desc: 'Solid foundation with room to grow together.' };
  if (score >= 40) return { label: 'Some Common Ground', color: '#6B7280', bgColor: '#F3F4F6', desc: 'A few shared values worth exploring further.' };
  return { label: 'Different Outlooks', color: '#374151', bgColor: '#F9FAFB', desc: 'Significant differences in values and lifestyle.' };
}

export default function ScoreScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!matchId) { setError('No match specified'); setLoading(false); return; }
    (async () => {
      const res = await api.getScore(matchId);
      if (res.success && res.data) setScore(res.data);
      else setError(res.message ?? 'Score not available yet');
      setLoading(false);
    })();
  }, [matchId]);

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loaderText}>Calculating compatibility…</Text>
      </View>
    );
  }

  if (error || !score) {
    return (
      <View style={styles.errorWrap}>
        <View style={styles.errorIconWrap}>
          <Text style={styles.errorIconText}>–</Text>
        </View>
        <Text style={styles.errorTitle}>Not Ready Yet</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={() => router.back()}>
          <Text style={styles.errorBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const config = getScoreConfig(score.compatibility);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar barStyle="light-content" />

      {/* Standard header */}
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logoImg} resizeMode="cover" />
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Compatibility Score</Text>
          <Text style={styles.headerSub}>Your match result</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace('/(main)/home')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Home</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
      {/* Score Hero */}
      <View style={[styles.hero, { backgroundColor: config.bgColor }]}>
        <View style={[styles.scoreRing, { borderColor: config.color }]}>
          <Text style={[styles.scoreNumber, { color: config.color }]}>{score.compatibility}%</Text>
          <Text style={[styles.scoreUnit, { color: config.color }]}>match</Text>
        </View>

        <Text style={[styles.heroLabel, { color: config.color }]}>{config.label}</Text>
        <Text style={styles.heroDesc}>{config.desc}</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { num: score.totalQuestions, label: 'Questions' },
            { num: score.answeredByYou, label: 'You answered' },
            { num: score.answeredByPartner, label: 'Partner' },
          ].map((s, i) => (
            <View key={i} style={styles.statItem}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.statContent}>
                <Text style={[styles.statNum, { color: config.color }]}>{s.num}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Breakdown */}
      <View style={styles.breakdown}>
        <Text style={styles.sectionTitle}>Answer Breakdown</Text>

        {score.breakdown.map((item, i) => {
          const isMatch = item.yourOption === item.partnerOption;
          const pointColor =
            item.points >= 8 ? Colors.success :
            item.points >= 5 ? Colors.warning : Colors.error;

          return (
            <View key={item.questionId} style={styles.breakCard}>
              <View style={styles.breakHeader}>
                <View style={styles.breakQNum}>
                  <Text style={styles.breakQNumText}>Q{i + 1}</Text>
                </View>
                <Text style={styles.breakQ} numberOfLines={2}>{item.questionText}</Text>
                <View style={[styles.pointsBadge, { backgroundColor: pointColor + '18' }]}>
                  <Text style={[styles.pointsText, { color: pointColor }]}>{item.points}/10</Text>
                </View>
              </View>

              {isMatch ? (
                <View style={[styles.matchRow, { backgroundColor: Colors.successLight }]}>
                  <Text style={styles.matchIcon}>✓</Text>
                  <Text style={styles.matchText}>Both chose: {item.yourOption}</Text>
                </View>
              ) : (
                <View style={styles.answersRow}>
                  <View style={[styles.answerBox, { backgroundColor: Colors.primaryLight }]}>
                    <Text style={styles.answerWho}>You</Text>
                    <Text style={styles.answerVal}>{item.yourOption}</Text>
                  </View>
                  <View style={styles.vsCircle}>
                    <Text style={styles.vsText}>vs</Text>
                  </View>
                  <View style={[styles.answerBox, { backgroundColor: Colors.secondaryLight }]}>
                    <Text style={styles.answerWho}>Partner</Text>
                    <Text style={styles.answerVal}>{item.partnerOption}</Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(main)/home')}
          activeOpacity={0.85}
        >
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { color: Colors.textMuted, fontSize: FontSize.sm },

  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, backgroundColor: Colors.background },
  errorIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  errorIconText: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.primary },
  errorTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  errorMsg: { fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.xl },
  errorBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 32, paddingVertical: 14 },
  errorBtnText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.md },

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
  backBtn: { width: 40, alignItems: 'flex-end' },
  backBtnText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.9)', fontWeight: FontWeight.semibold },

  hero: { paddingTop: 28, paddingBottom: 32, paddingHorizontal: Spacing.xl, alignItems: 'center' },
  scoreRing: {
    width: 150, height: 150, borderRadius: 75, borderWidth: 6,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
    backgroundColor: Colors.surface, ...Shadow.sm,
  },
  scoreNumber: { fontSize: 48, fontWeight: FontWeight.extrabold, lineHeight: 54 },
  scoreUnit: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginTop: -4 },
  heroLabel: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  heroDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },

  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, width: '100%', ...Shadow.sm, overflow: 'hidden',
  },
  statItem: { flex: 1, flexDirection: 'row' },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  statContent: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statNum: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  breakdown: { padding: Spacing.lg, paddingBottom: 40 },
  sectionTitle: {
    fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md,
  },

  breakCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: 10, ...Shadow.sm,
  },
  breakHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: Spacing.sm },
  breakQNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  breakQNumText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primary },
  breakQ: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary, lineHeight: 20 },
  pointsBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0 },
  pointsText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  matchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8,
  },
  matchIcon: { color: Colors.success, fontWeight: FontWeight.bold },
  matchText: { fontSize: FontSize.sm, color: Colors.success, fontWeight: FontWeight.medium, flex: 1 },

  answersRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  answerBox: { flex: 1, borderRadius: Radius.md, padding: 10 },
  answerWho: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, marginBottom: 3 },
  answerVal: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium, lineHeight: 18 },
  vsCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center',
  },
  vsText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.bold },

  homeBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 17, alignItems: 'center', marginTop: Spacing.md, ...Shadow.lg,
  },
  homeBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});

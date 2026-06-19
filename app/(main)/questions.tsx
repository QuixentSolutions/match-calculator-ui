import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, StatusBar, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../api/client';
import { Question, ActiveMatch } from '../../types';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '../../constants/theme';
import PatternBackground from '../../components/PatternBackground';

export default function QuestionsScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [matchStatus, setMatchStatus] = useState<ActiveMatch | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [myCompleted, setMyCompleted] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!matchId) { router.back(); return; }
    (async () => {
      const [qRes, matchesRes] = await Promise.all([
        api.getQuestions(matchId),
        api.getMatches(),
      ]);

      if (qRes.success && qRes.data) {
        const qs = qRes.data.questions;
        setQuestions(qs);
        const allDone = qs.every((q) => q.answered);
        if (allDone) {
          setMyCompleted(true);
        } else {
          const first = qs.findIndex((q) => !q.answered);
          setCurrentIndex(first === -1 ? 0 : first);
        }
      } else {
        Alert.alert('Error', 'Could not load questions');
        router.back();
      }

      if (matchesRes.success && matchesRes.data) {
        const current = matchesRes.data.matches.find((m) => String(m.matchId) === matchId);
        if (current) setMatchStatus(current);
      }
      setLoading(false);
    })();
  }, [matchId]);

  useEffect(() => {
    if (questions[currentIndex]) setSelectedOption(questions[currentIndex].selectedOptionId);
  }, [currentIndex, questions]);

  async function refreshStatus() {
    setRefreshingStatus(true);
    const res = await api.getMatches();
    if (res.success && res.data) {
      const current = res.data.matches.find((m) => String(m.matchId) === matchId);
      if (current) setMatchStatus(current);
    }
    setRefreshingStatus(false);
  }

  async function handleSubmit() {
    if (!selectedOption) return;
    const question = questions[currentIndex];
    if (question.answered && question.selectedOptionId === selectedOption) { goNext(); return; }

    setSubmitting(true);
    const res = await api.submitAnswer(question._id, selectedOption, matchId ?? '');
    setSubmitting(false);

    if (res.success) {
      const updated = [...questions];
      updated[currentIndex] = { ...updated[currentIndex], answered: true, selectedOptionId: selectedOption };
      setQuestions(updated);

      if (res.data!.answered === res.data!.total) {
        // All my questions done — switch to completion view
        setMyCompleted(true);
        const statusRes = await api.getMatches();
        if (statusRes.success && statusRes.data) {
          const current = statusRes.data.matches.find((m) => String(m.matchId) === matchId);
          if (current) setMatchStatus(current);
        }
      } else {
        goNext();
      }
    } else {
      Alert.alert('Error', res.message ?? 'Failed to save answer');
    }
  }

  function goNext() {
    const next = questions.findIndex((q, i) => i > currentIndex && !q.answered);
    if (next !== -1) { setCurrentIndex(next); return; }
    const any = questions.findIndex((q) => !q.answered);
    if (any !== -1) setCurrentIndex(any);
  }

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loaderText}>Loading questions…</Text>
      </View>
    );
  }

  // ── Completion screen ──────────────────────────────────────────────────────
  if (myCompleted) {
    const total = matchStatus?.progress.totalQuestions ?? questions.length;
    const myCount = matchStatus?.progress.myAnswers ?? questions.length;
    const partnerCount = matchStatus?.progress.partnerAnswers ?? 0;
    const partnerName = matchStatus?.partner?.name ?? 'Your partner';
    const partnerDone = partnerCount >= total;
    const bothDone = partnerDone && myCount >= total;

    return (
      <PatternBackground>
        <StatusBar barStyle="light-content" />

        <View style={styles.header}>
          <TouchableOpacity style={styles.logoWrap} onPress={() => router.replace('/(main)/home')} activeOpacity={0.8}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logoImg} resizeMode="cover" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Compatibility Quiz</Text>
            <Text style={styles.headerSub}>Your responses are saved</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Full progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>

        <ScrollView contentContainerStyle={styles.completionScroll} showsVerticalScrollIndicator={false}>

          {/* Check hero */}
          <View style={styles.completionHero}>
            <View style={styles.checkCircle}>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
            <Text style={styles.completionTitle}>Your quiz is complete!</Text>
            <Text style={styles.completionSub}>
              All {total} questions answered and saved.
            </Text>
          </View>

          {/* Progress card */}
          <View style={styles.progressCard}>
            <Text style={styles.progressCardTitle}>Response Status</Text>

            <View style={styles.progressRow}>
              <View style={styles.progressLeft}>
                <View style={[styles.progressDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.progressName}>You</Text>
              </View>
              <View style={styles.progressRight}>
                <Text style={[styles.progressFraction, { color: Colors.success }]}>
                  {myCount}/{total}
                </Text>
                <View style={[styles.progressPill, { backgroundColor: Colors.successLight }]}>
                  <Text style={[styles.progressPillText, { color: Colors.success }]}>Done</Text>
                </View>
              </View>
            </View>

            <View style={styles.progressDivider} />

            <View style={styles.progressRow}>
              <View style={styles.progressLeft}>
                <View style={[styles.progressDot, {
                  backgroundColor: partnerDone ? Colors.success : Colors.warning,
                }]} />
                <Text style={styles.progressName}>{partnerName}</Text>
              </View>
              <View style={styles.progressRight}>
                <Text style={[styles.progressFraction, {
                  color: partnerDone ? Colors.success : Colors.warning,
                }]}>
                  {partnerCount}/{total}
                </Text>
                <View style={[styles.progressPill, {
                  backgroundColor: partnerDone ? Colors.successLight : Colors.warningLight,
                }]}>
                  <Text style={[styles.progressPillText, {
                    color: partnerDone ? Colors.success : Colors.warning,
                  }]}>
                    {partnerDone ? 'Done' : 'Pending'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action section */}
          {bothDone ? (
            <View style={styles.actionSection}>
              <View style={styles.readyBox}>
                <Text style={styles.readyTitle}>Score Ready</Text>
                <Text style={styles.readySub}>
                  Both of you have completed the quiz.{'\n'}Your compatibility result is available now.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.scoreBtn}
                onPress={() => router.replace({ pathname: '/(main)/score', params: { matchId } })}
                activeOpacity={0.85}
              >
                <Text style={styles.scoreBtnText}>View Compatibility Score</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionSection}>
              <View style={styles.waitBox}>
                <View style={styles.waitDotRow}>
                  <View style={[styles.waitDot, { backgroundColor: Colors.primary }]} />
                  <View style={[styles.waitDot, { backgroundColor: Colors.primaryLight, borderWidth: 1.5, borderColor: Colors.primary }]} />
                  <View style={[styles.waitDot, { backgroundColor: Colors.primaryLight, borderWidth: 1.5, borderColor: Colors.primary }]} />
                </View>
                <Text style={styles.waitTitle}>
                  Waiting for {partnerName}
                </Text>
                <Text style={styles.waitSub}>
                  {partnerName} has answered {partnerCount} of {total} questions.
                  {'\n'}You'll be notified when the score is ready.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.refreshBtn, refreshingStatus && styles.refreshBtnDisabled]}
                onPress={refreshStatus}
                disabled={refreshingStatus}
                activeOpacity={0.8}
              >
                {refreshingStatus
                  ? <ActivityIndicator color={Colors.primary} size="small" />
                  : <Text style={styles.refreshBtnText}>Check Status</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.homeBtn}
                onPress={() => router.replace('/(main)/home')}
                activeOpacity={0.85}
              >
                <Text style={styles.homeBtnText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </PatternBackground>
    );
  }

  // ── Quiz screen ────────────────────────────────────────────────────────────
  const question = questions[currentIndex];
  const answeredCount = questions.filter((q) => q.answered).length;
  const progress = answeredCount / questions.length;

  return (
    <PatternBackground>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.logoWrap} onPress={() => router.replace('/(main)/home')} activeOpacity={0.8}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logoImg} resizeMode="cover" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Compatibility Quiz</Text>
          <Text style={styles.headerSub}>{answeredCount} of {questions.length} answered</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as `${number}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.questionCard}>
          <View style={styles.questionNumBadge}>
            <Text style={styles.questionNumText}>Question {question.order}</Text>
          </View>
          <Text style={styles.questionText}>{question.text}</Text>
        </View>

        <View style={styles.options}>
          {question.options.map((opt, i) => {
            const selected = selectedOption === opt._id;
            return (
              <TouchableOpacity
                key={opt._id}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => setSelectedOption(opt._id)}
                activeOpacity={0.8}
              >
                <View style={[styles.optionIndex, selected && styles.optionIndexSelected]}>
                  <Text style={[styles.optionIndexText, selected && styles.optionIndexTextSelected]}>
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {opt.text}
                </Text>
                {selected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.navRow}>
          {currentIndex > 0 && (
            <TouchableOpacity style={styles.prevBtn} onPress={() => setCurrentIndex((i) => i - 1)}>
              <Text style={styles.prevBtnText}>← Previous</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, (!selectedOption || submitting) && styles.nextBtnDisabled]}
            disabled={!selectedOption || submitting}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.nextBtnText}>
                  {currentIndex === questions.length - 1 ? 'Finish' : 'Next →'}
                </Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.dots}>
          {questions.map((q, i) => (
            <TouchableOpacity key={i} onPress={() => setCurrentIndex(i)}>
              <View style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
                q.answered && i !== currentIndex && styles.dotAnswered,
              ]} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </PatternBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { color: Colors.textMuted, fontSize: FontSize.sm },

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
  backText: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  progressTrack: { height: 4, backgroundColor: Colors.primaryLight },
  progressFill: { height: 4, backgroundColor: Colors.primaryDark },

  // ── Completion styles ──
  completionScroll: { padding: Spacing.lg, paddingBottom: 48 },

  completionHero: { alignItems: 'center', paddingVertical: Spacing.xl },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.successLight,
    borderWidth: 3, borderColor: Colors.success,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  checkIcon: { fontSize: 36, color: Colors.success, fontWeight: FontWeight.bold },
  completionTitle: {
    fontSize: FontSize.xxl, fontWeight: FontWeight.bold,
    color: Colors.textPrimary, marginBottom: Spacing.xs, textAlign: 'center',
  },
  completionSub: {
    fontSize: FontSize.sm, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 20,
  },

  progressCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadow.sm,
  },
  progressCardTitle: {
    fontSize: FontSize.xs, fontWeight: FontWeight.bold,
    color: Colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: Spacing.md,
  },
  progressRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: Spacing.sm,
  },
  progressLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressDot: { width: 10, height: 10, borderRadius: 5 },
  progressName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  progressRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressFraction: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  progressPill: {
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3,
  },
  progressPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  progressDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },

  actionSection: { gap: 12 },

  readyBox: {
    backgroundColor: Colors.successLight, borderRadius: Radius.lg,
    padding: Spacing.lg, borderLeftWidth: 4, borderLeftColor: Colors.success,
  },
  readyTitle: {
    fontSize: FontSize.md, fontWeight: FontWeight.bold,
    color: Colors.success, marginBottom: 4,
  },
  readySub: { fontSize: FontSize.sm, color: Colors.success, lineHeight: 20 },

  scoreBtn: {
    backgroundColor: Colors.success, borderRadius: Radius.md,
    paddingVertical: 17, alignItems: 'center', ...Shadow.lg,
  },
  scoreBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  waitBox: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, alignItems: 'center', ...Shadow.sm,
    borderLeftWidth: 4, borderLeftColor: Colors.primary,
  },
  waitDotRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  waitDot: { width: 10, height: 10, borderRadius: 5 },
  waitTitle: {
    fontSize: FontSize.md, fontWeight: FontWeight.bold,
    color: Colors.textPrimary, marginBottom: Spacing.xs, textAlign: 'center',
  },
  waitSub: {
    fontSize: FontSize.sm, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 20,
  },

  refreshBtn: {
    borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: Radius.md, paddingVertical: 13,
    alignItems: 'center', height: 48, justifyContent: 'center',
  },
  refreshBtnDisabled: { opacity: 0.5 },
  refreshBtnText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },

  homeBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 17, alignItems: 'center', ...Shadow.lg,
  },
  homeBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  // ── Quiz styles ──
  scroll: { padding: Spacing.lg, paddingBottom: 40 },

  questionCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, marginBottom: Spacing.lg, ...Shadow.md,
  },
  questionNumBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 5, marginBottom: Spacing.md,
  },
  questionNumText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  questionText: {
    fontSize: FontSize.xl, fontWeight: FontWeight.bold,
    color: Colors.textPrimary, lineHeight: 30,
  },

  options: { gap: 12, marginBottom: Spacing.xl },
  option: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center',
    gap: 14, borderWidth: 2, borderColor: Colors.border, ...Shadow.sm,
  },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optionIndex: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  optionIndexSelected: { backgroundColor: Colors.primary },
  optionIndexText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textMuted },
  optionIndexTextSelected: { color: '#fff' },
  optionText: { flex: 1, fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22 },
  optionTextSelected: { color: Colors.primaryDark, fontWeight: FontWeight.semibold },
  checkmark: { fontSize: FontSize.md, color: Colors.primary, fontWeight: FontWeight.bold },

  navRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.lg },
  prevBtn: {
    flex: 1, borderRadius: Radius.md, paddingVertical: 15,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  prevBtnText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  nextBtn: {
    flex: 2, backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 15, alignItems: 'center', ...Shadow.lg,
  },
  nextBtnDisabled: { backgroundColor: Colors.border },
  nextBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 20 },
  dotAnswered: { backgroundColor: Colors.primaryMid },
});

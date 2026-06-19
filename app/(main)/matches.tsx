import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, FlatList, RefreshControl, StatusBar, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { getItem, setItem } from '../../utils/storage';
import { ActiveMatch } from '../../types';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '../../constants/theme';
import PatternBackground from '../../components/PatternBackground';

const SEEN_KEY = 'chat_seen_counts';

async function getSeenCounts(): Promise<Record<string, number>> {
  const raw = await getItem(SEEN_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

async function markSeen(matchId: string, count: number) {
  const seen = await getSeenCounts();
  seen[matchId] = count;
  await setItem(SEEN_KEY, JSON.stringify(seen));
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState<ActiveMatch[]>([]);
  const [seenCounts, setSeenCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchMatches = useCallback(async () => {
    const res = await api.getMatches();
    setMatches(res.success && res.data ? res.data.matches : []);
  }, []);

  useEffect(() => {
    (async () => {
      const [, seen] = await Promise.all([fetchMatches(), getSeenCounts()]);
      setSeenCounts(seen);
      setLoading(false);
    })();
    const interval = setInterval(fetchMatches, 15000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const [, seen] = await Promise.all([fetchMatches(), getSeenCounts()]);
    setSeenCounts(seen);
    setRefreshing(false);
  }, [fetchMatches]);

  const handleOpenChat = useCallback(async (match: ActiveMatch) => {
    const idStr = String(match.matchId);
    await markSeen(idStr, match.messageCount);
    setSeenCounts((prev) => ({ ...prev, [idStr]: match.messageCount }));
    router.push({
      pathname: '/(main)/chat',
      params: { matchId: idStr, partnerName: match.partner?.name ?? 'Partner' },
    });
  }, [router]);

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <PatternBackground>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.logoWrap} onPress={() => router.replace('/(main)/home')} activeOpacity={0.8}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logoImg} resizeMode="cover" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Matches</Text>
          <Text style={styles.headerSub}>
            {matches.length > 0
              ? `${matches.length} active connection${matches.length > 1 ? 's' : ''}`
              : 'No active matches yet'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={matches}
        keyExtractor={(item) => String(item.matchId)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={Colors.primary} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>–</Text>
            </View>
            <Text style={styles.emptyTitle}>No Active Matches</Text>
            <Text style={styles.emptySub}>
              Browse profiles on the Discover tab and send interest.{'\n'}
              Once someone accepts, your match will appear here.
            </Text>
            <TouchableOpacity
              style={styles.discoverBtn}
              onPress={() => router.push('/(main)/home')}
              activeOpacity={0.85}
            >
              <Text style={styles.discoverBtnText}>Go to Discover</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <MatchCard
            match={item}
            unreadCount={Math.max(0, item.messageCount - (seenCounts[String(item.matchId)] ?? 0))}
            onOpenChat={() => handleOpenChat(item)}
            router={router}
          />
        )}
      />
    </PatternBackground>
  );
}

function MatchCard({
  match, unreadCount, onOpenChat, router,
}: {
  match: ActiveMatch;
  unreadCount: number;
  onOpenChat: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const isFemale = match.partner?.gender === 'female';
  const avatarColor = isFemale ? Colors.primary : Colors.secondary;
  const initials = match.partner?.name
    ?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  const { myAnswers, partnerAnswers, totalQuestions } = match.progress;
  const myDone = myAnswers >= totalQuestions;
  const partnerDone = partnerAnswers >= totalQuestions;
  const allDone = myDone && partnerDone;
  const matchIdStr = String(match.matchId);

  return (
    <View style={styles.card}>
      {/* Partner info row */}
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.partnerName}>{match.partner?.name}</Text>
          <Text style={styles.partnerMeta}>
            {isFemale ? 'Female' : 'Male'}  ·  {match.partner?.age} yrs
          </Text>
        </View>
        <View style={[styles.statusBadge, allDone ? styles.badgeDone : styles.badgeActive]}>
          <Text style={[styles.statusBadgeText, allDone ? styles.badgeDoneText : styles.badgeActiveText]}>
            {allDone ? 'Score Ready' : 'Active'}
          </Text>
        </View>
      </View>

      {/* Quiz progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <View style={styles.progressLeft}>
            <View style={[styles.dot, { backgroundColor: myDone ? Colors.success : Colors.primary }]} />
            <Text style={styles.progressLabel}>You</Text>
          </View>
          <Text style={[styles.progressFraction, { color: myDone ? Colors.success : Colors.primary }]}>
            {myAnswers}/{totalQuestions}
          </Text>
          <View style={[styles.pill, { backgroundColor: myDone ? Colors.successLight : Colors.primaryLight }]}>
            <Text style={[styles.pillText, { color: myDone ? Colors.success : Colors.primary }]}>
              {myDone ? 'Done' : 'In Progress'}
            </Text>
          </View>
        </View>

        <View style={[styles.progressRow, { marginTop: 6 }]}>
          <View style={styles.progressLeft}>
            <View style={[styles.dot, { backgroundColor: partnerDone ? Colors.success : Colors.warning }]} />
            <Text style={styles.progressLabel}>{match.partner?.name?.split(' ')[0]}</Text>
          </View>
          <Text style={[styles.progressFraction, { color: partnerDone ? Colors.success : Colors.warning }]}>
            {partnerAnswers}/{totalQuestions}
          </Text>
          <View style={[styles.pill, { backgroundColor: partnerDone ? Colors.successLight : Colors.warningLight }]}>
            <Text style={[styles.pillText, { color: partnerDone ? Colors.success : Colors.warning }]}>
              {partnerDone ? 'Done' : 'Pending'}
            </Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.cardActions}>
        {/* Chat icon button with unread badge */}
        <TouchableOpacity style={styles.chatIconBtn} onPress={onOpenChat} activeOpacity={0.8}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.primary} />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {allDone ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push({ pathname: '/(main)/score', params: { matchId: matchIdStr } })}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>View Score</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, myDone && styles.primaryBtnWaiting]}
            onPress={() => {
              if (!myDone) router.push({ pathname: '/(main)/questions', params: { matchId: matchIdStr } });
            }}
            disabled={myDone}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {myDone ? 'Waiting for Partner' : 'Continue Quiz'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingTop: 56, paddingBottom: 20, paddingHorizontal: Spacing.lg,
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

  list: { padding: Spacing.lg, gap: 14, paddingBottom: 100 },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    overflow: 'hidden', ...Shadow.md,
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: Spacing.md,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  cardInfo: { flex: 1 },
  partnerName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  partnerMeta: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },

  statusBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeActive: { backgroundColor: Colors.primaryLight },
  badgeDone: { backgroundColor: Colors.successLight },
  statusBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  badgeActiveText: { color: Colors.primary },
  badgeDoneText: { color: Colors.success },

  progressSection: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  progressLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  progressFraction: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, minWidth: 34, textAlign: 'right' },
  pill: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: FontWeight.bold },

  cardActions: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
  },

  chatIconBtn: {
    width: 46, height: 46, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute', top: -6, right: -6,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#FF4757',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: Colors.surface,
  },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: FontWeight.bold },

  primaryBtn: {
    flex: 1, backgroundColor: Colors.primary,
    borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center',
  },
  primaryBtnWaiting: { backgroundColor: Colors.textMuted },
  primaryBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  emptyState: { paddingTop: 60, alignItems: 'center', gap: 12, paddingHorizontal: Spacing.lg },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyIconText: { fontSize: FontSize.xxl, color: Colors.primary, fontWeight: FontWeight.bold },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  emptySub: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  discoverBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 14, paddingHorizontal: 32, marginTop: Spacing.sm, ...Shadow.lg,
  },
  discoverBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold },
});

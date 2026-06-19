import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../api/client';
import { ChatMessage } from '../../types';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '../../constants/theme';
import { PatternDecor } from '../../components/PatternBackground';

export default function ChatScreen() {
  const { matchId, partnerName: partnerNameParam } = useLocalSearchParams<{
    matchId: string;
    partnerName: string;
  }>();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const partnerName = partnerNameParam ?? 'Partner';
  const listRef = useRef<FlatList>(null);
  const router = useRouter();

  const fetchMessages = useCallback(async () => {
    if (!matchId) return;
    const res = await api.getMessages(matchId);
    if (res.success && res.data) setMessages(res.data.messages);
  }, [matchId]);

  useEffect(() => {
    (async () => {
      const meRes = await api.getMe();
      if (meRes.success && meRes.data) setMyId(meRes.data.user._id);
      await fetchMessages();
      setLoading(false);
    })();

    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const res = await api.sendMessage(trimmed, matchId ?? '');
    setSending(false);
    if (res.success && res.data) {
      setText('');
      setMessages((prev) => [...prev, res.data!.message]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <PatternDecor />
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoWrap} onPress={() => router.replace('/(main)/home')} activeOpacity={0.8}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logoImg} resizeMode="cover" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{partnerName}</Text>
          <View style={styles.onlineDot} />
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      {/* Messages list */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: '#FFF5F7' }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <View style={styles.emptyChatIcon}>
              <Text style={styles.emptyChatIconText}>—</Text>
            </View>
            <Text style={styles.emptyChatTitle}>No messages yet</Text>
            <Text style={styles.emptyChatSub}>
              Say hello to {partnerName} while you wait{'\n'}for the quiz results.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.senderId._id === myId;
          const time = new Date(item.createdAt).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit',
          });
          return (
            <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
              {!isMe && (
                <View style={styles.msgAvatar}>
                  <Text style={styles.msgAvatarText}>
                    {(item.senderId.name?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                  {item.text}
                </Text>
                <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                  {time}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Type a message…"
          placeholderTextColor={Colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
          activeOpacity={0.85}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.sendBtnText}>Send</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
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
  headerCenter: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#fff' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  backBtn: { width: 40, alignItems: 'flex-end' },
  backText: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  messagesList: { padding: Spacing.md, gap: 10, paddingBottom: 16, flexGrow: 1 },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyChatIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyChatIconText: { fontSize: FontSize.xl, color: Colors.primary, fontWeight: FontWeight.bold },
  emptyChatTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  emptyChatSub: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },

  msgAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.secondary,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  msgAvatarText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  bubble: {
    maxWidth: '72%', borderRadius: Radius.lg, padding: Spacing.sm,
    paddingHorizontal: 14, ...Shadow.sm,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: Colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.65)' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.md,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    gap: 10,
  },
  input: {
    flex: 1, backgroundColor: '#FFFFFF',
    borderRadius: Radius.full, borderWidth: 2, borderColor: '#BDBDBD',
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: FontSize.md, color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 20, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center', minWidth: 64,
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});

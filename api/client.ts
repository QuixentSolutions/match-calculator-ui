import { getItem } from '../utils/storage';
import { ApiResponse, ActiveMatch, Question, ScoreResult, User, ChatMessage } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.quixentsolutions.com';

async function getToken(): Promise<string | null> {
  return getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json: ApiResponse<T> = await res.json();
  return json;
}

export const api = {
  // Auth
  sendOtp: (mobile: string) =>
    request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ mobile }) }),

  verifyOtp: (mobile: string, code: string) =>
    request<{ token: string; profileComplete: boolean; user: User }>(
      '/auth/verify-otp',
      { method: 'POST', body: JSON.stringify({ mobile, code }) },
    ),

  saveProfile: (name: string, gender: string, age: number, city?: string, bio?: string) =>
    request<{ user: User }>('/auth/profile', {
      method: 'POST',
      body: JSON.stringify({ name, gender, age, city, bio }),
    }),

  getMe: () => request<{ user: User }>('/auth/me'),

  // Match — connect by 6-digit code
  generateCode: () =>
    request<{ code: string; expiresAt: string }>('/match/generate-code', { method: 'POST' }),

  connectByCode: (code: string) =>
    request<{ matchId: string; partnerName: string | null }>('/match/connect-by-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  // Match — active
  getMatches: () => request<{ matches: ActiveMatch[] }>('/match/matches'),

  getQuestions: (matchId: string) =>
    request<{ matchId: string; questions: Question[] }>(`/match/questions?matchId=${matchId}`),

  submitAnswer: (questionId: string, optionId: string, matchId: string) =>
    request<{ answered: number; total: number }>('/match/answer', {
      method: 'POST',
      body: JSON.stringify({ questionId, optionId, matchId }),
    }),

  getScore: (matchId: string) => request<ScoreResult>(`/match/score?matchId=${matchId}`),

  // Chat
  getMessages: (matchId: string) =>
    request<{ messages: ChatMessage[]; matchId: string }>(`/match/messages?matchId=${matchId}`),

  sendMessage: (text: string, matchId: string) =>
    request<{ message: ChatMessage }>('/match/message', {
      method: 'POST',
      body: JSON.stringify({ text, matchId }),
    }),
};

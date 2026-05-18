import { getItem } from '../utils/storage';
import { ApiResponse, ActiveMatch, Question, ScoreResult, User, ChatMessage } from '../types';

const AUTH_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';
const MATCH_BASE_URL = process.env.EXPO_PUBLIC_MATCH_API_URL ?? 'http://localhost:5001';

async function getToken(): Promise<string | null> {
  return getItem('token');
}

async function request<T>(baseUrl: string, path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const json: ApiResponse<T> = await res.json();
  return json;
}

function authRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  return request<T>(AUTH_BASE_URL, path, options);
}

function matchRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  return request<T>(MATCH_BASE_URL, path, options);
}

export const api = {
  // Auth
  sendOtp: (mobile: string) =>
    authRequest('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ mobile }) }),

  verifyOtp: (mobile: string, code: string) =>
    authRequest<{ token: string; profileComplete: boolean; user: User }>(
      '/api/auth/verify-otp',
      { method: 'POST', body: JSON.stringify({ mobile, code }) },
    ),

  saveProfile: (name: string, gender: string, age: number, city?: string, bio?: string) =>
    authRequest<{ user: User }>('/api/auth/profile', {
      method: 'POST',
      body: JSON.stringify({ name, gender, age, city, bio }),
    }),

  getMe: () => authRequest<{ user: User }>('/api/auth/me'),

  // Match — connect by 6-digit code
  generateCode: () =>
    matchRequest<{ code: string; expiresAt: string }>('/match/generate-code', { method: 'POST' }),

  connectByCode: (code: string) =>
    matchRequest<{ matchId: string; partnerName: string | null }>('/match/connect-by-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  // Match — active
  getMatches: () => matchRequest<{ matches: ActiveMatch[] }>('/match/matches'),

  getQuestions: (matchId: string) =>
    matchRequest<{ matchId: string; questions: Question[] }>(`/match/questions?matchId=${matchId}`),

  submitAnswer: (questionId: string, optionId: string, matchId: string) =>
    matchRequest<{ answered: number; total: number }>('/match/answer', {
      method: 'POST',
      body: JSON.stringify({ questionId, optionId, matchId }),
    }),

  getScore: (matchId: string) => matchRequest<ScoreResult>(`/match/score?matchId=${matchId}`),

  // Chat
  getMessages: (matchId: string) =>
    matchRequest<{ messages: ChatMessage[]; matchId: string }>(`/match/messages?matchId=${matchId}`),

  sendMessage: (text: string, matchId: string) =>
    matchRequest<{ message: ChatMessage }>('/match/message', {
      method: 'POST',
      body: JSON.stringify({ text, matchId }),
    }),
};

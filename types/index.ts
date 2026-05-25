export type Gender = 'male' | 'female';
export type MatchStatus = 'requested' | 'accepted' | 'rejected' | 'complete';

export interface User {
  _id: string;
  mobile: string;
  name: string;
  gender: Gender;
  age: number;
  city: string;
  bio: string;
  profileImage?: string;
}

export type ProfileCard = Pick<User, '_id' | 'name' | 'age' | 'gender' | 'city' | 'bio'>;

export interface ChatMessage {
  _id: string;
  senderId: { _id: string; name: string };
  text: string;
  createdAt: string;
}

export interface Option {
  _id: string;
  text: string;
}

export interface Question {
  _id: string;
  text: string;
  order: number;
  options: Option[];
  answered: boolean;
  selectedOptionId: string | null;
}

export interface MatchRequest {
  _id: string;
  senderId: ProfileCard;
  receiverId: ProfileCard;
  status: MatchStatus;
  createdAt: string;
}

export interface ActiveMatch {
  matchId: string;
  status: MatchStatus;
  partner: Pick<User, 'name' | 'gender' | 'age'> | null;
  progress: {
    totalQuestions: number;
    myAnswers: number;
    partnerAnswers: number;
  };
  messageCount: number;
}

export interface ScoreBreakdown {
  questionId: string;
  questionText: string;
  yourOption: string;
  partnerOption: string;
  points: number;
}

export interface ScoreResult {
  compatibility: number;
  totalQuestions: number;
  answeredByYou: number;
  answeredByPartner: number;
  breakdown: ScoreBreakdown[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

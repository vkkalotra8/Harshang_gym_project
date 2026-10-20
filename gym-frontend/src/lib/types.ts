export interface User {
  id: number;
  username: string;
  email: string;
  goal?: string | null;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export type WorkoutType = 'strength' | 'bodyweight' | 'cardio';

export interface Workout {
  id: number;
  user_id: number;
  exercise: string;
  type: WorkoutType;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  duration_min: number | null;
  distance_km: number | null;
  points: number;
  logged_on: string;
  created_at: string;
}

export interface Badge {
  code: string;
  name: string;
  description: string;
  awarded_at?: string;
}

export interface WorkoutLogResponse {
  workout: Workout;
  newBadges: Badge[];
}

export interface StreakResponse {
  streak: number;
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly';

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  points: number;
  entries: number;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  type?: WorkoutType | null;
  leaderboard: LeaderboardEntry[];
}

export interface MyLeaderboardResponse {
  period: string;
  rank: number | null;
  user_id: number;
  username: string;
  points: number;
  entries: number;
}

export interface Post {
  id: number;
  user_id: number;
  username: string;
  body: string;
  image_url: string | null;
  likes: number;
  comments: number;
  liked_by_me: boolean;
  created_at: string;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  username: string;
  body: string;
  created_at: string;
}

export interface Group {
  id: number;
  name: string;
  goal: string | null;
  description: string | null;
  created_by: number | null;
  member_count: number;
  is_member: boolean;
  created_at: string;
}

export interface GroupLeaderboardResponse {
  group: {
    id: number;
    name: string;
  };
  period: LeaderboardPeriod;
  type: WorkoutType | null;
  leaderboard: LeaderboardEntry[];
}

export interface ApiErrorResponse {
  error: string;
  details?: string[];
}

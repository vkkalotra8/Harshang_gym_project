import { z } from 'zod';

export const GOAL_OPTIONS = [
  'Fat loss',
  'Muscle gain',
  'Powerlifting',
  'Running',
  'Calisthenics',
] as const;

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  username: z
    .string({ required_error: 'Username is required' })
    .trim()
    .min(3, 'Username must be between 3 and 30 characters')
    .max(30, 'Username must be between 3 and 30 characters')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username may only contain letters, numbers, and underscores'
    ),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address')
    .max(255, 'Email is too long'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long'),
  goal: z.string().optional().nullable(),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// Workout schemas matching backend limits
export const strengthWorkoutSchema = z.object({
  type: z.literal('strength'),
  exercise: z.string().trim().min(1, 'Exercise name is required').max(100),
  sets: z.coerce.number().int().min(1, 'Min 1 set').max(50, 'Max 50 sets'),
  reps: z.coerce
    .number()
    .int()
    .min(1, 'Min 1 rep')
    .max(100, 'Max 100 reps per set for strength'),
  weight_kg: z.coerce
    .number()
    .min(0, 'Weight must be non-negative')
    .max(600, 'Max 600 kg'),
  logged_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const bodyweightWorkoutSchema = z.object({
  type: z.literal('bodyweight'),
  exercise: z.string().trim().min(1, 'Exercise name is required').max(100),
  sets: z.coerce.number().int().min(1, 'Min 1 set').max(50, 'Max 50 sets'),
  reps: z.coerce
    .number()
    .int()
    .min(1, 'Min 1 rep')
    .max(500, 'Max 500 reps per set for bodyweight'),
  logged_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const cardioWorkoutSchema = z.object({
  type: z.literal('cardio'),
  exercise: z.string().trim().min(1, 'Exercise name is required').max(100),
  duration_min: z.coerce
    .number()
    .min(1, 'Min 1 minute')
    .max(600, 'Max 600 minutes'),
  distance_km: z.coerce
    .number()
    .min(0, 'Distance must be non-negative')
    .max(200, 'Max 200 km')
    .optional()
    .default(0),
  logged_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const workoutFormSchema = z.discriminatedUnion('type', [
  strengthWorkoutSchema,
  bodyweightWorkoutSchema,
  cardioWorkoutSchema,
]);

export type WorkoutFormData = z.infer<typeof workoutFormSchema>;

export const postSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Post body cannot be empty')
    .max(1000, 'Post body cannot exceed 1000 characters'),
});

export type PostFormData = z.infer<typeof postSchema>;

export const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(500, 'Comment cannot exceed 500 characters'),
});

export type CommentFormData = z.infer<typeof commentSchema>;

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Group name cannot be empty')
    .max(100, 'Group name is too long'),
  goal: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
});

export type GroupFormData = z.infer<typeof groupSchema>;

# GymCommunity API Backend

A production-quality REST API backend for **GymCommunity**, a gym community application featuring workout logging, daily/weekly/monthly leaderboards, a social feed with photo uploads, community groups, and automated milestone badges.

Built with Node.js (ES modules), Express 4, MySQL 8 (InnoDB), and Zod.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Setup Steps](#setup-steps)
3. [Scoring Rules in Plain Language](#scoring-rules-in-plain-language)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Example cURL Commands](#example-curl-commands)
6. [Running Tests](#running-tests)

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MySQL Server**: v8.0.16 or higher (InnoDB with `utf8mb4` support)

---

## Setup Steps

1. **Navigate to the backend directory**:
   ```bash
   cd gym-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your MySQL credentials and a 32+ character `JWT_SECRET`:
   ```bash
   cp .env.example .env
   ```

   Default `.env` settings (the frontend expects the API on port 4000):
   ```env
   PORT=4000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=gym_community
   JWT_SECRET=super_secret_jwt_key_that_is_at_least_32_characters_long_for_security
   CLIENT_ORIGIN=*
   ```

4. **Initialize Database and Schema** (optional manual step):
   `npm start` and `npm run dev` initialize the database automatically. You can also run it manually to create the database, tables, check constraints, foreign keys, and seed the default groups:
   ```bash
   npm run db:init
   ```

5. **Start the Application**:
   - Production mode:
     ```bash
     npm start
     ```
   - Development mode with auto-reload:
     ```bash
     npm run dev
     ```

---

## Scoring Rules in Plain Language

Workouts earn points the moment they are logged. Points are permanently written to `workouts.points` and never recalculated, ensuring historical integrity. A user's leaderboard score is the live sum of their workout points within a given time window.

### 1. Calculation Formulas
- **Strength workouts** (`sets`, `reps`, `weight_kg`):
  $$\text{Points} = \frac{\text{sets} \times \text{reps} \times \text{weight\_kg}}{50}$$
  *Example*: Bench press 4 sets of 8 reps with 60 kg = $\frac{4 \times 8 \times 60}{50} = 38.40$ points.
- **Bodyweight workouts** (`sets`, `reps`):
  $$\text{Points} = \frac{\text{sets} \times \text{reps}}{20}$$
  *Example*: Push-ups 3 sets of 20 reps = $\frac{3 \times 20}{20} = 3.00$ points.
- **Cardio workouts** (`duration_min`, `distance_km`):
  $$\text{Points} = (\text{duration\_min} \times 1) + (\text{distance\_km} \times 5)$$
  *Example*: Running 30 minutes for 5 km = $(30 \times 1) + (5 \times 5) = 55.00$ points. (Distance defaults to 0 if omitted).

### 2. Rounding & Display
- Each individual workout's points are rounded to **2 decimal places**.
- Leaderboard totals are displayed rounded to the nearest **whole number**, but users are ranked and sorted using the precise unrounded sum.

### 3. Anti-Cheat and Fairness Rules
- **1,000-Point Cap**: A single workout cannot exceed 1,000 points. Any attempt to log higher will be rejected with `400 Bad Request` ("Workout is too large to be realistic").
- **Daily Workout Limit**: A user can log at most **30 workouts per day**. The 31st workout is rejected with `429 Too Many Requests`.
- **Reps Ceiling**: Strength reps are capped between 1 and 100 per set; bodyweight reps can go up to 500.
- **Live Point Sums**: Deleting your own workout immediately drops your score on all leaderboards because totals are calculated via live SQL aggregation.

### 4. Leaderboard Periods (Calculated by Database)
- **Daily**: `logged_on = CURDATE()`
- **Weekly**: `logged_on >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)` (starts Monday)
- **Monthly**: `logged_on >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`

---

## API Endpoints Reference

All endpoints return JSON and errors follow `{ "error": "message" }`. Authenticated routes require an `Authorization: Bearer <token>` header.

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new user (`username`, `email`, `password`, `goal`) |
| `POST` | `/api/auth/login` | No | Authenticate user and receive a 7-day JWT token |
| `GET` | `/api/auth/me` | Yes | Get the authenticated user's profile |
| `POST` | `/api/workouts` | Yes | Log a workout, compute points, and award eligible badges |
| `GET` | `/api/workouts` | Yes | List workouts (latest 100, or filter by `?date=YYYY-MM-DD`) |
| `GET` | `/api/workouts/streak` | Yes | Get current consecutive workout days ending today or yesterday |
| `DELETE` | `/api/workouts/:id` | Yes | Delete own workout (lowers leaderboard score immediately) |
| `GET` | `/api/leaderboard` | No | Global leaderboard (`?period=daily\|weekly\|monthly&type=strength\|bodyweight\|cardio`) |
| `GET` | `/api/leaderboard/me` | Yes | Caller's rank and points for chosen period, even outside top 50 |
| `GET` | `/api/posts` | Yes | Fetch latest 50 feed posts with like & comment counts |
| `POST` | `/api/posts` | Yes | Create post with text `body` and optional `image` (multipart) |
| `POST` | `/api/posts/:id/like` | Yes | Toggle like on a post |
| `GET` | `/api/posts/:id/comments` | Yes | List all comments on a post |
| `POST` | `/api/posts/:id/comments` | Yes | Add a comment to a post |
| `DELETE` | `/api/posts/:id` | Yes | Delete own post and clean up associated image file |
| `GET` | `/api/groups` | Yes | List fitness groups with member counts and membership status |
| `POST` | `/api/groups` | Yes | Create a fitness group (creator automatically joins) |
| `POST` | `/api/groups/:id/join` | Yes | Join a group (idempotent, returns 204) |
| `POST` | `/api/groups/:id/leave` | Yes | Leave a group (idempotent, returns 204) |
| `GET` | `/api/groups/:id/leaderboard` | No | Public group leaderboard for current members |
| `GET` | `/api/badges` | No | List all badge definitions |
| `GET` | `/api/badges/me` | Yes | List caller's earned badges with timestamps |

---

## Example cURL Commands

### 1. Register a New User
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alex_fit",
    "email": "alex@example.com",
    "password": "StrongPassword123!",
    "goal": "Muscle Gain"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alex@example.com",
    "password": "StrongPassword123!"
  }'
```
*Save the returned `token` from this response to use in the following commands.*

### 3. Log a Workout
```bash
# Log a Strength Workout (Bench Press: 4 sets x 8 reps x 60 kg = 38.4 points)
curl -X POST http://localhost:4000/api/workouts \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "strength",
    "exercise": "Bench Press",
    "sets": 4,
    "reps": 8,
    "weight_kg": 60
  }'

# Log a Cardio Workout (Running: 30 min, 5 km = 55 points)
curl -X POST http://localhost:3000/api/workouts \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cardio",
    "exercise": "Running",
    "duration_min": 30,
    "distance_km": 5
  }'
```

### 4. Fetch the Leaderboard
```bash
# Fetch Global Weekly Leaderboard (Public)
curl -X GET "http://localhost:4000/api/leaderboard?period=weekly"

# Fetch Global Monthly Strength Leaderboard (Public)
curl -X GET "http://localhost:4000/api/leaderboard?period=monthly&type=strength"

# Fetch Caller's Personal Rank & Points (Authenticated)
curl -X GET "http://localhost:4000/api/leaderboard/me?period=weekly" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

### 5. Create a Post with Photo
```bash
curl -X POST http://localhost:4000/api/posts \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -F "body=Hit a new bench press PR today! 💪" \
  -F "image=@/path/to/workout_pic.jpg"
```

---

## Running Tests

Run the built-in Node.js test suite for scoring calculations, rounding behavior, and anti-cheat constraints:

```bash
npm test
```

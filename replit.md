# NP Coach - Swedish Nationella Prov Learning Platform

## Overview
A gamified learning platform for Swedish national exams (Nationella Prov, Åk 9). Students practice Matematik, Svenska, and Engelska with immediate feedback, AI coaching, XP rewards, streaks, and a leaderboard.

## Tech Stack
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + framer-motion + recharts
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Replit managed) + Drizzle ORM
- **Auth**: express-session + connect-pg-simple (cookie-based)

## Architecture
- `shared/schema.ts` – Drizzle schema (users, testResults, questions, dailyQuestions, dailyChallenges, versusChallenges)
- `shared/routes.ts` – API route type definitions
- `server/routes.ts` – All Express API routes
- `server/storage.ts` – Database interface (IStorage + DatabaseStorage)
- `server/seed-data.ts` – Initial seed questions (superseded by expanded database)
- `client/src/pages/` – Dashboard, Practice, Auth, Leaderboard, Home, DailyChallenge, Challenge (Versus Mode)
- `client/src/hooks/` – use-auth, use-test-results, use-questions

## Key Features

### Gamification
- **XP System**: +10 XP per correct answer, +50 XP per completed quiz, +20 XP for daily question (correct), +5 XP (wrong), +25–100 XP for daily challenge (score * 15 + 25)
- **Streak System**: Tracks consecutive practice days; resets if a day is missed; updated when daily challenge is completed
- **Levels**: XP thresholds (0, 100, 300, 600, 1000…) with progress bar
- **Leaderboard**: Top 10 users ranked by XP, shown at /leaderboard

### Daily Challenge
- 5 random questions per day (across all subjects/topics)
- Stored in `daily_challenges` DB table (per user, per date)
- Complete challenge → earn XP + update streak
- Dashboard shows "Daglig Utmaning" card with start button or completion status
- Full quiz flow at `/daily-challenge`: one question at a time, feedback after each, results screen at end
- `GET /api/daily-challenge` — fetch/create today's challenge
- `POST /api/daily-challenge/complete` — complete with score, awards XP + updates streak

### Quiz Flow
- Subjects: Matematik NP, Svenska NP, Engelska NP (Åk 9)
- Timer: 60-minute countdown with auto-submit
- Immediate per-question feedback with explanation
- Results page shows score, level (Risk F / E-nivå / C-nivå / A/B-nivå), and XP earned

### AI Coach
- After each quiz: analyzes incorrect answers, identifies weak topics, generates Swedish feedback and suggestions
- Endpoint: POST /api/ai/analyze

### Smart Practice Mode
- `/practice?mode=smart` – loads questions based on user's historically weakest topics
- Endpoint: GET /api/smart-practice

### Daily Question
- One random question per day per user
- Awards extra XP; tracks completion in `daily_questions` table

### Freemium
- Free users: 1 quiz per subject
- Premium: unlimited (simulated upgrade via PATCH /api/user/premium)

## API Routes
- `POST /api/auth/register` – Register (email, password, username)
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `PATCH /api/user/premium` – Upgrade to premium
- `GET /api/questions` – Fetch questions (subject, grade, limit, topics filters)
- `POST /api/test-results` – Save quiz result, awards XP + updates streak
- `GET /api/test-results` – User's results
- `GET /api/daily-question` – Get/create today's daily question
- `POST /api/daily-question/answer` – Submit daily answer, awards XP
- `GET /api/leaderboard` – Top users by XP
- `POST /api/ai/analyze` – AI analysis of a test result
- `GET /api/smart-practice` – Questions targeting weak topics
- `POST /api/versus` – Create a versus challenge (subject, numQuestions, timeLimit) → returns challenge with code
- `GET /api/versus/:code` – Get challenge data, questions, creator/opponent names
- `POST /api/versus/:code/join` – Opponent joins the challenge (sets opponent_id, status→active)
- `POST /api/versus/:code/submit` – Submit score + timeTaken; automatically determines winner when both finish; awards XP

### Versus Mode
- Create a challenge at `/versus`: pick subject, 5/10/20 questions, 2/3/5/10 min time limit
- A unique 6-char code is generated (e.g. D6L30B); shareable link: `/challenge/CODE`
- Both players get the exact same questions in the same order
- Each player completes the quiz independently with a countdown timer
- Winner: highest score wins; if tied → fastest time wins
- After both submit: full results screen (side-by-side scores, winner crown, XP earned)
- XP formula: score × 10 + 20 on completion
- Real-time polling (3s interval) in waiting view until opponent finishes

## Question Database (663 total questions)
- **Matematik**: 282 questions — topics: Procent, Algebra, Geometri, Sannolikhet, Statistik, Problemlösning, Funktioner, Bråk
- **Svenska**: 191 questions — topics: Läsförståelse, Grammatik, Meningsbyggnad, Ordkunskap, Textanalys
- **Engelska**: 190 questions — topics: Vocabulary, Grammar, Reading Comprehension, Sentence Completion, Synonyms
- Difficulty distribution: ~30% E (Easy), ~45% C (Medium), ~25% A (Hard)
- Quiz format: 5 Easy + 10 Medium + 5 Hard = 20 questions, topic-diverse, randomly selected each time

## Database Tables
- `users` – id, email, username, password, isPremium, xp, streak, lastPracticeDate, isAdmin, role
- `test_results` – id, userId, score, totalQuestions, level, subject, incorrectQuestions (jsonb), xpEarned, completedAt
- `questions` – id, subject, grade, topic, type, question_text, options (jsonb), correct_answer, explanation, difficulty
- `daily_questions` – id, userId, questionId, date, answered, correct, answeredAt
- `versus_challenges` – id, code (unique), creatorId, opponentId, subject, numQuestions, timeLimit, questionIds (jsonb), status (pending/active/completed), creatorScore, creatorTime, opponentScore, opponentTime, winnerId, createdAt

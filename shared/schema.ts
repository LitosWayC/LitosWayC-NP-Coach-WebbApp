import { pgTable, text, serial, integer, timestamp, jsonb, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().default(""),
  password: text("password").notNull(),
  isPremium: boolean("is_premium").default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  role: text("role").notNull().default("student"),
  xp: integer("xp").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  lastPracticeDate: date("last_practice_date"),
});

export const testResults = pgTable("test_results", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull().default(20),
  level: text("level").notNull(),
  subject: text("subject").notNull().default("Matematik"),
  incorrectQuestions: jsonb("incorrect_questions").$type<number[]>().default([]),
  xpEarned: integer("xp_earned").notNull().default(0),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  grade: text("grade").notNull(),
  topic: text("topic").notNull(),
  type: text("type").notNull(),
  questionText: text("question_text").notNull(),
  options: jsonb("options").$type<string[]>(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  difficulty: text("difficulty").notNull().default("C"),
});

export const dailyQuestions = pgTable("daily_questions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  questionId: integer("question_id").notNull(),
  date: date("date").notNull(),
  answered: boolean("answered").default(false),
  correct: boolean("correct"),
  answeredAt: timestamp("answered_at"),
});

export const dailyChallenges = pgTable("daily_challenges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: date("date").notNull(),
  questionIds: jsonb("question_ids").$type<number[]>().notNull().default([]),
  completed: boolean("completed").default(false),
  score: integer("score"),
  xpEarned: integer("xp_earned"),
  completedAt: timestamp("completed_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertTestResultSchema = createInsertSchema(testResults).omit({ id: true, completedAt: true, userId: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
export const insertDailyQuestionSchema = createInsertSchema(dailyQuestions).omit({ id: true, answeredAt: true });
export const insertDailyChallengeSchema = createInsertSchema(dailyChallenges).omit({ id: true, completedAt: true });

export const versusChallenges = pgTable("versus_challenges", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  creatorId: integer("creator_id").notNull(),
  opponentId: integer("opponent_id"),
  subject: text("subject").notNull(),
  numQuestions: integer("num_questions").notNull().default(10),
  timeLimit: integer("time_limit").notNull().default(300),
  questionIds: jsonb("question_ids").$type<number[]>().notNull().default([]),
  status: text("status").notNull().default("pending"),
  creatorScore: integer("creator_score"),
  creatorTime: integer("creator_time"),
  opponentScore: integer("opponent_score"),
  opponentTime: integer("opponent_time"),
  winnerId: integer("winner_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVersusChallengeSchema = createInsertSchema(versusChallenges).omit({ id: true, createdAt: true });
export type VersusChallenge = typeof versusChallenges.$inferSelect;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type TestResult = typeof testResults.$inferSelect;
export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type DailyQuestion = typeof dailyQuestions.$inferSelect;
export type InsertDailyQuestion = z.infer<typeof insertDailyQuestionSchema>;
export type DailyChallenge = typeof dailyChallenges.$inferSelect;

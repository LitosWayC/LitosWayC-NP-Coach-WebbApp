import { db } from "./db";
import { users, testResults, questions, dailyQuestions, dailyChallenges, versusChallenges } from "@shared/schema";
import type { InsertUser, User, InsertTestResult, TestResult, Question, InsertQuestion, DailyQuestion, DailyChallenge, VersusChallenge } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  createTestResult(result: InsertTestResult): Promise<TestResult>;
  getTestResultsByUserId(userId: number): Promise<TestResult[]>;

  getQuestions(subject?: string, grade?: string, limit?: number): Promise<Question[]>;
  getQuizQuestions(subject: string, grade: string): Promise<Question[]>;
  getQuestionsByIds(ids: number[]): Promise<Question[]>;
  insertQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: number, updates: Partial<InsertQuestion>): Promise<Question>;
  deleteQuestion(id: number): Promise<void>;
  getRandomQuestion(): Promise<Question | undefined>;
  getAllQuestions(): Promise<Question[]>;

  getDailyQuestion(userId: number, date: string): Promise<DailyQuestion | undefined>;
  createDailyQuestion(userId: number, questionId: number, date: string): Promise<DailyQuestion>;
  answerDailyQuestion(id: number, correct: boolean): Promise<DailyQuestion>;

  getDailyChallenge(userId: number, date: string): Promise<DailyChallenge | undefined>;
  createDailyChallenge(userId: number, questionIds: number[], date: string): Promise<DailyChallenge>;
  completeDailyChallenge(id: number, score: number, xpEarned: number): Promise<DailyChallenge>;

  getAllUsers(): Promise<User[]>;
  setUserRole(id: number, role: string): Promise<User>;

  getLeaderboard(limit?: number): Promise<User[]>;
  awardXP(userId: number, xp: number): Promise<User>;
  updateStreak(userId: number): Promise<User>;

  createVersusChallenge(creatorId: number, subject: string, numQuestions: number, timeLimit: number, questionIds: number[], code: string): Promise<VersusChallenge>;
  getVersusChallengeByCode(code: string): Promise<VersusChallenge | undefined>;
  joinVersusChallenge(id: number, opponentId: number): Promise<VersusChallenge>;
  submitVersusResult(id: number, userId: number, creatorId: number, score: number, timeTaken: number): Promise<VersusChallenge>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async createTestResult(insertResult: InsertTestResult): Promise<TestResult> {
    const [result] = await db.insert(testResults).values(insertResult).returning();
    return result;
  }

  async getTestResultsByUserId(userId: number): Promise<TestResult[]> {
    return db.select().from(testResults).where(eq(testResults.userId, userId)).orderBy(testResults.completedAt);
  }

  async getQuestions(subject?: string, grade?: string, limit?: number): Promise<Question[]> {
    let results = await db.select().from(questions);
    if (subject) results = results.filter(q => q.subject === subject);
    if (grade) results = results.filter(q => q.grade === grade);
    results = results.sort(() => Math.random() - 0.5);
    if (limit) results = results.slice(0, limit);
    return results;
  }

  async getQuizQuestions(subject: string, grade: string): Promise<Question[]> {
    const all = await db.select().from(questions);
    const pool = all.filter(q => q.subject === subject && q.grade === grade);

    const byDiff = { E: [] as Question[], C: [] as Question[], A: [] as Question[] };
    for (const q of pool) {
      const d = (q.difficulty as "E" | "C" | "A") in byDiff ? (q.difficulty as "E" | "C" | "A") : "C";
      byDiff[d].push(q);
    }

    const pickDiverseTopics = (pool: Question[], count: number): Question[] => {
      const shuffled = pool.sort(() => Math.random() - 0.5);
      const byTopic: Record<string, Question[]> = {};
      for (const q of shuffled) {
        if (!byTopic[q.topic]) byTopic[q.topic] = [];
        byTopic[q.topic].push(q);
      }
      const topics = Object.keys(byTopic);
      const picked: Question[] = [];
      let i = 0;
      while (picked.length < count && i < count * 3) {
        const topic = topics[i % topics.length];
        const q = byTopic[topic]?.shift();
        if (q) picked.push(q);
        i++;
      }
      while (picked.length < count) {
        const remaining = shuffled.filter(q => !picked.includes(q));
        if (remaining.length === 0) break;
        picked.push(remaining[0]);
      }
      return picked.slice(0, count);
    };

    const easy = pickDiverseTopics(byDiff.E, 5);
    const medium = pickDiverseTopics(byDiff.C, 10);
    const hard = pickDiverseTopics(byDiff.A, 5);

    const combined = [...easy, ...medium, ...hard].sort(() => Math.random() - 0.5);
    return combined;
  }

  async getQuestionsByIds(ids: number[]): Promise<Question[]> {
    if (ids.length === 0) return [];
    const results = await db.select().from(questions);
    return results.filter(q => ids.includes(q.id));
  }

  async getRandomQuestion(): Promise<Question | undefined> {
    const all = await db.select().from(questions);
    if (all.length === 0) return undefined;
    return all[Math.floor(Math.random() * all.length)];
  }

  async insertQuestion(question: InsertQuestion): Promise<Question> {
    const [q] = await db.insert(questions).values(question).returning();
    return q;
  }

  async updateQuestion(id: number, updates: Partial<InsertQuestion>): Promise<Question> {
    const [q] = await db.update(questions).set(updates).where(eq(questions.id, id)).returning();
    return q;
  }

  async deleteQuestion(id: number): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }

  async getAllQuestions(): Promise<Question[]> {
    return db.select().from(questions).orderBy(questions.id);
  }

  async getDailyQuestion(userId: number, date: string): Promise<DailyQuestion | undefined> {
    const [dq] = await db.select().from(dailyQuestions)
      .where(and(eq(dailyQuestions.userId, userId), eq(dailyQuestions.date, date)));
    return dq;
  }

  async createDailyQuestion(userId: number, questionId: number, date: string): Promise<DailyQuestion> {
    const [dq] = await db.insert(dailyQuestions).values({ userId, questionId, date }).returning();
    return dq;
  }

  async answerDailyQuestion(id: number, correct: boolean): Promise<DailyQuestion> {
    const [dq] = await db.update(dailyQuestions)
      .set({ answered: true, correct, answeredAt: new Date() })
      .where(eq(dailyQuestions.id, id))
      .returning();
    return dq;
  }

  async getDailyChallenge(userId: number, date: string): Promise<DailyChallenge | undefined> {
    const [dc] = await db.select().from(dailyChallenges)
      .where(and(eq(dailyChallenges.userId, userId), eq(dailyChallenges.date, date)));
    return dc;
  }

  async createDailyChallenge(userId: number, questionIds: number[], date: string): Promise<DailyChallenge> {
    const [dc] = await db.insert(dailyChallenges).values({ userId, questionIds, date }).returning();
    return dc;
  }

  async completeDailyChallenge(id: number, score: number, xpEarned: number): Promise<DailyChallenge> {
    const [dc] = await db.update(dailyChallenges)
      .set({ completed: true, score, xpEarned, completedAt: new Date() })
      .where(eq(dailyChallenges.id, id))
      .returning();
    return dc;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.id);
  }

  async setUserRole(id: number, role: string): Promise<User> {
    const isAdmin = role === "admin";
    const [user] = await db.update(users).set({ role, isAdmin }).where(eq(users.id, id)).returning();
    return user;
  }

  async getLeaderboard(limit = 10): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.xp)).limit(limit);
  }

  async awardXP(userId: number, xp: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    return this.updateUser(userId, { xp: (user.xp || 0) + xp });
  }

  async updateStreak(userId: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const lastDate = user.lastPracticeDate;

    let newStreak = user.streak || 0;
    if (lastDate === today) {
      return user;
    } else if (lastDate === yesterday) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    return this.updateUser(userId, { streak: newStreak, lastPracticeDate: today });
  }

  async createVersusChallenge(creatorId: number, subject: string, numQuestions: number, timeLimit: number, questionIds: number[], code: string): Promise<VersusChallenge> {
    const [vc] = await db.insert(versusChallenges).values({ code, creatorId, subject, numQuestions, timeLimit, questionIds, status: "pending" }).returning();
    return vc;
  }

  async getVersusChallengeByCode(code: string): Promise<VersusChallenge | undefined> {
    const [vc] = await db.select().from(versusChallenges).where(eq(versusChallenges.code, code));
    return vc;
  }

  async joinVersusChallenge(id: number, opponentId: number): Promise<VersusChallenge> {
    const [vc] = await db.update(versusChallenges)
      .set({ opponentId, status: "active" })
      .where(eq(versusChallenges.id, id))
      .returning();
    return vc;
  }

  async submitVersusResult(id: number, userId: number, creatorId: number, score: number, timeTaken: number): Promise<VersusChallenge> {
    const [current] = await db.select().from(versusChallenges).where(eq(versusChallenges.id, id));
    if (!current) throw new Error("Challenge not found");

    const isCreator = userId === creatorId;
    const updates: Partial<VersusChallenge> = isCreator
      ? { creatorScore: score, creatorTime: timeTaken }
      : { opponentScore: score, opponentTime: timeTaken };

    const newCreatorScore = isCreator ? score : current.creatorScore;
    const newOpponentScore = isCreator ? current.opponentScore : score;
    const newCreatorTime = isCreator ? timeTaken : current.creatorTime;
    const newOpponentTime = isCreator ? current.opponentTime : timeTaken;

    if (newCreatorScore !== null && newCreatorScore !== undefined && newOpponentScore !== null && newOpponentScore !== undefined) {
      updates.status = "completed";
      if (newCreatorScore > newOpponentScore) {
        updates.winnerId = creatorId;
      } else if (newOpponentScore > newCreatorScore) {
        updates.winnerId = current.opponentId!;
      } else {
        updates.winnerId = (newCreatorTime ?? 9999) <= (newOpponentTime ?? 9999) ? creatorId : current.opponentId!;
      }
    }

    const [vc] = await db.update(versusChallenges).set(updates).where(eq(versusChallenges.id, id)).returning();
    return vc;
  }
}

export const storage = new DatabaseStorage();

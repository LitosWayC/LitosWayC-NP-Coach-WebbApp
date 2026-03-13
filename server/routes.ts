import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool, db } from "./db";
import { testResults } from "@shared/schema";
import { sampleQuestions } from "./seed-data";

declare module 'express-session' {
  interface SessionData { userId: number; }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const PgSession = connectPgSimple(session);
  app.use(session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
  }));

  // AUTH
  const ADMIN_EMAILS = ["carliitos_@hotmail.com"];
  const serializeUser = (u: Awaited<ReturnType<typeof storage.getUser>>) =>
    u ? { id: u.id, email: u.email, username: u.username, xp: u.xp, streak: u.streak, isPremium: u.isPremium, isAdmin: u.isAdmin, role: u.role } : null;

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, username } = z.object({
        email: z.string().email(),
        password: z.string().min(4),
        username: z.string().min(2).optional(),
      }).parse(req.body);
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ message: "E-postadressen används redan.", field: "email" });
      const isAdminEmail = ADMIN_EMAILS.some(a => a.toLowerCase() === email.toLowerCase());
      const user = await storage.createUser({
        email, password,
        username: username || email.split("@")[0],
        isAdmin: isAdminEmail,
        role: isAdminEmail ? "admin" : "student",
      });
      req.session.userId = user.id;
      res.status(201).json(serializeUser(user));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) return res.status(401).json({ message: "Ogiltig e-postadress eller lösenord" });
      req.session.userId = user.id;
      res.json(serializeUser(user));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Ej inloggad" });
    res.json(serializeUser(user));
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ message: "Utloggad" }));
  });

  app.patch("/api/user/premium", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const user = await storage.updateUser(req.session.userId, { isPremium: true });
    res.json({ id: user.id, email: user.email, username: user.username, xp: user.xp, streak: user.streak, isPremium: user.isPremium });
  });

  app.patch("/api/user/profile", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const { username } = z.object({ username: z.string().min(2) }).parse(req.body);
    const user = await storage.updateUser(req.session.userId, { username });
    res.json({ id: user.id, email: user.email, username: user.username, xp: user.xp, streak: user.streak, isPremium: user.isPremium });
  });

  // QUESTIONS
  app.get("/api/questions", async (req, res) => {
    const subject = req.query.subject as string | undefined;
    const grade = req.query.grade as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const topics = req.query.topics ? (req.query.topics as string).split(",") : undefined;

    if (subject && grade && !topics) {
      const qs = await storage.getQuizQuestions(subject, grade);
      return res.json(qs);
    }

    let qs = await storage.getQuestions(subject, grade, limit);
    if (topics && topics.length > 0) {
      qs = qs.filter(q => topics.includes(q.topic));
    }
    res.json(qs);
  });

  // QUIZ RESULTS
  app.post("/api/test-results", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    try {
      const input = z.object({
        score: z.number(),
        totalQuestions: z.number(),
        level: z.string(),
        subject: z.string(),
        incorrectQuestions: z.array(z.number()),
      }).parse(req.body);

      const xpEarned = input.score * 10 + 50;

      const result = await storage.createTestResult({
        userId: req.session.userId,
        score: input.score,
        totalQuestions: input.totalQuestions,
        level: input.level,
        subject: input.subject,
        incorrectQuestions: input.incorrectQuestions,
        xpEarned,
      });

      await storage.awardXP(req.session.userId, xpEarned);
      await storage.updateStreak(req.session.userId);

      res.status(201).json({ ...result, xpEarned });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.get("/api/test-results", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const results = await storage.getTestResultsByUserId(req.session.userId);
    res.json(results);
  });

  // DAILY QUESTION
  app.get("/api/daily-question", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const today = new Date().toISOString().split("T")[0];
    let dq = await storage.getDailyQuestion(req.session.userId, today);

    if (!dq) {
      const q = await storage.getRandomQuestion();
      if (!q) return res.status(404).json({ message: "Inga frågor tillgängliga" });
      dq = await storage.createDailyQuestion(req.session.userId, q.id, today);
    }

    const question = await storage.getQuestionsByIds([dq.questionId]);
    res.json({ dailyQuestion: dq, question: question[0] || null });
  });

  app.post("/api/daily-question/answer", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const { dailyQuestionId, correct } = z.object({
      dailyQuestionId: z.number(),
      correct: z.boolean(),
    }).parse(req.body);

    const dq = await storage.answerDailyQuestion(dailyQuestionId, correct);
    const xpEarned = correct ? 20 : 5;
    await storage.awardXP(req.session.userId, xpEarned);
    await storage.updateStreak(req.session.userId);
    res.json({ dq, xpEarned });
  });

  // DAILY CHALLENGE (5 questions per day)
  app.get("/api/daily-challenge", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const today = new Date().toISOString().split("T")[0];
    let dc = await storage.getDailyChallenge(req.session.userId, today);

    if (!dc) {
      const allQs = await storage.getQuestions(undefined, "Åk 9", undefined);
      const shuffled = allQs.sort(() => Math.random() - 0.5).slice(0, 5);
      const ids = shuffled.map(q => q.id);
      dc = await storage.createDailyChallenge(req.session.userId, ids, today);
    }

    const questions = await storage.getQuestionsByIds(dc.questionIds);
    res.json({ challenge: dc, questions });
  });

  app.post("/api/daily-challenge/complete", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const { challengeId, score } = z.object({
      challengeId: z.number(),
      score: z.number().min(0).max(5),
    }).parse(req.body);

    const dc = await storage.getDailyChallenge(req.session.userId, new Date().toISOString().split("T")[0]);
    if (!dc || dc.id !== challengeId) return res.status(404).json({ message: "Utmaning hittades inte" });
    if (dc.completed) return res.status(400).json({ message: "Utmaningen är redan avklarad" });

    const xpEarned = score * 15 + 25;
    const completed = await storage.completeDailyChallenge(challengeId, score, xpEarned);
    await storage.awardXP(req.session.userId, xpEarned);
    await storage.updateStreak(req.session.userId);
    const updatedUser = await storage.getUser(req.session.userId);
    res.json({ challenge: completed, xpEarned, streak: updatedUser?.streak || 0 });
  });

  // LEADERBOARD
  app.get("/api/leaderboard", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const period = (req.query.period as string) || "all";

    let cutoff: Date | null = null;
    if (period === "week") cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (period === "month") cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const allUsers = await storage.getAllUsers();
    const allResults = await db.select().from(testResults);

    const stats: Record<number, { testsTotal: number; periodXP: number; periodTests: number }> = {};
    for (const r of allResults) {
      if (!stats[r.userId]) stats[r.userId] = { testsTotal: 0, periodXP: 0, periodTests: 0 };
      stats[r.userId].testsTotal++;
      if (!cutoff || (r.completedAt && new Date(r.completedAt) >= cutoff)) {
        stats[r.userId].periodXP += r.xpEarned || 0;
        stats[r.userId].periodTests++;
      }
    }

    const entries = allUsers.map(u => ({
      id: u.id,
      username: u.username || u.email.split("@")[0],
      xp: u.xp,
      streak: u.streak,
      isPremium: u.isPremium,
      testsCompleted: stats[u.id]?.testsTotal || 0,
      periodXP: stats[u.id]?.periodXP || 0,
      periodTests: period === "all" ? (stats[u.id]?.testsTotal || 0) : (stats[u.id]?.periodTests || 0),
    }));

    const sorted = entries
      .sort((a, b) => period === "all" ? b.xp - a.xp : b.periodXP !== a.periodXP ? b.periodXP - a.periodXP : b.xp - a.xp)
      .slice(0, limit);

    res.json(sorted.map((e, i) => ({ ...e, rank: i + 1 })));
  });

  // AI COACH
  app.post("/api/ai/analyze", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const { testResultId } = z.object({ testResultId: z.number() }).parse(req.body);

    const results = await storage.getTestResultsByUserId(req.session.userId);
    const result = results.find(r => r.id === testResultId);
    if (!result) return res.status(404).json({ message: "Resultat hittades inte" });

    const allQuestions = await storage.getQuestions(result.subject);
    const incorrectQs = allQuestions.filter(q => (result.incorrectQuestions as number[]).includes(q.id));
    const weakTopics = Array.from(new Set(incorrectQs.map(q => q.topic)));

    const pct = Math.round((result.score / result.totalQuestions) * 100);

    let feedback = "";
    if (pct >= 85) {
      feedback = `Utmärkt resultat! Du fick ${pct}% rätt i ${result.subject}. Du behärskar ämnet på en hög nivå.`;
    } else if (pct >= 65) {
      feedback = `Bra jobbat! Du fick ${pct}% rätt. ${weakTopics.length > 0 ? `Fokusera lite extra på ${weakTopics.slice(0, 2).join(" och ")} så når du A/B-nivå.` : "Fortsätt öva!"}`;
    } else {
      feedback = `Du fick ${pct}% rätt. Ge inte upp! ${weakTopics.length > 0 ? `Jag rekommenderar att du tränar specifikt på ${weakTopics.join(", ")}.` : "Fortsätt öva regelbundet så ser du snabbt förbättringar."}`;
    }

    const suggestions = weakTopics.length > 0
      ? weakTopics.map(t => `Öva mer på ${t} – försök förklara konceptet högt för dig själv.`)
      : ["Du verkar ha bra koll! Testa ett nytt prov med högre svårighet."];

    const practiceQuestions = weakTopics.length > 0
      ? allQuestions
          .filter(q => weakTopics.includes(q.topic) && !incorrectQs.find(iq => iq.id === q.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
      : allQuestions
          .filter(q => !(result.incorrectQuestions as number[]).includes(q.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

    res.json({ feedback, weakTopics, suggestions, xpEarned: result.xpEarned || 0, practiceQuestions });
  });

  // TOPIC ANALYTICS
  app.get("/api/analytics/topics", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const results = await storage.getTestResultsByUserId(req.session.userId);

    const topicWrong: Record<string, number> = {};
    const subjectStats: Record<string, { correct: number; total: number }> = {};
    let totalCorrect = 0;
    let totalQuestions = 0;

    for (const r of results) {
      const incorrectIds = (r.incorrectQuestions as number[]) || [];
      const incorrectQs = await storage.getQuestionsByIds(incorrectIds);

      for (const q of incorrectQs) {
        topicWrong[q.topic] = (topicWrong[q.topic] || 0) + 1;
      }

      const subj = r.subject || "Matematik";
      if (!subjectStats[subj]) subjectStats[subj] = { correct: 0, total: 0 };
      subjectStats[subj].correct += r.score;
      subjectStats[subj].total += r.totalQuestions;

      totalCorrect += r.score;
      totalQuestions += r.totalQuestions;
    }

    const topics = Object.entries(topicWrong)
      .sort((a, b) => b[1] - a[1])
      .map(([topic, incorrectCount]) => ({ topic, incorrectCount }));

    res.json({
      topics,
      totalQuizzes: results.length,
      totalCorrect,
      totalQuestions,
      accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      subjectStats,
      recentResults: results.slice(-10).reverse().map(r => ({
        id: r.id,
        subject: r.subject,
        score: r.score,
        totalQuestions: r.totalQuestions,
        level: r.level,
        xpEarned: r.xpEarned,
        completedAt: r.completedAt,
      })),
    });
  });

  // ADMIN ROUTES
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin) return res.status(403).json({ message: "Åtkomst nekad" });
    next();
  };

  app.post("/api/admin/claim", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const { secret } = z.object({ secret: z.string() }).parse(req.body);
    if (secret !== (process.env.ADMIN_SECRET || "npcoach-admin-2025")) {
      return res.status(403).json({ message: "Fel lösenord" });
    }
    const user = await storage.updateUser(req.session.userId, { isAdmin: true, role: "admin" });
    res.json({ isAdmin: user.isAdmin, role: user.role });
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const allUsers = await storage.getAllUsers();
    res.json(allUsers.map(u => ({ id: u.id, email: u.email, username: u.username, role: u.role, isAdmin: u.isAdmin, xp: u.xp, streak: u.streak })));
  });

  app.patch("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { role } = z.object({ role: z.enum(["student", "admin"]) }).parse(req.body);
    const user = await storage.setUserRole(id, role);
    res.json({ id: user.id, email: user.email, role: user.role, isAdmin: user.isAdmin });
  });

  app.get("/api/admin/questions", requireAdmin, async (req, res) => {
    const qs = await storage.getAllQuestions();
    res.json(qs);
  });

  app.post("/api/admin/questions", requireAdmin, async (req, res) => {
    try {
      const input = z.object({
        subject: z.string(),
        grade: z.string(),
        topic: z.string(),
        type: z.enum(["multiple_choice", "numeric", "open"]),
        questionText: z.string(),
        options: z.array(z.string()).optional(),
        correctAnswer: z.string(),
        explanation: z.string(),
        difficulty: z.enum(["E", "C", "A"]).default("C"),
      }).parse(req.body);
      const q = await storage.insertQuestion(input);
      res.status(201).json(q);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.patch("/api/admin/questions/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const q = await storage.updateQuestion(id, updates);
      res.json(q);
    } catch (err) {
      throw err;
    }
  });

  app.delete("/api/admin/questions/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteQuestion(id);
    res.json({ message: "Frågan raderad" });
  });

  // SMART PRACTICE - questions based on weak topics
  app.get("/api/smart-practice", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const results = await storage.getTestResultsByUserId(req.session.userId);

    const topicMissCount: Record<string, number> = {};
    for (const r of results) {
      const incorrectIds = (r.incorrectQuestions as number[]) || [];
      const qs = await storage.getQuestionsByIds(incorrectIds);
      for (const q of qs) {
        topicMissCount[q.topic] = (topicMissCount[q.topic] || 0) + 1;
      }
    }

    const sortedTopics = Object.entries(topicMissCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
    const allQs = await storage.getQuestions();
    let practiceQs = allQs.filter(q => sortedTopics.includes(q.topic)).sort(() => Math.random() - 0.5).slice(0, 10);
    if (practiceQs.length === 0) practiceQs = allQs.sort(() => Math.random() - 0.5).slice(0, 10);

    res.json({ questions: practiceQs, weakTopics: sortedTopics });
  });

  // VERSUS MODE
  function generateCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Create a challenge
  app.post("/api/versus", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const { subject, numQuestions, timeLimit } = z.object({
      subject: z.string(),
      numQuestions: z.number().int().min(5).max(20),
      timeLimit: z.number().int().min(60).max(600),
    }).parse(req.body);

    const all = await storage.getQuestions(subject, "Åk 9");
    const shuffled = all.sort(() => Math.random() - 0.5).slice(0, numQuestions);
    const questionIds = shuffled.map(q => q.id);

    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await storage.getVersusChallengeByCode(code);
      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    const challenge = await storage.createVersusChallenge(req.session.userId, subject, numQuestions, timeLimit, questionIds, code);
    res.json({ challenge });
  });

  // Get challenge by code (with question data + user names)
  app.get("/api/versus/:code", async (req, res) => {
    const challenge = await storage.getVersusChallengeByCode(req.params.code);
    if (!challenge) return res.status(404).json({ message: "Utmaning hittades inte" });

    const questions = await storage.getQuestionsByIds(challenge.questionIds);
    const creator = await storage.getUser(challenge.creatorId);
    const opponent = challenge.opponentId ? await storage.getUser(challenge.opponentId) : null;

    res.json({
      challenge,
      questions,
      creatorName: creator?.username || creator?.email.split("@")[0] || "Okänd",
      opponentName: opponent ? (opponent.username || opponent.email.split("@")[0]) : null,
    });
  });

  // Join a challenge
  app.post("/api/versus/:code/join", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const challenge = await storage.getVersusChallengeByCode(req.params.code);
    if (!challenge) return res.status(404).json({ message: "Utmaning hittades inte" });
    if (challenge.creatorId === req.session.userId) return res.status(400).json({ message: "Du kan inte utmana dig själv" });
    if (challenge.opponentId && challenge.opponentId !== req.session.userId) return res.status(400).json({ message: "Utmaningen är redan tagen" });
    if (challenge.opponentId === req.session.userId) return res.json({ challenge });

    const updated = await storage.joinVersusChallenge(challenge.id, req.session.userId);
    res.json({ challenge: updated });
  });

  // Submit result
  app.post("/api/versus/:code/submit", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Ej inloggad" });
    const challenge = await storage.getVersusChallengeByCode(req.params.code);
    if (!challenge) return res.status(404).json({ message: "Utmaning hittades inte" });

    const { score, timeTaken } = z.object({
      score: z.number().int().min(0),
      timeTaken: z.number().int().min(0),
    }).parse(req.body);

    const updated = await storage.submitVersusResult(challenge.id, req.session.userId, challenge.creatorId, score, timeTaken);

    // Award XP if both finished
    if (updated.status === "completed") {
      const xp = score * 10 + 20;
      await storage.awardXP(req.session.userId, xp);
    }

    res.json({ challenge: updated });
  });

  seedDatabase().catch(console.error);
  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getQuestions();
  if (existing.length === 0) {
    for (const q of sampleQuestions) {
      await storage.insertQuestion(q);
    }
    console.log(`Seeded ${sampleQuestions.length} questions`);
  }
}

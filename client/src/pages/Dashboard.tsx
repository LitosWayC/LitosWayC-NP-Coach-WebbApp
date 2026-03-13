import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useUser } from "@/hooks/use-auth";
import { useTestResults } from "@/hooks/use-test-results";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Calculator, Trophy, TrendingUp, Target, BookOpen, MessageSquare, Zap, Flame, CheckCircle2, XCircle, Sparkles, ChevronRight, Star, Lock, BarChart2, BrainCircuit, ArrowRight } from "lucide-react";
import { answersMatch } from "@/lib/normalize";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import type { Question, DailyChallenge as DailyChallengeType } from "@shared/schema";

type DailyChallengeData = { challenge: DailyChallengeType; questions: Question[] };

const SUBJECTS = [
  { id: "matematik-9", name: "Matematik NP", subject: "Matematik", grade: "Åk 9", description: "Algebra, geometri, statistik och problemlösning.", icon: Calculator, color: "from-blue-500 to-cyan-500" },
  { id: "svenska-9", name: "Svenska NP", subject: "Svenska", grade: "Åk 9", description: "Läsförståelse, grammatik och litteraturhistoria.", icon: BookOpen, color: "from-purple-500 to-pink-500" },
  { id: "engelska-9", name: "Engelska NP", subject: "Engelska", grade: "Åk 9", description: "Vocabulary, grammar and reading comprehension.", icon: MessageSquare, color: "from-orange-500 to-yellow-500" },
];

function xpLevel(xp: number) {
  const thresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];
  const level = thresholds.filter(t => xp >= t).length;
  const prev = thresholds[level - 1] ?? 0;
  const next = thresholds[level] ?? prev + 500;
  const progress = Math.min(100, Math.round(((xp - prev) / (next - prev)) * 100));
  return { level, progress, next, prev };
}

type DailyData = { dailyQuestion: { id: number; answered: boolean; correct?: boolean; questionId: number }; question: Question };

type Analytics = {
  topics: { topic: string; incorrectCount: number }[];
  totalQuizzes: number;
  accuracy: number;
};

function AiCoachWidget({ hasResults }: { hasResults: boolean }) {
  const [, setLocation] = useLocation();
  const { data } = useQuery<Analytics>({
    queryKey: ["/api/analytics/topics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/topics", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: hasResults,
  });

  return (
    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-3xl border border-violet-100 shadow-sm p-6" data-testid="widget-ai-coach">
      <div className="flex items-center gap-2 mb-3">
        <BrainCircuit className="w-5 h-5 text-violet-600" />
        <h3 className="font-bold text-lg text-slate-900">Din AI Coach</h3>
      </div>
      {!hasResults ? (
        <div>
          <p className="text-sm text-slate-600 mb-4">Gör ditt första prov för att få personlig analys av dina styrkor och svagheter.</p>
          <button
            onClick={() => setLocation("/dashboard")}
            className="w-full py-2.5 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors"
          >
            Starta ett prov
          </button>
        </div>
      ) : data ? (
        <div>
          {data.topics.length > 0 ? (
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">Fokusera extra på:</p>
              <div className="flex flex-wrap gap-1.5">
                {data.topics.slice(0, 3).map(t => (
                  <span key={t.topic} className="text-xs font-semibold px-2.5 py-1 bg-white border border-violet-200 text-violet-700 rounded-full">
                    {t.topic}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600 mb-4">Utmärkt! Inga tydliga svagheter hittades. Fortsätt öva!</p>
          )}
          <div className="text-sm text-slate-500 mb-4">
            <span className="font-bold text-slate-700">{data.accuracy}%</span> träffsäkerhet totalt · <span className="font-bold text-slate-700">{data.totalQuizzes}</span> prov gjorda
          </div>
          <button
            onClick={() => setLocation("/progress")}
            className="w-full py-2.5 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors flex items-center justify-center gap-1.5"
            data-testid="button-view-progress"
          >
            Se detaljerad statistik <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="h-20 animate-pulse bg-white/60 rounded-xl" />
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: results, isLoading: resultsLoading } = useTestResults();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: dailyData, isLoading: dailyLoading } = useQuery<DailyData>({
    queryKey: ["/api/daily-question"],
    queryFn: async () => {
      const res = await fetch("/api/daily-question", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: challengeData, isLoading: challengeLoading } = useQuery<DailyChallengeData>({
    queryKey: ["/api/daily-challenge"],
    queryFn: async () => {
      const res = await fetch("/api/daily-challenge", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const [dailyAnswer, setDailyAnswer] = useState("");
  const [dailyAnswered, setDailyAnswered] = useState(false);
  const [dailyResult, setDailyResult] = useState<{ correct: boolean; xpEarned: number } | null>(null);

  const answerDaily = useMutation({
    mutationFn: async ({ dailyQuestionId, correct }: { dailyQuestionId: number; correct: boolean }) => {
      const res = await apiRequest("POST", "/api/daily-question/answer", { dailyQuestionId, correct });
      return res.json();
    },
    onSuccess: (data) => {
      setDailyResult({ correct: data.dq.correct, xpEarned: data.xpEarned });
      setDailyAnswered(true);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const checkDailyAnswer = () => {
    if (!dailyData?.question || !dailyData?.dailyQuestion) return;
    const q = dailyData.question;
    const correct = answersMatch(dailyAnswer, q.correctAnswer);
    answerDaily.mutate({ dailyQuestionId: dailyData.dailyQuestion.id, correct });
  };

  if (userLoading || resultsLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#fafafa]"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!user) { setLocation("/auth"); return null; }

  const isPremiumUser = user.isPremium || false;
  const { level, progress: xpProgress, next: nextXp } = xpLevel(user.xp || 0);
  const getTestCountForSubject = (subject: string) => results?.filter(r => r.subject === subject).length || 0;

  const chartData = results?.map((r, i) => ({
    name: `Prov ${i + 1}`,
    poäng: r.score,
    datum: r.completedAt ? format(new Date(r.completedAt), "d MMM", { locale: sv }) : "",
  })) || [];

  const latestResult = results && results.length > 0 ? results[results.length - 1] : null;
  const avgScore = results && results.length > 0 ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length) : 0;

  const topicMissCounts: Record<string, number> = {};
  results?.forEach(r => {
    if (Array.isArray(r.incorrectQuestions)) {
      r.incorrectQuestions.forEach((qid: number) => {
        topicMissCounts[String(qid)] = (topicMissCounts[String(qid)] || 0) + 1;
      });
    }
  });

  const alreadyAnsweredDaily = dailyData?.dailyQuestion?.answered || dailyAnswered;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {!isPremiumUser && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div>
              <h2 className="text-lg font-bold">Uppgradera till Premium</h2>
              <p className="opacity-90 text-sm">Obegränsat antal prov och detaljerad statistik.</p>
            </div>
            <button onClick={async () => { await fetch("/api/user/premium", { method: "PATCH" }); window.location.reload(); }}
              className="px-6 py-3 bg-white text-orange-600 font-bold rounded-2xl hover:bg-opacity-90 transition-all shadow-md whitespace-nowrap text-sm"
            >
              Uppgradera Nu
            </button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">

            {/* Profile + XP Card */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {(user.username || user.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-foreground">{user.username || user.email.split("@")[0]}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">Nivå {level}</span>
                    {isPremiumUser && <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">Premium</span>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2">
                    <Flame className="w-5 h-5 text-orange-500 mb-0.5" />
                    <span className="text-xl font-bold text-orange-600">{user.streak || 0}</span>
                    <span className="text-xs text-orange-500">dagar</span>
                  </div>
                  <div className="flex flex-col items-center bg-primary/5 border border-primary/20 rounded-2xl px-4 py-2">
                    <Zap className="w-5 h-5 text-primary mb-0.5" />
                    <span className="text-xl font-bold text-primary">{(user.xp || 0).toLocaleString()}</span>
                    <span className="text-xs text-primary/70">XP</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Nästa nivå: {nextXp.toLocaleString()} XP</span>
                  <span>{xpProgress}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {(user.streak || 0) > 0 
                    ? `🔥 Du är på en ${user.streak}-dagars streak! Fortsätt imorgon!`
                    : "Svara på dagsfrågan för att starta din streak!"}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Target, color: "text-primary", bg: "bg-primary/5", label: "Senaste nivå", value: latestResult?.level || "-" },
                { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50", label: "Snittpoäng", value: results?.length ? `${avgScore} p` : "-" },
                { icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-50", label: "Gjorda prov", value: results?.length || 0 },
              ].map(({ icon: Icon, color, bg, label, value }) => (
                <div key={label} className="bg-white p-5 rounded-2xl border border-border shadow-sm flex flex-col">
                  <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
                  <div className="text-2xl font-bold text-foreground">{value}</div>
                </div>
              ))}
            </div>

            {/* Daily Question */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Star className="w-4 h-4 text-yellow-500" />
                </div>
                <h3 className="font-bold font-display text-lg">Dagsfråga</h3>
                <span className="ml-auto text-xs font-bold text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full">+20 XP</span>
              </div>

              {dailyLoading ? (
                <div className="h-24 animate-pulse bg-slate-50 rounded-2xl" />
              ) : dailyData?.question ? (
                <div>
                  <p className="text-base font-medium text-foreground mb-4 leading-relaxed">{dailyData.question.questionText}</p>

                  {alreadyAnsweredDaily ? (
                    <AnimatePresence>
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className={`p-4 rounded-2xl border-2 ${dailyResult?.correct ?? dailyData.dailyQuestion.correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                      >
                        <div className="flex items-center gap-2 font-bold">
                          {(dailyResult?.correct ?? dailyData.dailyQuestion.correct) ? (
                            <><CheckCircle2 className="w-5 h-5 text-green-500" /><span className="text-green-700">Rätt! +{dailyResult?.xpEarned || 20} XP</span></>
                          ) : (
                            <><XCircle className="w-5 h-5 text-red-500" /><span className="text-red-700">Fel. Rätt svar: {dailyData.question.correctAnswer}</span></>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-2">{dailyData.question.explanation}</p>
                      </motion.div>
                    </AnimatePresence>
                  ) : dailyData.question.type === "multiple_choice" && dailyData.question.options ? (
                    <div className="grid gap-2">
                      {dailyData.question.options.map((opt, i) => (
                        <button key={i} onClick={() => setDailyAnswer(opt)}
                          className={`w-full text-left p-3.5 rounded-xl border-2 text-sm transition-all ${dailyAnswer === opt ? 'border-primary bg-primary/5 font-semibold text-primary' : 'border-border hover:border-primary/40'}`}
                        >
                          <span className="font-bold text-muted-foreground mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                        </button>
                      ))}
                      <button onClick={checkDailyAnswer} disabled={!dailyAnswer || answerDaily.isPending}
                        className="mt-2 w-full py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
                      >
                        Svara
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input type="text" value={dailyAnswer} onChange={e => setDailyAnswer(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && dailyAnswer && checkDailyAnswer()}
                        className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border-2 border-border focus:outline-none focus:border-primary text-base"
                        placeholder="Skriv ditt svar..."
                      />
                      <button onClick={checkDailyAnswer} disabled={!dailyAnswer || answerDaily.isPending}
                        className="px-5 bg-primary text-white rounded-xl font-bold disabled:opacity-50"
                      >Svara</button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Ingen dagsfråga tillgänglig just nu.</p>
              )}
            </div>

            {/* Progress Chart */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold font-display text-lg flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-primary" />
                  Din Utveckling
                </h3>
              </div>
              {chartData.length > 0 ? (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="datum" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} dy={10} />
                      <YAxis domain={[0, 20]} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} dx={-10} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(v: any) => [`${v} poäng`, 'Resultat']} />
                      <Line type="monotone" dataKey="poäng" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground bg-slate-50/50 rounded-xl border border-dashed text-sm">
                  Gör ditt första prov för att se statistik!
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">

            {/* Daily Challenge Card */}
            <div className={`rounded-3xl border shadow-sm p-6 ${challengeData?.challenge.completed ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100" : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100"}`}
              data-testid="card-daily-challenge">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${challengeData?.challenge.completed ? "bg-emerald-100" : "bg-orange-100"}`}>
                  <Flame className={`w-4 h-4 ${challengeData?.challenge.completed ? "text-emerald-500" : "text-orange-500"}`} />
                </div>
                <h3 className="font-bold font-display text-lg">Daglig Utmaning</h3>
                <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${challengeData?.challenge.completed ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                  {challengeData?.challenge.completed ? "Klar ✓" : "+25–100 XP"}
                </span>
              </div>

              {challengeLoading ? (
                <div className="h-16 animate-pulse bg-white/60 rounded-2xl" />
              ) : challengeData?.challenge.completed ? (
                <div>
                  <div className="flex items-center gap-3 bg-white/70 rounded-2xl p-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-emerald-700">Avklarad idag!</div>
                      <div className="text-xs text-slate-500">Resultat: {challengeData.challenge.score}/5 · +{challengeData.challenge.xpEarned} XP</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`flex-1 h-2 rounded-full ${i <= (challengeData.challenge.score || 0) ? "bg-orange-400" : "bg-slate-200"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">Kom tillbaka imorgon för en ny utmaning!</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-600 mb-4">5 frågor från alla ämnen. Avsluta för att hålla din streak igång!</p>
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-bold text-orange-600">{user?.streak || 0} dagars streak</span>
                    <span className="text-xs text-slate-500 ml-auto">Idag: ej påbörjad</span>
                  </div>
                  <button
                    onClick={() => setLocation("/daily-challenge")}
                    data-testid="button-start-daily-challenge"
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold text-sm shadow-md shadow-orange-200 hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <Flame className="w-4 h-4" />
                    Starta Daglig Utmaning
                  </button>
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold font-display text-lg">Välj Ämne</h3>
                <Link href="/leaderboard" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                  <Trophy className="w-3.5 h-3.5" /> Topplista
                </Link>
              </div>

              <div className="grid gap-3">
                {SUBJECTS.map((sub) => {
                  const count = getTestCountForSubject(sub.subject);
                  const isLocked = !isPremiumUser && count >= 1;
                  return (
                    <div key={sub.id}>
                      <Link
                        href={isLocked ? "#" : `/practice?subject=${encodeURIComponent(sub.subject)}&grade=${encodeURIComponent(sub.grade)}`}
                        className={`block group ${isLocked ? "cursor-default" : ""}`}
                      >
                        <div className={`bg-gradient-to-br ${sub.color} p-0.5 rounded-2xl shadow-sm transition-all duration-300 ${!isLocked ? 'group-hover:shadow-md group-hover:-translate-y-0.5' : ''}`}>
                          <div className="bg-white rounded-[0.85rem] p-4 relative overflow-hidden">
                            {isLocked && (
                              <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex items-center justify-center gap-2">
                                <Lock className="w-4 h-4 text-orange-500" />
                                <span className="text-xs font-bold text-orange-600">Premium krävs</span>
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                <sub.icon className="w-4 h-4 text-slate-700" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-foreground">{sub.name}</h4>
                                <p className="text-muted-foreground text-xs line-clamp-1">{sub.description}</p>
                              </div>
                              {!isLocked && <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smart Practice */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl border border-blue-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-lg text-slate-900">Smart Träning</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">Öva på dina svagaste ämnesområden baserat på tidigare resultat.</p>
              <button
                onClick={() => setLocation("/practice?mode=smart")}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
                data-testid="button-smart-practice"
              >
                Starta Smart Träning
              </button>
            </div>

            {/* AI Coach widget */}
            <AiCoachWidget hasResults={(results?.length ?? 0) > 0} />

            {/* XP breakdown */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6">
              <h3 className="font-bold font-display text-base mb-4">XP-system</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Rätt svar", xp: "+10 XP" },
                  { label: "Avklarat prov", xp: "+50 XP" },
                  { label: "Dagsfråga (rätt)", xp: "+20 XP" },
                  { label: "Dagsfråga (fel)", xp: "+5 XP" },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-100 last:border-0">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-bold text-primary">{item.xp}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

import { useLocation, Link } from "wouter";
import { useUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Zap, Flame, Trophy, Target, TrendingUp, BarChart2,
  CheckCircle2, XCircle, BookOpen, Calculator, MessageSquare,
  Sparkles, ChevronRight, AlertCircle,
} from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";

type Analytics = {
  topics: { topic: string; incorrectCount: number }[];
  totalQuizzes: number;
  totalCorrect: number;
  totalQuestions: number;
  accuracy: number;
  subjectStats: Record<string, { correct: number; total: number }>;
  recentResults: {
    id: number;
    subject: string;
    score: number;
    totalQuestions: number;
    level: string;
    xpEarned: number;
    completedAt: string;
  }[];
};

const THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];
function xpLevel(xp: number) {
  const level = THRESHOLDS.filter(t => xp >= t).length;
  const prev = THRESHOLDS[level - 1] ?? 0;
  const next = THRESHOLDS[level] ?? prev + 500;
  const progress = Math.min(100, Math.round(((xp - prev) / (next - prev)) * 100));
  return { level, progress, next };
}

const SUBJECT_META: Record<string, { icon: typeof Calculator; color: string; bg: string; grad: string }> = {
  Matematik: { icon: Calculator, color: "text-blue-600", bg: "bg-blue-50", grad: "from-blue-500 to-cyan-500" },
  Svenska: { icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50", grad: "from-purple-500 to-pink-500" },
  Engelska: { icon: MessageSquare, color: "text-orange-600", bg: "bg-orange-50", grad: "from-orange-500 to-yellow-500" },
};

const LEVEL_META: Record<string, { color: string; bg: string }> = {
  "A/B-nivå": { color: "text-green-700", bg: "bg-green-50" },
  "C-nivå":   { color: "text-blue-700",  bg: "bg-blue-50" },
  "E-nivå":   { color: "text-yellow-700", bg: "bg-yellow-50" },
  "Risk F":   { color: "text-red-700",   bg: "bg-red-50" },
};

function AccuracyRing({ accuracy }: { accuracy: number }) {
  const color = accuracy >= 80 ? "#22c55e" : accuracy >= 60 ? "#3b82f6" : accuracy >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-32 h-32 mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%"
          startAngle={90} endAngle={90 - 360 * (accuracy / 100)}
          data={[{ value: accuracy, fill: color }]}
        >
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "#f1f5f9" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold" style={{ color }}>{accuracy}%</span>
        <span className="text-xs text-muted-foreground">träffsäkerhet</span>
      </div>
    </div>
  );
}

export default function Progress() {
  const { data: user, isLoading: userLoading } = useUser();
  const [, setLocation] = useLocation();

  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ["/api/analytics/topics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/topics", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  if (userLoading || analyticsLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) { setLocation("/auth"); return null; }

  const { level, progress: xpProgress, next: nextXp } = xpLevel(user.xp || 0);
  const hasData = (analytics?.totalQuizzes ?? 0) > 0;

  const maxIncorrect = analytics?.topics[0]?.incorrectCount ?? 1;
  const strongestTopics = [...(analytics?.topics ?? [])].reverse().slice(0, 3);
  const weakestTopics = analytics?.topics.slice(0, 5) ?? [];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold font-display flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-primary" />
              Min Framgång
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Detaljerad statistik och personliga insikter</p>
          </div>
          <button
            onClick={() => setLocation("/practice?mode=smart")}
            data-testid="button-start-smart"
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
          >
            <Sparkles className="w-4 h-4" /> Smart Träning
          </button>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Zap,       color: "text-primary",      bg: "bg-primary/5",   label: "XP Totalt",     value: (user.xp || 0).toLocaleString(), sub: `Nivå ${level}` },
            { icon: Flame,     color: "text-orange-500",   bg: "bg-orange-50",   label: "Streak",        value: `${user.streak || 0}`,           sub: "dagar i rad" },
            { icon: Trophy,    color: "text-yellow-500",   bg: "bg-yellow-50",   label: "Prov gjorda",   value: analytics?.totalQuizzes ?? 0,    sub: "totalt" },
            { icon: Target,    color: "text-emerald-600",  bg: "bg-emerald-50",  label: "Rätta svar",    value: `${analytics?.accuracy ?? 0}%`,  sub: "träffsäkerhet" },
          ].map(({ icon: Icon, color, bg, label, value, sub }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-border p-4 shadow-sm"
              data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="text-2xl font-extrabold text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-xs text-muted-foreground">{sub}</div>
            </motion.div>
          ))}
        </div>

        {/* XP progress bar */}
        <div className="bg-white rounded-3xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold font-display text-base">Nivå {level}</h3>
            <span className="text-sm text-muted-foreground">{(user.xp || 0).toLocaleString()} / {nextXp.toLocaleString()} XP till nästa nivå</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${xpProgress}%` }} transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">{xpProgress}% till Nivå {level + 1}</div>
        </div>

        {!hasData ? (
          /* Empty state */
          <div className="bg-white rounded-3xl border border-border shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-bold font-display text-xl mb-2">Inga prov gjorda ännu</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Gör ditt första prov för att se detaljerad statistik och personliga AI-insikter.</p>
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity">
              Välj ämne och börja
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT: accuracy ring + subject breakdown */}
            <div className="space-y-5">
              <div className="bg-white rounded-3xl border border-border shadow-sm p-6 text-center">
                <h3 className="font-bold font-display text-base mb-4">Träffsäkerhet totalt</h3>
                <AccuracyRing accuracy={analytics?.accuracy ?? 0} />
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-green-50 rounded-xl p-3">
                    <div className="text-xl font-bold text-green-700">{analytics?.totalCorrect ?? 0}</div>
                    <div className="text-xs text-green-600">Rätta svar</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3">
                    <div className="text-xl font-bold text-red-600">{(analytics?.totalQuestions ?? 0) - (analytics?.totalCorrect ?? 0)}</div>
                    <div className="text-xs text-red-500">Felaktiga svar</div>
                  </div>
                </div>
              </div>

              {/* Subject breakdown */}
              <div className="bg-white rounded-3xl border border-border shadow-sm p-6">
                <h3 className="font-bold font-display text-base mb-4">Per ämne</h3>
                <div className="space-y-4">
                  {Object.entries(analytics?.subjectStats ?? {}).map(([subj, stats]) => {
                    const meta = SUBJECT_META[subj] || SUBJECT_META["Matematik"];
                    const Icon = meta.icon;
                    const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                    return (
                      <div key={subj}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Icon className={`w-4 h-4 ${meta.color}`} />
                            {subj}
                          </div>
                          <span className="font-bold text-foreground">{acc}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${acc}%` }} transition={{ duration: 0.8, delay: 0.2 }}
                            className={`h-full bg-gradient-to-r ${meta.grad} rounded-full`}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{stats.correct} av {stats.total} rätt</div>
                      </div>
                    );
                  })}
                  {Object.keys(analytics?.subjectStats ?? {}).length === 0 && (
                    <p className="text-sm text-muted-foreground">Inga ämnesdata ännu.</p>
                  )}
                </div>
              </div>
            </div>

            {/* MIDDLE: weak/strong topics */}
            <div className="space-y-5">
              {/* Weak topics */}
              <div className="bg-white rounded-3xl border border-border shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <h3 className="font-bold font-display text-base">Svagaste områden</h3>
                </div>
                {weakestTopics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Inga svaga områden! 🎉</p>
                ) : (
                  <div className="space-y-3">
                    {weakestTopics.map((t, i) => (
                      <div key={t.topic}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{t.topic}</span>
                          <span className="text-red-600 font-bold">{t.incorrectCount} fel</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round((t.incorrectCount / maxIncorrect) * 100)}%` }}
                            transition={{ duration: 0.7, delay: i * 0.05 }}
                            className="h-full bg-gradient-to-r from-red-400 to-rose-500 rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {weakestTopics.length > 0 && (
                  <button
                    onClick={() => setLocation("/practice?mode=smart")}
                    className="mt-4 w-full py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                    data-testid="button-practice-weak"
                  >
                    Träna på dessa →
                  </button>
                )}
              </div>

              {/* Strong topics */}
              <div className="bg-white rounded-3xl border border-border shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <h3 className="font-bold font-display text-base">Starkaste områden</h3>
                </div>
                {strongestTopics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Gör fler prov för att se dina starka sidor.</p>
                ) : (
                  <div className="space-y-3">
                    {strongestTopics.map((t, i) => (
                      <div key={t.topic} className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <span className="text-sm font-medium flex-1">{t.topic}</span>
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: recent results */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-bold font-display text-base">Senaste prov</h3>
              </div>
              {(analytics?.recentResults ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Inga prov gjorda än.</p>
              ) : (
                <div className="space-y-2">
                  {analytics?.recentResults.map((r) => {
                    const pct = Math.round((r.score / r.totalQuestions) * 100);
                    const lvl = LEVEL_META[r.level] || LEVEL_META["E-nivå"];
                    const meta = SUBJECT_META[r.subject] || SUBJECT_META["Matematik"];
                    const Icon = meta.icon;
                    return (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors" data-testid={`result-row-${r.id}`}>
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.grad} flex items-center justify-center text-white shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground">{r.subject}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.completedAt ? format(new Date(r.completedAt), "d MMM, HH:mm", { locale: sv }) : ""}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold">{pct}%</div>
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${lvl.bg} ${lvl.color}`}>
                            {r.level}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-amber-600 shrink-0">+{r.xpEarned} XP</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

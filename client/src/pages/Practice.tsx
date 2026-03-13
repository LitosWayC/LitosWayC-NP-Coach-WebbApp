import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { answersMatch } from "@/lib/normalize";
import { useQuery } from "@tanstack/react-query";
import { useCreateTestResult } from "@/hooks/use-test-results";
import { Clock, AlertCircle, CheckCircle2, XCircle, ArrowRight, Sparkles, Lightbulb, Target, Zap, BarChart2, TrendingUp, TrendingDown, Award, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Question } from "@shared/schema";

type ViewState = 'test' | 'results';

export default function Practice() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const subject = params.get("subject") || "Matematik";
  const grade = params.get("grade") || "Åk 9";
  const isSmartMode = params.get("mode") === "smart";
  const topicsParam = params.get("topics") || "";
  const isTopicMode = !!topicsParam && !isSmartMode;

  const regularQuery = useQuery<Question[]>({
    queryKey: ["/api/questions", subject, grade, topicsParam],
    queryFn: async () => {
      let url = `/api/questions?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`;
      if (topicsParam) url += `&topics=${encodeURIComponent(topicsParam)}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Kunde inte hämta frågor");
      return res.json();
    },
    enabled: !isSmartMode,
    staleTime: 5 * 60 * 1000,
  });

  const smartQuery = useQuery<{ questions: Question[]; weakTopics: string[] }>({
    queryKey: ["/api/smart-practice"],
    queryFn: async () => {
      const res = await fetch("/api/smart-practice", { credentials: "include" });
      if (!res.ok) throw new Error("Kunde inte hämta frågor");
      return res.json();
    },
    enabled: isSmartMode,
    staleTime: 5 * 60 * 1000,
  });

  const questions: Question[] = isSmartMode ? (smartQuery.data?.questions || []) : (regularQuery.data || []);
  const isLoading = isSmartMode ? smartQuery.isLoading : regularQuery.isLoading;
  const isError = isSmartMode ? smartQuery.isError : regularQuery.isError;
  const smartSubject = isSmartMode && questions.length > 0 ? questions[0].subject : subject;

  const createResult = useCreateTestResult();
  const [xpEarned, setXpEarned] = useState(0);
  type PracticeQ = { id: number; topic: string; type: string; questionText: string; options: string[] | null; correctAnswer: string; explanation: string };
  const [aiAnalysis, setAiAnalysis] = useState<{feedback: string, weakTopics: string[], suggestions: string[], xpEarned?: number, practiceQuestions?: PracticeQ[]} | null>(null);
  const [practiceRevealed, setPracticeRevealed] = useState<Record<number, boolean>>({});

  const analyzeMutation = useMutation({
    mutationFn: async (testResultId: number) => {
      const res = await apiRequest("POST", "/api/ai/analyze", { testResultId });
      return res.json();
    },
    onSuccess: (data) => {
      setAiAnalysis(data);
    }
  });

  const [view, setViewState] = useState<ViewState>('test');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});
  
  // Timer state (60 mins = 3600 seconds)
  const [timeLeft, setTimeLeft] = useState(3600);
  const [testScore, setTestScore] = useState({ score: 0, level: '' });

  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const checkCorrect = (q: any, answer: string) => {
    return answersMatch(answer || "", q.correctAnswer);
  };

  useEffect(() => {
    if (view === 'test' && timeLeft > 0 && questions?.length) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && view === 'test') {
      handleSubmit(); // Auto submit when time is up
    }
  }, [timeLeft, view, questions]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#fafafa]"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  if (isError || !questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#fafafa]">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Ett fel uppstod</h2>
        <p className="text-muted-foreground mb-6 text-center">Kunde inte ladda frågorna just nu. Kontrollera att det finns frågor i databasen.</p>
        <button onClick={() => setLocation("/dashboard")} className="px-6 py-2 bg-primary text-white rounded-xl hover:opacity-90 transition-opacity">Tillbaka till Dashboard</button>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const calculateLevel = (score: number) => {
    if (score <= 9) return "F";
    if (score <= 12) return "E";
    if (score <= 15) return "C";
    if (score <= 18) return "B";
    return "A";
  };

  const handleSubmit = async () => {
    let score = 0;
    const incorrectQuestions: number[] = [];
    
    questions.forEach(q => {
      const answer = answers[q.id] || "";
      if (checkCorrect(q, answer)) {
        score += 1;
      } else {
        incorrectQuestions.push(q.id);
      }
    });

    const level = calculateLevel(score);
    setTestScore({ score, level });
    setViewState('results');
    
    try {
      const result = await createResult.mutateAsync({ 
        score, 
        totalQuestions: questions.length,
        level, 
        subject: smartSubject,
        incorrectQuestions
      });
      setXpEarned(result.xpEarned || score * 10 + 50);
      analyzeMutation.mutate(result.id);
    } catch (err) {
      console.error("Failed to save result", err);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowFeedback(false);
    } else {
      handleSubmit();
    }
  };

  if (view === 'results') {
    const pct = Math.round((testScore.score / questions.length) * 100);
    const gradeLetter = testScore.level; // now "F" | "E" | "C" | "B" | "A"
    const gradeColor =
      gradeLetter === "A" ? { bg: "bg-emerald-500", light: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", bar: "#10b981" }
      : gradeLetter === "B" ? { bg: "bg-teal-500", light: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", bar: "#14b8a6" }
      : gradeLetter === "C" ? { bg: "bg-blue-500", light: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", bar: "#3b82f6" }
      : gradeLetter === "E" ? { bg: "bg-amber-500", light: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", bar: "#f59e0b" }
      : { bg: "bg-red-500", light: "bg-red-50", border: "border-red-200", text: "text-red-700", bar: "#ef4444" };
    const gradeDesc =
      gradeLetter === "A" ? "Utmärkt! Toppbetyg uppnått!" :
      gradeLetter === "B" ? "Mycket bra jobbat!" :
      gradeLetter === "C" ? "Bra jobbat — sikta på B!" :
      gradeLetter === "E" ? "Godkänt — det finns mer att ge!" :
      "Ej godkänt — fortsätt öva!";

    // Topic analysis
    const topicStats: Record<string, { correct: number; total: number }> = {};
    questions.forEach(q => {
      if (!topicStats[q.topic]) topicStats[q.topic] = { correct: 0, total: 0 };
      topicStats[q.topic].total += 1;
      if (answersMatch(answers[q.id] || "", q.correctAnswer)) topicStats[q.topic].correct += 1;
    });
    const topicEntries = Object.entries(topicStats).sort((a, b) => b[1].total - a[1].total);
    const strongTopics = topicEntries.filter(([, s]) => s.total >= 2 && s.correct / s.total >= 0.7);
    const weakTopics = topicEntries.filter(([, s]) => s.correct / s.total < 0.5);

    const toggleQuestion = (id: number) => setExpandedQuestions(p => ({ ...p, [id]: !p[id] }));

    return (
      <div className="min-h-screen bg-[#fafafa] py-6 sm:py-10">
        <div className="max-w-3xl mx-auto px-4 space-y-6">

          {/* ── SCORE HEADER ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className={`${gradeColor.bg} px-6 py-4 flex items-center justify-between`}>
              <div>
                <h1 className="text-2xl font-extrabold text-white font-display">Prov inlämnat!</h1>
                <p className="text-white/80 text-sm mt-0.5">{gradeDesc}</p>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Award className="w-4 h-4 text-white" />
                <span className="text-white font-bold text-sm">+{xpEarned} XP</span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-6 mb-6">
                {/* Score ring */}
                <div className={`relative w-28 h-28 shrink-0`}>
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                    <circle cx="50" cy="50" r="42" fill="none"
                      stroke={gradeColor.bar}
                      strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${pct * 2.638} 263.8`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-foreground leading-none">{testScore.score}</span>
                    <span className="text-xs text-muted-foreground">/{questions.length}</span>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-5xl font-black ${gradeColor.text}`}>{gradeLetter}</span>
                    <div>
                      <div className="text-sm font-bold text-foreground">{pct}% rätt</div>
                      <div className="text-xs text-muted-foreground">{testScore.score} av {questions.length} rätta svar</div>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${gradeColor.bg}`} />
                  </div>
                  <div className="flex justify-between text-xs mt-1.5">
                    <span className="text-muted-foreground">0</span>
                    <span className="text-amber-600 font-semibold">E ≥10p</span>
                    <span className="text-blue-500 font-semibold">C ≥13p</span>
                    <span className="text-teal-600 font-semibold">B ≥16p</span>
                    <span className="text-emerald-600 font-semibold">A ≥19p</span>
                  </div>
                </div>
              </div>

              {/* Difficulty breakdown */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Lätt", diff: "E", bg: "bg-green-50", border: "border-green-200", text: "text-green-700", bar: "bg-green-400" },
                  { label: "Medel", diff: "C", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", bar: "bg-amber-400" },
                  { label: "Svår", diff: "A", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", bar: "bg-red-400" },
                ].map(({ label, diff, bg, border, text, bar }) => {
                  const qs = questions.filter(q => q.difficulty === diff);
                  const correct = qs.filter(q => answersMatch(answers[q.id] || "", q.correctAnswer)).length;
                  const diffPct = qs.length > 0 ? Math.round((correct / qs.length) * 100) : 0;
                  return (
                    <div key={diff} className={`${bg} border ${border} rounded-2xl p-3`}>
                      <div className={`text-xs font-bold ${text} mb-1`}>{label} ({diff})</div>
                      <div className={`text-xl font-extrabold ${text}`}>{correct}<span className="text-sm font-normal opacity-70">/{qs.length}</span></div>
                      <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div className={`h-full ${bar} rounded-full`} style={{ width: `${diffPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* ── TOPIC ANALYSIS ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border border-border shadow-sm p-6" data-testid="section-topic-analysis">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-primary/5 rounded-xl flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-bold font-display text-lg">Ämnesanalys</h2>
            </div>

            <div className="space-y-2 mb-5">
              {topicEntries.map(([topic, stats]) => {
                const topicPct = Math.round((stats.correct / stats.total) * 100);
                const isStrong = stats.total >= 2 && stats.correct / stats.total >= 0.7;
                const isWeak = stats.correct / stats.total < 0.5;
                const barColor = isStrong ? "bg-emerald-400" : isWeak ? "bg-red-400" : "bg-amber-400";
                const badgeColor = isStrong ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : isWeak ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-amber-50 text-amber-700 border-amber-200";
                return (
                  <div key={topic} className="flex items-center gap-3" data-testid={`topic-row-${topic}`}>
                    <div className="w-28 shrink-0 text-sm font-medium text-foreground truncate">{topic}</div>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${topicPct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full ${barColor} rounded-full`} />
                    </div>
                    <div className="text-xs font-bold text-muted-foreground w-12 text-right shrink-0">{stats.correct}/{stats.total}</div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeColor}`}>
                      {topicPct}%
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {strongTopics.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Du är stark i</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {strongTopics.map(([t]) => (
                      <span key={t} className="text-xs font-semibold bg-white border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {weakTopics.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Öva mer på</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {weakTopics.map(([t]) => (
                      <span key={t} className="text-xs font-semibold bg-white border border-red-200 text-red-700 px-2.5 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {weakTopics.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                onClick={() => {
                  const topicList = weakTopics.map(([t]) => t).join(",");
                  setLocation(`/practice?subject=${encodeURIComponent(smartSubject)}&grade=${encodeURIComponent(grade)}&topics=${encodeURIComponent(topicList)}`);
                }}
                data-testid="button-practice-weak-topics"
                className="mt-4 w-full py-3.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-2xl font-bold text-sm shadow-md shadow-red-100 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Target className="w-4 h-4" />
                Öva på svaga ämnen ({weakTopics.length} {weakTopics.length === 1 ? "ämne" : "ämnen"})
              </motion.button>
            )}
          </motion.div>

          {/* ── AI ANALYSIS ── */}
          {analyzeMutation.isPending && (
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6 flex items-center gap-4">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-sm text-muted-foreground">AI Coach analyserar ditt resultat...</p>
            </div>
          )}

          {aiAnalysis && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl border border-blue-100 shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-16 h-16 text-blue-600" />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">NP Coach Feedback</h3>
              </div>
              <p className="text-slate-700 leading-relaxed mb-5 font-medium italic">"{aiAnalysis.feedback}"</p>
              {aiAnalysis.weakTopics.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Target className="w-3 h-3" /> Fokusera på
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {aiAnalysis.weakTopics.map((topic, i) => (
                      <span key={i} className="px-3 py-1 bg-white border border-blue-200 text-blue-700 rounded-full text-xs font-bold">{topic}</span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Recommended practice questions */}
          {aiAnalysis?.practiceQuestions && aiAnalysis.practiceQuestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-bold font-display text-lg">Rekommenderade övningar</h3>
                <span className="ml-auto text-xs text-muted-foreground">{aiAnalysis.practiceQuestions.length} frågor</span>
              </div>
              <div className="space-y-3">
                {aiAnalysis.practiceQuestions.map((pq, i) => {
                  const revealed = practiceRevealed[pq.id];
                  return (
                    <div key={pq.id} className="border border-slate-100 rounded-2xl p-4 hover:border-primary/20 transition-colors bg-slate-50/50">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <div className="flex-1">
                          <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full">{pq.topic}</span>
                          <p className="text-sm font-medium text-foreground mt-2 leading-relaxed">{pq.questionText}</p>
                        </div>
                      </div>
                      {revealed ? (
                        <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <div className="text-sm font-bold text-emerald-700 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Rätt svar: {pq.correctAnswer}</div>
                          <p className="text-sm text-slate-600">{pq.explanation}</p>
                        </div>
                      ) : (
                        <button onClick={() => setPracticeRevealed(prev => ({ ...prev, [pq.id]: true }))}
                          data-testid={`button-reveal-${pq.id}`}
                          className="mt-1 w-full py-2 text-sm font-semibold text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors">
                          Visa svar och förklaring
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── QUESTION REVIEW ── */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-xl font-bold font-display flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> Genomgång
              </h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {testScore.score} rätt</span>
                <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-red-500" /> {questions.length - testScore.score} fel</span>
              </div>
            </div>

            <div className="space-y-3">
              {questions.map((q, i) => {
                const userAnswerRaw = answers[q.id] || "";
                const isCorrect = answersMatch(userAnswerRaw, q.correctAnswer);
                const isExpanded = expandedQuestions[q.id] !== false; // default expanded

                return (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-colors ${isCorrect ? 'border-emerald-100' : 'border-red-100'}`}
                    data-testid={`question-card-${q.id}`}>

                    {/* Question header — always visible */}
                    <button className="w-full text-left p-4 flex items-center gap-3 hover:bg-slate-50/50 transition-colors"
                      onClick={() => toggleQuestion(q.id)}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {isCorrect
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          : <XCircle className="w-4 h-4 text-red-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-muted-foreground font-medium">Fråga {i + 1}</span>
                          {q.difficulty && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              q.difficulty === 'E' ? 'bg-green-100 text-green-700' :
                              q.difficulty === 'A' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'}`}>
                              {q.difficulty === 'E' ? 'Lätt' : q.difficulty === 'A' ? 'Svår' : 'Medel'}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{q.topic}</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{q.questionText}</p>
                      </div>
                      <div className={`text-xs font-bold shrink-0 px-2.5 py-1 rounded-lg ${isCorrect ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                        {isCorrect ? 'Rätt' : 'Fel'}
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </button>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                          className="overflow-hidden">
                          <div className="px-4 pb-4 border-t border-slate-50">
                            <p className="text-base font-medium text-foreground mt-4 mb-4 leading-relaxed">{q.questionText}</p>

                            {/* Answer comparison — always shows both */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                              <div className={`p-3.5 rounded-xl border ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                <div className={`text-xs font-bold mb-1 flex items-center gap-1 ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                  Ditt svar
                                </div>
                                <div className={`font-semibold text-sm ${isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>
                                  {userAnswerRaw || <span className="italic opacity-60">Inget svar</span>}
                                </div>
                              </div>
                              <div className="p-3.5 rounded-xl border bg-emerald-50 border-emerald-200">
                                <div className="text-xs font-bold text-emerald-600 mb-1 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Rätt svar
                                </div>
                                <div className="font-semibold text-sm text-emerald-800">{q.correctAnswer}</div>
                              </div>
                            </div>

                            {/* Explanation */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                              <div className="flex items-center gap-1.5 text-slate-600 font-bold text-xs mb-2 uppercase tracking-wide">
                                <Lightbulb className="w-3.5 h-3.5" /> Förklaring
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">{q.explanation}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div className="flex flex-col sm:flex-row gap-3 pb-8">
            <button onClick={() => setLocation("/dashboard")}
              className="flex-1 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:opacity-90 transition-opacity text-center"
              data-testid="button-back-to-dashboard">
              Tillbaka till översikt
            </button>
            <button onClick={() => window.location.reload()}
              className="flex-1 px-6 py-3.5 bg-primary text-white rounded-2xl font-bold hover:opacity-90 transition-opacity text-center"
              data-testid="button-new-test">
              Gör ett nytt prov
            </button>
          </div>

        </div>
      </div>
    );
  }

  // TEST VIEW
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* Header Bar */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => {
              if (confirm("Vill du verkligen avbryta provet? Resultatet sparas inte.")) setLocation("/dashboard");
            }}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Avbryt
          </button>
          
          <div className="flex items-center gap-2 font-mono text-lg font-bold bg-slate-100 px-4 py-1.5 rounded-lg text-foreground">
            <Clock className="w-5 h-5 text-primary" />
            <span className={timeLeft < 300 ? "text-red-500" : ""}>{formatTime(timeLeft)}</span>
          </div>

          <button 
            onClick={() => {
              if (confirm("Är du säker på att du vill lämna in provet i förtid?")) handleSubmit();
            }}
            className="text-sm font-semibold text-primary hover:text-primary/80"
          >
            Lämna in
          </button>
        </div>
        <div className="h-1 bg-secondary w-full">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        {isTopicMode && (
          <div className="bg-red-50 border-b border-red-100 px-4 py-1.5 flex items-center justify-center gap-2">
            <Target className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <p className="text-xs font-semibold text-red-700">
              Svag ämnesträning: {topicsParam.split(",").join(" · ")}
            </p>
          </div>
        )}
      </header>

      {/* Main Test Area */}
      <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex justify-between items-center text-sm font-medium text-muted-foreground">
          <span>Fråga {currentIndex + 1} av {questions.length}</span>
          <div className="flex items-center gap-2">
            {currentQ.difficulty && (
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                currentQ.difficulty === 'E' ? 'bg-green-100 text-green-700' :
                currentQ.difficulty === 'A' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`} data-testid="badge-difficulty">
                {currentQ.difficulty === 'E' ? 'Lätt' : currentQ.difficulty === 'A' ? 'Svår' : 'Medel'}
              </span>
            )}
            <span className="bg-secondary px-3 py-1 rounded-full text-foreground">{currentQ.topic}</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl p-8 border border-border shadow-sm flex-1 flex flex-col"
          >
            <h2 className="text-2xl font-medium text-foreground mb-8 leading-relaxed">
              {currentQ.questionText}
            </h2>

            <div className="mt-auto">
              {currentQ.type === 'multiple_choice' && currentQ.options ? (
                <div className="grid gap-3">
                  {currentQ.options.map((opt, i) => {
                    const isSelected = answers[currentQ.id] === opt;
                    const isCorrect = answersMatch(opt, currentQ.correctAnswer);
                    
                    return (
                      <button
                        key={i}
                        disabled={showFeedback}
                        onClick={() => {
                          setAnswers(p => ({ ...p, [currentQ.id]: opt }));
                          setShowFeedback(true);
                        }}
                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                          isSelected 
                            ? showFeedback 
                              ? isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                              : 'border-primary bg-primary/5 shadow-md shadow-primary/10 scale-[1.01]' 
                            : showFeedback && isCorrect
                              ? 'border-green-500 bg-green-50'
                              : 'border-border bg-white hover:border-primary/40 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`inline-block w-6 text-sm font-bold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                              {String.fromCharCode(65 + i)}.
                            </span>
                            <span className={isSelected ? 'font-semibold text-primary' : 'text-foreground'}>
                              {opt}
                            </span>
                          </div>
                          {showFeedback && isSelected && (
                            isCorrect ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          {showFeedback && !isSelected && isCorrect && (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Ditt svar</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      disabled={showFeedback}
                      value={answers[currentQ.id] || ""}
                      onChange={(e) => setAnswers(p => ({ ...p, [currentQ.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !showFeedback && answers[currentQ.id]) {
                          setShowFeedback(true);
                        }
                      }}
                      className={`flex-1 px-5 py-4 rounded-2xl bg-slate-50 border-2 text-lg font-medium text-foreground focus:outline-none transition-all duration-200 ${
                        showFeedback 
                          ? checkCorrect(currentQ, answers[currentQ.id]) 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-red-500 bg-red-50'
                          : 'border-border focus:border-primary focus:bg-white'
                      }`}
                      placeholder="Skriv in ditt svar..."
                    />
                    {!showFeedback && (
                      <button 
                        onClick={() => setShowFeedback(true)}
                        disabled={!answers[currentQ.id]}
                        className="px-6 bg-primary text-white rounded-2xl font-bold disabled:opacity-50"
                      >
                        Svara
                      </button>
                    )}
                  </div>
                </div>
              )}

              {showFeedback && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-8 p-6 rounded-2xl border-2 ${checkCorrect(currentQ, answers[currentQ.id]) ? 'border-green-500/20 bg-green-50/50' : 'border-red-500/20 bg-red-50/50'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {checkCorrect(currentQ, answers[currentQ.id]) ? (
                      <div className="flex items-center gap-2 text-green-700 font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        Rätt svar!
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-700 font-bold">
                        <XCircle className="w-5 h-5" />
                        Inte helt rätt. Rätt svar: {currentQ.correctAnswer}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {currentQ.explanation}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer Navigation */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-end gap-4">
          {showFeedback && (
            <button
              onClick={handleNext}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-4 rounded-xl font-bold bg-primary text-white shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              {currentIndex === questions.length - 1 ? 'Avsluta och se resultat' : 'Nästa fråga'}
              <ArrowRight className="w-6 h-6" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

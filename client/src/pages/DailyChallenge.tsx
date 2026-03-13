import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { apiRequest } from "@/lib/queryClient";
import { answersMatch } from "@/lib/normalize";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, CheckCircle2, XCircle, ChevronRight, Trophy, Zap, Calendar, ArrowLeft, Star } from "lucide-react";
import type { Question, DailyChallenge as DailyChallengeType } from "@shared/schema";

type ChallengeData = { challenge: DailyChallengeType; questions: Question[] };

type AnswerState = {
  selected: string | null;
  submitted: boolean;
  correct: boolean | null;
};

function AnswerButton({ option, state, onSelect }: {
  option: string;
  state: AnswerState;
  onSelect: (o: string) => void;
}) {
  const isSelected = state.selected === option;
  const isCorrectAnswer = state.submitted && state.correct && isSelected;
  const isWrongAnswer = state.submitted && !state.correct && isSelected;

  let cls = "w-full text-left px-4 py-3.5 rounded-2xl border-2 font-medium text-sm transition-all duration-200 ";
  if (!state.submitted) {
    cls += isSelected
      ? "border-primary bg-primary/5 text-primary shadow-sm"
      : "border-border bg-white text-foreground hover:border-primary/40 hover:bg-slate-50";
  } else if (isCorrectAnswer) {
    cls += "border-emerald-400 bg-emerald-50 text-emerald-700";
  } else if (isWrongAnswer) {
    cls += "border-red-400 bg-red-50 text-red-700";
  } else {
    cls += "border-border bg-white text-muted-foreground opacity-60";
  }

  return (
    <button className={cls} onClick={() => !state.submitted && onSelect(option)}
      disabled={state.submitted} data-testid={`answer-option-${option.slice(0, 10)}`}>
      {option}
    </button>
  );
}

function CompletedScreen({ score, xpEarned, streak, onBack }: {
  score: number; xpEarned: number; streak: number; onBack: () => void;
}) {
  const pct = Math.round((score / 5) * 100);
  const msg =
    pct === 100 ? "Perfekt! Otroligt bra jobbat! 🏆" :
    pct >= 80 ? "Fantastiskt! Nästan perfekt!" :
    pct >= 60 ? "Bra kämpat! Fortsätt så!" :
    pct >= 40 ? "Okej resultat — öva mer imorgon!" :
    "Försök igen imorgon!";

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl shadow-orange-100 border border-orange-100 p-8 max-w-sm w-full text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
          <Flame className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold font-display mb-1">Utmaning klar!</h2>
        <p className="text-muted-foreground text-sm mb-6">{msg}</p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-50 rounded-2xl p-3">
            <div className="text-2xl font-extrabold text-foreground">{score}/5</div>
            <div className="text-xs text-muted-foreground mt-0.5">Rätta svar</div>
          </div>
          <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100">
            <div className="text-2xl font-extrabold text-amber-600 flex items-center justify-center gap-1">
              <Flame className="w-5 h-5" />{streak}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Dagars streak</div>
          </div>
          <div className="bg-violet-50 rounded-2xl p-3 border border-violet-100">
            <div className="text-2xl font-extrabold text-violet-600 flex items-center justify-center gap-1">
              <Zap className="w-4 h-4" />{xpEarned}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">XP intjänat</div>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`flex-1 h-2.5 rounded-full ${i <= score ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-slate-100"}`} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-6">{pct}% rätt</p>

        <button onClick={onBack} data-testid="button-back-to-dashboard"
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold shadow-md shadow-orange-200 hover:opacity-90 transition-opacity">
          Tillbaka till startsidan
        </button>
      </div>
    </motion.div>
  );
}

function AlreadyCompleted({ challenge, onBack }: { challenge: DailyChallengeType; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-orange-100 p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-extrabold font-display mb-2">Redan avklarad!</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Du har redan gjort dagens utmaning. Kom tillbaka imorgon för en ny!
        </p>
        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <div className="text-3xl font-extrabold text-foreground">{challenge.score}/5</div>
          <div className="text-sm text-muted-foreground">Ditt resultat idag</div>
          <div className="flex gap-1.5 mt-2 justify-center">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`w-6 h-2.5 rounded-full ${i <= (challenge.score || 0) ? "bg-orange-400" : "bg-slate-200"}`} />
            ))}
          </div>
        </div>
        <button onClick={onBack} className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity">
          Tillbaka
        </button>
      </div>
    </div>
  );
}

export default function DailyChallenge() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<AnswerState>({ selected: null, submitted: false, correct: null });
  const [finishedData, setFinishedData] = useState<{ score: number; xpEarned: number; streak: number } | null>(null);

  const { data, isLoading, error } = useQuery<ChallengeData>({
    queryKey: ["/api/daily-challenge"],
    queryFn: async () => {
      const res = await fetch("/api/daily-challenge", { credentials: "include" });
      if (!res.ok) throw new Error("Kunde inte ladda utmaningen");
      return res.json();
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ challengeId, score }: { challengeId: number; score: number }) => {
      const res = await apiRequest("POST", "/api/daily-challenge/complete", { challengeId, score });
      if (!res.ok) throw new Error("Kunde inte slutföra utmaningen");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-challenge"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setFinishedData({ score: data.challenge.score, xpEarned: data.xpEarned, streak: data.streak });
    },
  });

  const handleSelect = (option: string) => {
    setCurrentAnswer(prev => ({ ...prev, selected: option }));
  };

  const handleSubmit = () => {
    if (!currentAnswer.selected || !data) return;
    const q = data.questions[currentIdx];
    const correct = answersMatch(currentAnswer.selected, q.correctAnswer);
    setCurrentAnswer(prev => ({ ...prev, submitted: true, correct }));
  };

  const handleNext = () => {
    if (!data) return;
    const newAnswers = [...answers, currentAnswer];

    if (currentIdx + 1 < data.questions.length) {
      setAnswers(newAnswers);
      setCurrentIdx(currentIdx + 1);
      setCurrentAnswer({ selected: null, submitted: false, correct: null });
    } else {
      const score = newAnswers.filter(a => a.correct).length;
      completeMutation.mutate({ challengeId: data.challenge.id, score });
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-red-500 font-semibold mb-4">Kunde inte ladda utmaningen.</p>
        <button onClick={() => setLocation("/dashboard")} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold">
          Tillbaka
        </button>
      </div>
    </div>
  );

  if (finishedData) {
    return <CompletedScreen {...finishedData} onBack={() => setLocation("/dashboard")} />;
  }

  if (data.challenge.completed) {
    return <AlreadyCompleted challenge={data.challenge} onBack={() => setLocation("/dashboard")} />;
  }

  const q = data.questions[currentIdx];
  const totalAnswered = answers.length;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setLocation("/dashboard")}
            className="p-2 rounded-xl border border-border bg-white hover:bg-slate-50 transition-colors"
            data-testid="button-back">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <h1 className="font-extrabold font-display text-xl">Daglig Utmaning</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">5 frågor · Avsluta för att bevara din streak</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-bold text-orange-600">Dag {new Date().getDate()}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-6">
          {data.questions.map((_, i) => {
            const done = i < totalAnswered;
            const current = i === currentIdx;
            return (
              <div key={i} className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                done ? "bg-orange-400" : current ? "bg-orange-200" : "bg-slate-100"
              }`} />
            );
          })}
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div key={currentIdx}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl border border-border shadow-sm p-6 mb-4">

            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold text-muted-foreground bg-slate-100 px-2.5 py-1 rounded-lg">
                Fråga {currentIdx + 1} / 5
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                q.difficulty === "E" ? "bg-green-100 text-green-700"
                : q.difficulty === "A" ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
              }`}>
                {q.difficulty === "E" ? "Lätt" : q.difficulty === "A" ? "Svår" : "Medel"}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">{q.subject} · {q.topic}</span>
            </div>

            <p className="text-base font-semibold text-foreground mb-5 leading-relaxed" data-testid="question-text">
              {q.questionText}
            </p>

            <div className="space-y-2.5" data-testid="answer-options">
              {(q.options || []).map((opt, i) => (
                <AnswerButton key={i} option={opt} state={currentAnswer} onSelect={handleSelect} />
              ))}
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {currentAnswer.submitted && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 p-4 rounded-2xl flex gap-3 ${currentAnswer.correct ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                  {currentAnswer.correct
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className={`text-sm font-bold mb-0.5 ${currentAnswer.correct ? "text-emerald-700" : "text-red-700"}`}>
                      {currentAnswer.correct ? "Rätt svar!" : `Fel — rätt svar: ${q.correctAnswer}`}
                    </p>
                    <p className="text-xs text-slate-600">{q.explanation}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Action button */}
        {!currentAnswer.submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!currentAnswer.selected}
            data-testid="button-submit-answer"
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-bold text-base shadow-md shadow-orange-200 disabled:opacity-40 disabled:shadow-none hover:opacity-90 transition-all">
            Svara
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={completeMutation.isPending}
            data-testid="button-next-question"
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-bold text-base shadow-md shadow-orange-200 hover:opacity-90 transition-all flex items-center justify-center gap-2">
            {completeMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : currentIdx + 1 < 5 ? (
              <><span>Nästa fråga</span><ChevronRight className="w-5 h-5" /></>
            ) : (
              <><Star className="w-5 h-5" /><span>Slutför utmaning</span></>
            )}
          </button>
        )}

        {/* Streak mini-display */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Flame className="w-4 h-4 text-orange-400" />
          <span>Avsluta utmaningen varje dag för att hålla din streak igång!</span>
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Swords, Trophy, Copy, Check, Clock, Users, ChevronRight,
  Zap, Crown, Minus, Share2, RefreshCw, LayoutDashboard
} from "lucide-react";
import type { Question, VersusChallenge } from "@shared/schema";

type View = "create" | "lobby" | "info" | "quiz" | "waiting" | "results";

interface ChallengeData {
  challenge: VersusChallenge;
  questions: Question[];
  creatorName: string;
  opponentName: string | null;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getDisplayName(user: { username?: string; email?: string } | null | undefined) {
  if (!user) return "Okänd";
  return user.username || user.email?.split("@")[0] || "Okänd";
}

export default function Challenge() {
  const { code } = useParams<{ code?: string }>();
  const [, setLocation] = useLocation();
  const { data: user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>(code ? "info" : "create");
  const [createdCode, setCreatedCode] = useState<string | null>(code || null);
  const [copied, setCopied] = useState(false);

  // Create form
  const [subject, setSubject] = useState("Matematik");
  const [numQuestions, setNumQuestions] = useState(10);
  const [timeLimit, setTimeLimit] = useState(180);

  // Quiz state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch challenge data (polls when waiting)
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const activeCode = createdCode || code;

  const { data: challengeData, refetch } = useQuery<ChallengeData>({
    queryKey: ["/api/versus", activeCode],
    queryFn: () => fetch(`/api/versus/${activeCode}`).then(r => r.json()),
    enabled: !!activeCode,
    refetchInterval: pollingEnabled ? 3000 : false,
  });

  const challenge = challengeData?.challenge;
  const questions = challengeData?.questions ?? [];

  // Create challenge
  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/versus", { subject, numQuestions, timeLimit }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setCreatedCode(data.challenge.code);
      setView("lobby");
      queryClient.invalidateQueries({ queryKey: ["/api/versus", data.challenge.code] });
    },
    onError: () => toast({ title: "Fel", description: "Kunde inte skapa utmaning", variant: "destructive" }),
  });

  // Join challenge
  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/versus/${activeCode}/join`, {}),
    onSuccess: () => {
      startQuiz();
    },
    onError: (err: any) => toast({ title: "Fel", description: err.message || "Kunde inte gå med", variant: "destructive" }),
  });

  // Submit result
  const submitMutation = useMutation({
    mutationFn: ({ score, timeTaken }: { score: number; timeTaken: number }) =>
      apiRequest("POST", `/api/versus/${activeCode}/submit`, { score, timeTaken }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      if (data.challenge.status === "completed") {
        queryClient.invalidateQueries({ queryKey: ["/api/versus", activeCode] });
        setPollingEnabled(false);
        setView("results");
      } else {
        setPollingEnabled(true);
        setView("waiting");
      }
    },
  });

  // Start the quiz timer
  const startQuiz = useCallback(() => {
    if (!challenge) return;
    setCurrentIdx(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setTimeLeft(challenge.timeLimit);
    setStartTime(Date.now());
    setView("quiz");
  }, [challenge]);

  // Timer countdown
  useEffect(() => {
    if (view !== "quiz") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [view]);

  // If we opened /challenge/:code and we're logged in, check if we're creator
  useEffect(() => {
    if (code && challenge && user) {
      const isCreator = challenge.creatorId === user.id;
      const isOpponent = challenge.opponentId === user.id;

      if (view === "info") {
        if (challenge.status === "completed") {
          setView("results");
        } else if (isCreator && challenge.creatorScore !== null && challenge.creatorScore !== undefined) {
          setPollingEnabled(true);
          setView("waiting");
        } else if (isOpponent && challenge.opponentScore !== null && challenge.opponentScore !== undefined) {
          setPollingEnabled(true);
          setView("waiting");
        }
      }
    }
  }, [challenge, user, code, view]);

  // Poll resolution
  useEffect(() => {
    if (pollingEnabled && challenge?.status === "completed") {
      setPollingEnabled(false);
      setView("results");
    }
  }, [challenge?.status, pollingEnabled]);

  const handleSelectAnswer = (answer: string) => {
    if (showFeedback) return;
    setSelectedAnswer(answer);
    setShowFeedback(true);

    const q = questions[currentIdx];
    const newAnswers = [...answers];
    newAnswers[currentIdx] = answer;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    clearInterval(timerRef.current!);
    const taken = Math.floor((Date.now() - startTime) / 1000);
    setTimeTaken(taken);

    const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correctAnswer ? 1 : 0), 0);
    submitMutation.mutate({ score, timeTaken: taken });
  };

  const copyLink = () => {
    const link = `${window.location.origin}/challenge/${createdCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Länk kopierad!" });
  };

  // ─── Views ───────────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navbar />
        <div className="max-w-md mx-auto px-4 pt-20 text-center">
          <Swords className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Du måste vara inloggad</h1>
          <p className="text-muted-foreground mb-6">Logga in för att kunna utmana en vän.</p>
          <Button onClick={() => setLocation("/auth")}>Logga in</Button>
        </div>
      </div>
    );
  }

  // CREATE FORM
  if (view === "create") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-primary/20">
              <Swords className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Versus-läge</h1>
            <p className="text-muted-foreground mt-2">Skapa en utmaning och dela länken med en vän</p>
          </div>

          <Card className="p-6 space-y-5 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">Ämne</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger data-testid="select-subject" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Matematik">Matematik</SelectItem>
                  <SelectItem value="Svenska">Svenska</SelectItem>
                  <SelectItem value="Engelska">Engelska</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">Antal frågor</label>
              <div className="flex gap-2">
                {[5, 10, 20].map(n => (
                  <button
                    key={n}
                    data-testid={`button-num-${n}`}
                    onClick={() => setNumQuestions(n)}
                    className={`flex-1 h-12 rounded-xl font-bold text-sm transition-all border-2 ${
                      numQuestions === n
                        ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                        : "bg-white text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">Tidsgräns</label>
              <div className="flex gap-2">
                {[
                  { label: "2 min", value: 120 },
                  { label: "3 min", value: 180 },
                  { label: "5 min", value: 300 },
                  { label: "10 min", value: 600 },
                ].map(opt => (
                  <button
                    key={opt.value}
                    data-testid={`button-time-${opt.value}`}
                    onClick={() => setTimeLimit(opt.value)}
                    className={`flex-1 h-12 rounded-xl font-bold text-sm transition-all border-2 ${
                      timeLimit === opt.value
                        ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                        : "bg-white text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              data-testid="button-create-challenge"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20"
            >
              {createMutation.isPending ? "Skapar..." : "Skapa utmaning →"}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // LOBBY — challenge created, waiting for opponent
  if (view === "lobby") {
    const link = `${window.location.origin}/challenge/${createdCode}`;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
              <Check className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Utmaning skapad!</h1>
            <p className="text-muted-foreground mt-2">Dela länken med din vän</p>
          </div>

          <Card className="p-6 space-y-5 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="bg-slate-50 rounded-xl p-4 border border-border">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Utmaningslänk</div>
              <div className="font-mono text-sm text-foreground break-all mb-3">{link}</div>
              <Button
                data-testid="button-copy-link"
                variant="outline"
                size="sm"
                onClick={copyLink}
                className="w-full gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? "Kopierat!" : "Kopiera länk"}
              </Button>
            </div>

            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <Clock className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-amber-800">Ämne: {challengeData?.challenge.subject ?? subject}</div>
                <div className="text-xs text-amber-700 mt-0.5">
                  {numQuestions} frågor · {formatTime(timeLimit)} tidsgräns
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                data-testid="button-start-now"
                onClick={startQuiz}
                className="h-12 font-bold shadow-md shadow-primary/20"
              >
                Spela nu
              </Button>
              <Button
                data-testid="button-share-challenge"
                variant="outline"
                onClick={copyLink}
                className="h-12 font-bold gap-2"
              >
                <Share2 className="w-4 h-4" />
                Dela
              </Button>
            </div>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Du kan spela nu eller vänta tills din vän accepterar
          </p>
        </div>
      </div>
    );
  }

  // INFO — opponent opens the link and sees challenge details
  if (view === "info" && challenge) {
    const isCreator = challenge.creatorId === user.id;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-primary/20">
              <Swords className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Du är utmanad!</h1>
            <p className="text-muted-foreground mt-2">
              <span className="font-semibold text-foreground">{challengeData?.creatorName}</span> har utmanat dig
            </p>
          </div>

          <Card className="p-6 space-y-4 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <div className="text-2xl font-bold text-primary">{challenge.numQuestions}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">Frågor</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-amber-600">{formatTime(challenge.timeLimit)}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">Tidsgräns</div>
              </div>
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-violet-600 text-sm leading-tight mt-1">{challenge.subject}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">Ämne</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 border border-border">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
                {challengeData?.creatorName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-sm">{challengeData?.creatorName}</div>
                <div className="text-xs text-muted-foreground">Utmanare</div>
              </div>
              <Swords className="w-5 h-5 text-muted-foreground mx-auto" />
              <div className="text-right">
                <div className="font-semibold text-sm">{getDisplayName(user)}</div>
                <div className="text-xs text-muted-foreground">Du</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-sm text-slate-500">
                {getDisplayName(user).charAt(0).toUpperCase()}
              </div>
            </div>

            {isCreator ? (
              <Button data-testid="button-start-quiz" onClick={startQuiz} className="w-full h-12 font-bold">
                Spela nu
              </Button>
            ) : (
              <Button
                data-testid="button-accept-challenge"
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending}
                className="w-full h-12 font-bold shadow-lg shadow-primary/20 text-base"
              >
                {joinMutation.isPending ? "Förbereder..." : "Acceptera utmaning →"}
              </Button>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // QUIZ
  if (view === "quiz" && questions.length > 0) {
    const q = questions[currentIdx];
    const progress = ((currentIdx) / questions.length) * 100;
    const timerPct = (timeLeft / (challenge?.timeLimit ?? 180)) * 100;
    const timerColor = timeLeft < 30 ? "text-red-500" : timeLeft < 60 ? "text-amber-500" : "text-emerald-600";

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm text-primary">Versus</span>
            </div>
            <div className={`flex items-center gap-1.5 font-mono font-bold text-lg ${timerColor}`} data-testid="timer-display">
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-muted-foreground font-medium">
              {currentIdx + 1} / {questions.length}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-slate-200 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Question card */}
          <Card className="p-6 mb-4 shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Fråga {currentIdx + 1}
            </div>
            <p className="text-lg font-semibold leading-relaxed" data-testid="question-text">
              {q.questionText}
            </p>
          </Card>

          {/* Options */}
          <div className="space-y-2.5">
            {(q.options as string[])?.map((opt, i) => {
              const isSelected = selectedAnswer === opt;
              const isCorrect = opt === q.correctAnswer;
              let cls = "w-full p-4 rounded-xl border-2 text-left font-medium transition-all ";
              if (!showFeedback) {
                cls += "bg-white border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-md";
              } else if (isCorrect) {
                cls += "bg-emerald-50 border-emerald-400 text-emerald-800";
              } else if (isSelected && !isCorrect) {
                cls += "bg-red-50 border-red-400 text-red-800";
              } else {
                cls += "bg-white border-border text-muted-foreground opacity-60";
              }

              return (
                <button
                  key={i}
                  data-testid={`option-${i}`}
                  onClick={() => handleSelectAnswer(opt)}
                  disabled={showFeedback}
                  className={cls}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div className="mt-4">
              <Button
                data-testid="button-next-question"
                onClick={handleNext}
                className="w-full h-12 font-bold gap-2"
              >
                {currentIdx < questions.length - 1 ? (
                  <>Nästa fråga <ChevronRight className="w-4 h-4" /></>
                ) : (
                  <>Lämna in <Check className="w-4 h-4" /></>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // WAITING — submitted, waiting for opponent
  if (view === "waiting") {
    const isCreator = challenge?.creatorId === user.id;
    const myScore = isCreator ? challenge?.creatorScore : challenge?.opponentScore;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-6">
            <RefreshCw className="w-7 h-7 text-primary animate-spin" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Väntar på motståndaren...</h1>
          <p className="text-muted-foreground mb-6">
            Du fick <span className="font-bold text-foreground">{myScore}/{questions.length || challenge?.numQuestions}</span> rätt. Sidan uppdateras automatiskt.
          </p>
          <Card className="p-5 bg-white/80 shadow-lg border-0">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              Väntar på att motståndaren ska slutföra provet...
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // RESULTS
  if (view === "results" && challenge) {
    const isCreator = challenge.creatorId === user.id;
    const myScore = isCreator ? challenge.creatorScore : challenge.opponentScore;
    const myTime = isCreator ? challenge.creatorTime : challenge.opponentTime;
    const theirScore = isCreator ? challenge.opponentScore : challenge.creatorScore;
    const theirTime = isCreator ? challenge.opponentTime : challenge.creatorTime;
    const total = challenge.numQuestions;

    const myName = getDisplayName(user);
    const theirName = isCreator ? (challengeData?.opponentName ?? "Motståndaren") : (challengeData?.creatorName ?? "Utmanaren");

    const iWon = challenge.winnerId === user.id;
    const isDraw = myScore === theirScore;
    const isCompleted = challenge.status === "completed" && theirScore !== null && theirScore !== undefined;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-10">
          {/* Winner banner */}
          <div className={`rounded-2xl p-6 text-center mb-6 text-white shadow-xl ${
            !isCompleted
              ? "bg-gradient-to-br from-slate-500 to-slate-600"
              : iWon
              ? "bg-gradient-to-br from-emerald-500 to-teal-600"
              : isDraw
              ? "bg-gradient-to-br from-amber-500 to-orange-500"
              : "bg-gradient-to-br from-slate-500 to-slate-600"
          }`}>
            {!isCompleted ? (
              <>
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin opacity-80" />
                <div className="text-xl font-bold">Väntar på resultat...</div>
              </>
            ) : iWon ? (
              <>
                <Crown className="w-10 h-10 mx-auto mb-2 drop-shadow-lg" />
                <div className="text-3xl font-bold">Du vann!</div>
                <div className="text-emerald-100 mt-1">Grattis till segern!</div>
              </>
            ) : isDraw ? (
              <>
                <Minus className="w-10 h-10 mx-auto mb-2 opacity-80" />
                <div className="text-3xl font-bold">Oavgjort!</div>
                <div className="text-amber-100 mt-1">
                  {(myTime ?? 0) <= (theirTime ?? 9999) ? "Du var snabbare — du vinner på tid!" : "Motståndaren var snabbare"}
                </div>
              </>
            ) : (
              <>
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-80" />
                <div className="text-3xl font-bold">Motståndaren vann</div>
                <div className="text-slate-200 mt-1">Bättre lycka nästa gång!</div>
              </>
            )}
          </div>

          {/* Score card */}
          <Card className="p-6 shadow-xl border-0 bg-white/90 backdrop-blur-sm mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">Resultat</h2>

            <div className="flex items-center gap-4">
              {/* My score */}
              <div className="flex-1 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-lg text-primary mx-auto mb-2">
                  {myName.charAt(0).toUpperCase()}
                </div>
                <div className="font-semibold text-sm mb-1">{myName} (du)</div>
                <div className="text-3xl font-bold text-foreground" data-testid="my-score">{myScore ?? "–"}/{total}</div>
                {myTime !== null && myTime !== undefined && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />{formatTime(myTime)}
                  </div>
                )}
                {challenge.winnerId === user.id && (
                  <div className="mt-2 inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" /> Vinnare
                  </div>
                )}
              </div>

              {/* VS divider */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-px h-16 bg-border" />
                <div className="text-xs font-bold text-muted-foreground bg-slate-100 px-2 py-1 rounded-full">VS</div>
                <div className="w-px h-16 bg-border" />
              </div>

              {/* Their score */}
              <div className="flex-1 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-lg text-slate-500 mx-auto mb-2">
                  {theirName.charAt(0).toUpperCase()}
                </div>
                <div className="font-semibold text-sm mb-1">{theirName}</div>
                {isCompleted ? (
                  <>
                    <div className="text-3xl font-bold text-foreground" data-testid="their-score">{theirScore}/{total}</div>
                    {theirTime !== null && theirTime !== undefined && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />{formatTime(theirTime)}
                      </div>
                    )}
                    {challenge.winnerId !== user.id && challenge.winnerId !== null && (
                      <div className="mt-2 inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        <Crown className="w-3 h-3" /> Vinnare
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-lg text-muted-foreground font-medium flex items-center justify-center gap-1">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Spelar...
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* XP earned */}
          {isCompleted && (
            <Card className="p-4 mb-4 shadow-md border-0 bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <span className="font-bold text-primary">+{(myScore ?? 0) * 10 + 20} XP intjänade!</span>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              data-testid="button-back-to-dashboard"
              variant="outline"
              onClick={() => setLocation("/dashboard")}
              className="h-12 gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              Översikt
            </Button>
            <Button
              data-testid="button-new-challenge"
              onClick={() => setLocation("/versus")}
              className="h-12 gap-2 font-bold shadow-md shadow-primary/20"
            >
              <Swords className="w-4 h-4" />
              Ny utmaning
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading / fallback
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />
      <div className="flex items-center justify-center pt-32">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Laddar utmaning...</p>
        </div>
      </div>
    </div>
  );
}

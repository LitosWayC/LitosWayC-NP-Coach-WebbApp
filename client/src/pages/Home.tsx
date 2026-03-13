import { useState } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, TrendingUp, BrainCircuit, Zap, Flame, Trophy, Star, Calculator, BookOpen, MessageSquare, Sparkles, ShieldCheck } from "lucide-react";

const EXAMPLE_QUESTIONS = [
  {
    subject: "Matematik",
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
    icon: Calculator,
    topic: "Algebra",
    question: "Lös ekvationen: 3x + 7 = 22",
    options: ["x = 4", "x = 5", "x = 6", "x = 7"],
    correct: "x = 5",
    explanation: "3x = 22 − 7 = 15, alltså x = 15 ÷ 3 = 5.",
  },
  {
    subject: "Svenska",
    color: "from-purple-500 to-pink-500",
    bg: "bg-purple-50",
    badge: "bg-purple-100 text-purple-700",
    icon: BookOpen,
    topic: "Grammatik",
    question: "Vilket ord är ett adjektiv i meningen: 'Den röda bilen kör fort.'",
    options: ["bilen", "röda", "kör", "fort"],
    correct: "röda",
    explanation: "'Röda' beskriver substantivet 'bilen' och är därför ett adjektiv.",
  },
  {
    subject: "Engelska",
    color: "from-orange-500 to-yellow-500",
    bg: "bg-orange-50",
    badge: "bg-orange-100 text-orange-700",
    icon: MessageSquare,
    topic: "Grammar",
    question: "Choose the correct form: She ___ to school every day.",
    options: ["go", "goes", "going", "gone"],
    correct: "goes",
    explanation: "In the third person singular (she/he/it), we add -s to the verb in the present simple.",
  },
];

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "AI-Coach efter varje prov",
    desc: "Få personlig analys av dina svagheter och konkreta tips för att förbättra dig — direkt efter att du avslutar ett prov.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: Zap,
    title: "XP & Nivåsystem",
    desc: "Tjäna XP för varje rätt svar, klättra i nivåerna och tävla mot klasskamrater på topplistan.",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    icon: Sparkles,
    title: "Smart Träning",
    desc: "Appen identifierar dina svagaste ämnesområden och skapar ett anpassat övningsläge automatiskt.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Flame,
    title: "Daglig Streak",
    desc: "Svara på en dagsfråga varje dag och bygg upp din streak. Konsekvent träning ger bäst resultat!",
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    icon: Trophy,
    title: "Topplista",
    desc: "Se hur du rankar mot andra elever. Lite vänlig konkurrens är det bästa motivationsverktyget.",
    color: "text-yellow-500",
    bg: "bg-yellow-50",
  },
  {
    icon: ShieldCheck,
    title: "NP-anpassade frågor",
    desc: "Alla frågor är utformade för att spegla de faktiska nationella proven för Åk 9.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
];

const STATS = [
  { value: "3", label: "Ämnen" },
  { value: "100+", label: "NP-frågor" },
  { value: "Gratis", label: "Att komma igång" },
  { value: "Åk 9", label: "Anpassat för" },
];

const TESTIMONIALS = [
  { name: "Alicia S.", location: "Stockholm", text: "Jag gick upp ett helt betyg tack vare Smart Träning-läget. Det fokuserade exakt på det jag var dålig på!", stars: 5 },
  { name: "Markus L.", location: "Göteborg", text: "Dagsfrågan varje dag gör att jag faktiskt övar kontinuerligt. Och topplistan mot klasskamraterna är kul!", stars: 5 },
  { name: "Fatima A.", location: "Malmö", text: "AI-coachen förklarade varför jag hade fel på ett sätt som min lärare aldrig gjort. Rekommenderar starkt!", stars: 5 },
];

function ExampleQuestion() {
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const q = EXAMPLE_QUESTIONS[active];
  const Icon = q.icon;

  const handleSwitch = (i: number) => {
    setActive(i);
    setSelected(null);
    setAnswered(false);
  };

  const handleAnswer = (opt: string) => {
    if (answered) return;
    setSelected(opt);
    setAnswered(true);
  };

  return (
    <div className="bg-white rounded-3xl border border-border shadow-xl overflow-hidden">
      {/* Subject tabs */}
      <div className="flex border-b border-border">
        {EXAMPLE_QUESTIONS.map((eq, i) => {
          const EIcon = eq.icon;
          return (
            <button key={i} onClick={() => handleSwitch(i)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all border-b-2 ${active === i ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              data-testid={`tab-subject-${i}`}
            >
              <EIcon className="w-4 h-4 hidden sm:block" />
              {eq.subject}
            </button>
          );
        })}
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${q.badge}`}>{q.topic}</span>
          <span className="text-xs text-muted-foreground">Nationella Prov · Åk 9</span>
        </div>
        <p className="text-base font-semibold text-foreground mb-5 leading-relaxed">{q.question}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {q.options.map((opt, i) => {
            let style = "border-border hover:border-primary/50 hover:bg-slate-50";
            if (answered && opt === q.correct) style = "border-green-400 bg-green-50 text-green-700";
            else if (answered && opt === selected && opt !== q.correct) style = "border-red-300 bg-red-50 text-red-600";
            else if (!answered && selected === opt) style = "border-primary bg-primary/5";
            return (
              <button key={i} onClick={() => handleAnswer(opt)}
                className={`text-left px-4 py-3 rounded-xl border-2 text-sm transition-all font-medium ${style}`}
              >
                <span className="font-bold text-muted-foreground mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {answered && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl text-sm ${selected === q.correct ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}
            >
              <p className="font-bold mb-1 flex items-center gap-2">
                {selected === q.correct
                  ? <><CheckCircle2 className="w-4 h-4" /> Rätt! +10 XP</>
                  : <><span>✗</span> Fel! Rätt svar: {q.correct}</>}
              </p>
              <p className="opacity-80">{q.explanation}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {!answered && (
          <p className="text-xs text-muted-foreground text-center mt-2">Välj ett alternativ för att se svaret</p>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fafafa] relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] rounded-full bg-primary/8 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-accent/8 blur-[120px] pointer-events-none" />

      <Navbar />

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wide inline-flex items-center gap-2 mb-6 border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Nationella Prov · Åk 9
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight text-foreground leading-[1.1] mb-5">
              Klara NP med{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                självförtroende
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              Träna på riktiga NP-frågor i Matematik, Svenska och Engelska. Få personlig AI-feedback, bygg streaks och tävla på topplistan.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link href="/auth"
                className="px-7 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-primary to-primary/90 text-white shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group"
                data-testid="link-start-free"
              >
                Börja träna gratis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#example" className="px-7 py-4 rounded-2xl font-bold text-base border-2 border-border text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 flex items-center justify-center gap-2">
                Se exempelfråga
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {STATS.map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-xl font-extrabold text-primary">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Subject cards */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="hidden lg:flex flex-col gap-4"
          >
            {[
              { name: "Matematik NP", desc: "Algebra, geometri, statistik, sannolikhet", icon: Calculator, grad: "from-blue-500 to-cyan-500", count: "35+ frågor" },
              { name: "Svenska NP", desc: "Läsförståelse, grammatik, litteraturhistoria", icon: BookOpen, grad: "from-purple-500 to-pink-500", count: "30+ frågor" },
              { name: "Engelska NP", desc: "Grammar, vocabulary, reading comprehension", icon: MessageSquare, grad: "from-orange-500 to-yellow-500", count: "30+ frågor" },
            ].map((sub, i) => {
              const Icon = sub.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                  className={`bg-gradient-to-br ${sub.grad} p-0.5 rounded-2xl shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300`}
                >
                  <div className="bg-white rounded-[0.85rem] p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${sub.grad} flex items-center justify-center text-white shadow-md shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-foreground">{sub.name}</div>
                      <div className="text-sm text-muted-foreground">{sub.desc}</div>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground bg-slate-50 px-2.5 py-1 rounded-full shrink-0">{sub.count}</span>
                  </div>
                </motion.div>
              );
            })}
            <div className="flex items-center gap-3 text-sm text-muted-foreground pl-2 mt-1">
              <div className="flex -space-x-2">
                {["A", "M", "F"].map((l, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm">
                    {l}
                  </div>
                ))}
              </div>
              <span>Hundratals elever övar just nu</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* EXAMPLE QUESTION */}
      <section id="example" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold font-display mb-3">Prova en exempelfråga</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Upplev hur det känns att öva med NP Coach — välj ämne och besvara frågan!</p>
        </div>
        <div className="max-w-2xl mx-auto">
          <ExampleQuestion />
          <div className="mt-6 text-center">
            <Link href="/auth" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-base bg-primary text-white hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
              Skapa konto och öva mer
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold font-display mb-3">Allt du behöver för NP</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">NP Coach är byggt för att ge dig det bästa möjliga underlaget inför provet.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className="bg-white rounded-3xl border border-border p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300"
              >
                <div className={`w-12 h-12 ${f.bg} rounded-2xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${f.color}`} />
                </div>
                <h3 className="font-bold text-base mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="bg-white rounded-3xl border border-border p-8 sm:p-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold font-display mb-3">Hur det fungerar</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Komma igång tar under en minut.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Skapa konto", desc: "Registrera dig gratis på under 30 sekunder — inget kreditkort behövs.", icon: "✍️" },
              { step: "2", title: "Välj ämne & träna", desc: "Välj Matematik, Svenska eller Engelska och starta ett prov direkt.", icon: "📚" },
              { step: "3", title: "Följ din progress", desc: "Håll koll på ditt XP, din streak och din betygsnivåuppskattning varje dag.", icon: "📈" },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-3xl">{s.icon}</div>
                <div className="inline-flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{s.step}</span>
                  <h3 className="font-bold text-base">{s.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold font-display mb-3">Vad eleverna säger</h2>
          <p className="text-muted-foreground">Riktiga berättelser från elever som förbereder sig inför NP.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-white rounded-3xl border border-border p-6"
            >
              <div className="flex gap-1 mb-3">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.location}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pb-32 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-gradient-to-br from-primary to-accent rounded-3xl p-10 sm:p-14 text-white text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]" />
          <div className="relative z-10">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display mb-3">Redo att klara NP?</h2>
            <p className="text-white/80 max-w-lg mx-auto mb-8 text-lg">
              Gå med tusentals elever som förbereder sig smartare. Kom igång gratis idag!
            </p>
            <Link href="/auth"
              className="inline-flex items-center gap-2 px-9 py-4 bg-white text-primary font-bold rounded-2xl text-base hover:bg-opacity-95 shadow-xl transition-all hover:-translate-y-0.5 group"
              data-testid="link-cta-register"
            >
              Börja träna gratis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-border bg-white/60 backdrop-blur-sm py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-display font-bold text-sm">
            <BookOpen className="w-4 h-4 text-primary" /> NP Coach
          </div>
          <p className="text-xs text-muted-foreground">Anpassad för Nationella Prov · Åk 9 · Matematik, Svenska, Engelska</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/auth" className="hover:text-foreground transition-colors">Logga in</Link>
            <Link href="/auth" className="hover:text-foreground transition-colors">Skapa konto</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

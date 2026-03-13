import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Shield, Search, X, Check, BookOpen, Calculator, MessageSquare, Users, ChevronDown } from "lucide-react";
import type { Question } from "@shared/schema";

const SUBJECTS = ["Matematik", "Svenska", "Engelska"];
const DIFFICULTIES = ["E", "C", "A"] as const;
const TYPES = ["multiple_choice", "numeric", "open"] as const;
type QType = typeof TYPES[number];
type Difficulty = typeof DIFFICULTIES[number];

const TOPIC_OPTIONS: Record<string, string[]> = {
  Matematik: ["Algebra", "Geometri", "Statistik", "Sannolikhet", "Procent", "Problemlösning", "Funktioner", "Proportionalitet", "Tal och Taluppfattning"],
  Svenska: ["Läsförståelse", "Grammatik", "Skrivande", "Litteraturhistoria", "Ordkunskap", "Meningsbyggnad", "Retorik", "Textanalys"],
  Engelska: ["Reading Comprehension", "Grammar", "Vocabulary", "Writing", "Listening", "Speaking", "Sentence Completion"],
};

const emptyForm = {
  subject: "Matematik",
  grade: "Åk 9",
  topic: "Algebra",
  type: "multiple_choice" as QType,
  difficulty: "C" as Difficulty,
  questionText: "",
  options: ["", "", "", ""] as string[],
  correctAnswer: "",
  explanation: "",
};

const DIFF_LABEL: Record<string, string> = { E: "Lätt", C: "Medel", A: "Svår" };
const DIFF_COLOR: Record<string, string> = {
  E: "bg-green-100 text-green-700 border-green-200",
  C: "bg-amber-100 text-amber-700 border-amber-200",
  A: "bg-red-100 text-red-700 border-red-200",
};

function AdminClaim({ onClaimed }: { onClaimed: () => void }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const claim = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/claim", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      onClaimed();
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-border shadow-sm p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-1">Admin-åtkomst</h2>
        <p className="text-muted-foreground text-sm mb-6">Ange admin-lösenordet för att aktivera adminrättigheter.</p>
        <input type="password" value={secret} onChange={e => setSecret(e.target.value)}
          onKeyDown={e => e.key === "Enter" && claim()} placeholder="Admin-lösenord"
          data-testid="input-admin-secret"
          className="w-full px-4 py-3 rounded-xl border-2 border-border focus:outline-none focus:border-primary mb-3 text-base"
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button onClick={claim} disabled={loading || !secret} data-testid="button-claim-admin"
          className="w-full py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-50 hover:opacity-90 transition-opacity">
          {loading ? "Aktiverar..." : "Aktivera admin"}
        </button>
      </div>
    </div>
  );
}

function QuestionForm({ initial, onSave, onCancel, loading }: {
  initial: typeof emptyForm;
  onSave: (data: typeof emptyForm) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState(initial);
  const topics = TOPIC_OPTIONS[form.subject] || [];
  const setField = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const setOption = (i: number, val: string) =>
    setForm(prev => { const opts = [...prev.options]; opts[i] = val; return { ...prev, options: opts }; });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Ämne</label>
          <select value={form.subject} data-testid="select-subject"
            onChange={e => { setField("subject", e.target.value); setField("topic", TOPIC_OPTIONS[e.target.value]?.[0] || ""); }}
            className="w-full px-3 py-2.5 rounded-xl border-2 border-border focus:outline-none focus:border-primary text-sm bg-white">
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Ämnesområde</label>
          <select value={form.topic} data-testid="select-topic"
            onChange={e => setField("topic", e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border-2 border-border focus:outline-none focus:border-primary text-sm bg-white">
            {topics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Frågetyp</label>
          <div className="flex gap-2">
            {TYPES.map(t => (
              <button key={t} onClick={() => setField("type", t)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border-2 ${form.type === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                {t === "multiple_choice" ? "Flerval" : t === "numeric" ? "Numerisk" : "Öppen"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Svårighetsgrad</label>
          <div className="flex gap-2">
            {DIFFICULTIES.map(d => (
              <button key={d} onClick={() => setField("difficulty", d)}
                data-testid={`button-difficulty-${d}`}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${form.difficulty === d ? `${DIFF_COLOR[d]} border-current` : "border-border text-muted-foreground"}`}>
                {DIFF_LABEL[d]} ({d})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Frågetext</label>
        <textarea value={form.questionText} onChange={e => setField("questionText", e.target.value)}
          rows={3} data-testid="input-question-text" placeholder="Skriv frågans text här..."
          className="w-full px-4 py-3 rounded-xl border-2 border-border focus:outline-none focus:border-primary text-sm resize-none" />
      </div>

      {form.type === "multiple_choice" && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Svarsalternativ</label>
          <div className="space-y-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="w-6 h-6 flex-shrink-0 rounded-lg bg-slate-100 text-xs font-bold text-slate-500 flex items-center justify-center">
                  {String.fromCharCode(65 + i)}
                </span>
                <input value={opt} onChange={e => setOption(i, e.target.value)}
                  placeholder={`Alternativ ${String.fromCharCode(65 + i)}`}
                  data-testid={`input-option-${i}`}
                  className="flex-1 px-3 py-2 rounded-xl border-2 border-border focus:outline-none focus:border-primary text-sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Rätt svar</label>
          {form.type === "multiple_choice" ? (
            <select value={form.correctAnswer} onChange={e => setField("correctAnswer", e.target.value)}
              data-testid="select-correct-answer"
              className="w-full px-3 py-2.5 rounded-xl border-2 border-border focus:outline-none focus:border-primary text-sm bg-white">
              <option value="">Välj rätt svar</option>
              {form.options.filter(Boolean).map((opt, i) => (
                <option key={i} value={opt}>{String.fromCharCode(65 + i)}. {opt}</option>
              ))}
            </select>
          ) : (
            <input value={form.correctAnswer} onChange={e => setField("correctAnswer", e.target.value)}
              data-testid="input-correct-answer" placeholder="t.ex. 42"
              className="w-full px-3 py-2.5 rounded-xl border-2 border-border focus:outline-none focus:border-primary text-sm" />
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Förklaring</label>
          <input value={form.explanation} onChange={e => setField("explanation", e.target.value)}
            data-testid="input-explanation" placeholder="Förklara varför svaret är rätt"
            className="w-full px-3 py-2.5 rounded-xl border-2 border-border focus:outline-none focus:border-primary text-sm" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave(form)}
          disabled={loading || !form.questionText || !form.correctAnswer || !form.explanation}
          data-testid="button-save-question"
          className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          {loading ? "Sparar..." : "Spara fråga"}
        </button>
        <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border-2 border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
          Avbryt
        </button>
      </div>
    </div>
  );
}

type AdminUserRow = { id: number; email: string; username: string; role: "student" | "admin"; isAdmin: boolean; xp: number; streak: number };

function UserManagement() {
  const queryClient = useQueryClient();

  const { data: adminUsers, isLoading } = useQuery<AdminUserRow[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Åtkomst nekad");
      return res.json();
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: "student" | "admin" }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/role`, { role });
      if (!res.ok) throw new Error("Fel");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-border" />)}
    </div>
  );

  return (
    <div className="space-y-2">
      {(adminUsers || []).map(u => (
        <div key={u.id} data-testid={`row-user-${u.id}`}
          className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-bold text-primary shrink-0">
            {(u.username || u.email)[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-foreground truncate">{u.username || "—"}</div>
            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{u.xp} XP · {u.streak} dagars streak</div>
          </div>
          <div className="shrink-0">
            <select
              value={u.role}
              data-testid={`select-role-${u.id}`}
              onChange={e => changeRole.mutate({ id: u.id, role: e.target.value as "student" | "admin" })}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border-2 cursor-pointer transition-colors ${
                u.role === "admin"
                  ? "bg-violet-50 text-violet-700 border-violet-200"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              }`}>
              <option value="student">student</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const { data: user, isLoading, refetch } = useUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"questions" | "users">("questions");
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("Alla");
  const [diffFilter, setDiffFilter] = useState("Alla");
  const [showForm, setShowForm] = useState(false);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: adminQuestions, isLoading: qLoading } = useQuery<Question[]>({
    queryKey: ["/api/admin/questions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/questions", { credentials: "include" });
      if (!res.ok) throw new Error("Åtkomst nekad");
      return res.json();
    },
    enabled: !!user?.isAdmin,
  });

  const createQ = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const payload = data.type === "multiple_choice"
        ? { ...data, options: data.options.filter(Boolean) }
        : { ...data, options: undefined };
      const res = await apiRequest("POST", "/api/admin/questions", payload);
      if (!res.ok) throw new Error("Fel vid skapande");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/questions"] }); setShowForm(false); },
  });

  const updateQ = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof emptyForm }) => {
      const payload = data.type === "multiple_choice"
        ? { ...data, options: data.options.filter(Boolean) }
        : { ...data, options: undefined };
      const res = await apiRequest("PATCH", `/api/admin/questions/${id}`, payload);
      if (!res.ok) throw new Error("Fel vid uppdatering");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/questions"] }); setEditingQ(null); },
  });

  const deleteQ = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/questions/${id}`, undefined);
      if (!res.ok) throw new Error("Fel vid borttagning");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/questions"] }); setDeletingId(null); },
  });

  const subjectColor = (s: string) =>
    s === "Matematik" ? "bg-blue-50 text-blue-700"
    : s === "Svenska" ? "bg-purple-50 text-purple-700"
    : "bg-orange-50 text-orange-700";

  const subjectIcon = (s: string) =>
    s === "Matematik" ? <Calculator className="w-3.5 h-3.5" />
    : s === "Svenska" ? <BookOpen className="w-3.5 h-3.5" />
    : <MessageSquare className="w-3.5 h-3.5" />;

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) { setLocation("/auth"); return null; }
  if (!user.isAdmin) return <AdminClaim onClaimed={() => refetch()} />;

  const toFormData = (q: Question): typeof emptyForm => ({
    subject: q.subject, grade: q.grade, topic: q.topic, type: q.type as QType,
    difficulty: (q.difficulty as Difficulty) || "C",
    questionText: q.questionText,
    options: q.options ? [...q.options, ...Array(4).fill("")].slice(0, 4) : ["", "", "", ""],
    correctAnswer: q.correctAnswer, explanation: q.explanation,
  });

  const filtered = (adminQuestions || []).filter(q => {
    const matchSubject = subjectFilter === "Alla" || q.subject === subjectFilter;
    const matchDiff = diffFilter === "Alla" || q.difficulty === diffFilter;
    const matchSearch = !search || q.questionText.toLowerCase().includes(search.toLowerCase()) || q.topic.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchDiff && matchSearch;
  });

  const subjectCounts: Record<string, number> = { Alla: adminQuestions?.length || 0 };
  adminQuestions?.forEach(q => { subjectCounts[q.subject] = (subjectCounts[q.subject] || 0) + 1; });

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-extrabold font-display">Adminpanel</h1>
              <span className="ml-1 text-xs font-bold px-2.5 py-1 bg-violet-100 text-violet-700 rounded-full border border-violet-200" data-testid="badge-admin-mode">
                Admin Mode
              </span>
            </div>
            <p className="text-muted-foreground text-sm">Hantera frågor och användare för NP Coach.</p>
          </div>
          {activeTab === "questions" && (
            <button onClick={() => { setShowForm(true); setEditingQ(null); }}
              data-testid="button-add-question"
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-md shadow-primary/20">
              <Plus className="w-4 h-4" /> Lägg till fråga
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab("questions")} data-testid="tab-questions"
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === "questions" ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-white border border-border text-muted-foreground hover:text-foreground"}`}>
            <BookOpen className="w-4 h-4" /> Frågor
          </button>
          <button onClick={() => setActiveTab("users")} data-testid="tab-users"
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === "users" ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-white border border-border text-muted-foreground hover:text-foreground"}`}>
            <Users className="w-4 h-4" /> Användare
          </button>
        </div>

        {activeTab === "users" ? (
          <UserManagement />
        ) : (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {["Alla", ...SUBJECTS].map(s => (
                <button key={s} onClick={() => setSubjectFilter(s)}
                  className={`rounded-2xl p-4 text-left border-2 transition-all ${subjectFilter === s ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/30"}`}>
                  <div className="text-2xl font-bold text-foreground">{subjectCounts[s] || 0}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s}</div>
                </button>
              ))}
            </div>

            {/* Difficulty filter */}
            <div className="flex gap-2 mb-4">
              {["Alla", ...DIFFICULTIES].map(d => (
                <button key={d} onClick={() => setDiffFilter(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                    diffFilter === d
                      ? d === "Alla" ? "border-primary bg-primary/5 text-primary" : `${DIFF_COLOR[d]} border-current`
                      : "border-border bg-white text-muted-foreground"
                  }`}>
                  {d === "Alla" ? "Alla nivåer" : `${DIFF_LABEL[d]} (${d})`}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {(showForm || editingQ) && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-3xl border border-border shadow-sm p-6 mb-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold font-display text-lg">{editingQ ? "Redigera fråga" : "Ny fråga"}</h3>
                    <button onClick={() => { setShowForm(false); setEditingQ(null); }} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <QuestionForm
                    initial={editingQ ? toFormData(editingQ) : emptyForm}
                    onSave={(data) => { if (editingQ) updateQ.mutate({ id: editingQ.id, data }); else createQ.mutate(data); }}
                    onCancel={() => { setShowForm(false); setEditingQ(null); }}
                    loading={createQ.isPending || updateQ.isPending}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sök frågor..."
                data-testid="input-search-questions"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-border focus:outline-none focus:border-primary bg-white text-sm" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {qLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-border" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-3xl border border-border p-12 text-center text-muted-foreground">
                Inga frågor hittades.
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(q => (
                  <motion.div key={q.id} layout
                    className="bg-white rounded-2xl border border-border p-4 flex items-start gap-3 hover:border-primary/20 transition-colors group"
                    data-testid={`row-question-${q.id}`}>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 ${subjectColor(q.subject)}`}>
                      {subjectIcon(q.subject)}
                      {q.subject}
                    </div>
                    {q.difficulty && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg border shrink-0 ${DIFF_COLOR[q.difficulty] || DIFF_COLOR.C}`}>
                        {DIFF_LABEL[q.difficulty] || q.difficulty}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-2">{q.questionText}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{q.topic}</span>
                        <span>·</span>
                        <span>{q.type === "multiple_choice" ? "Flerval" : q.type === "numeric" ? "Numerisk" : "Öppen"}</span>
                        <span>·</span>
                        <span className="text-emerald-600 font-medium">✓ {q.correctAnswer}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => { setEditingQ(q); setShowForm(false); }}
                        data-testid={`button-edit-${q.id}`}
                        className="p-2 rounded-xl hover:bg-blue-50 text-blue-500 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeletingId(q.id)}
                        data-testid={`button-delete-${q.id}`}
                        className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Delete confirm modal */}
        <AnimatePresence>
          {deletingId !== null && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setDeletingId(null)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
                onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg mb-2">Radera fråga?</h3>
                <p className="text-muted-foreground text-sm mb-5">Den här åtgärden kan inte ångras.</p>
                <div className="flex gap-3">
                  <button onClick={() => deletingId && deleteQ.mutate(deletingId)} disabled={deleteQ.isPending}
                    data-testid="button-confirm-delete"
                    className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50">
                    {deleteQ.isPending ? "Raderar..." : "Radera"}
                  </button>
                  <button onClick={() => setDeletingId(null)}
                    className="flex-1 py-2.5 border-2 border-border rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                    Avbryt
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

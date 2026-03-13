import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { Navbar } from "@/components/Navbar";
import { Trophy, Zap, Flame, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

type Period = "all" | "month" | "week";

type LeaderboardEntry = {
  rank: number;
  id: number;
  username: string;
  xp: number;
  streak: number;
  isPremium: boolean;
  testsCompleted: number;
  periodXP: number;
  periodTests: number;
};

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "Denna vecka" },
  { key: "month", label: "Denna månad" },
  { key: "all", label: "Alltid" },
];

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function getRankBg(rank: number, isMe: boolean) {
  if (isMe) return "bg-primary/5 border-primary/40";
  if (rank === 1) return "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200";
  if (rank === 2) return "bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200";
  if (rank === 3) return "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200";
  return "bg-white border-border";
}

function Avatar({ name, rank, isMe }: { name: string; rank: number; isMe: boolean }) {
  const base = "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 text-white";
  if (rank === 1) return <div className={`${base} bg-gradient-to-br from-yellow-400 to-amber-500`}>{name.charAt(0).toUpperCase()}</div>;
  if (rank === 2) return <div className={`${base} bg-gradient-to-br from-slate-400 to-slate-500`}>{name.charAt(0).toUpperCase()}</div>;
  if (rank === 3) return <div className={`${base} bg-gradient-to-br from-orange-400 to-amber-500`}>{name.charAt(0).toUpperCase()}</div>;
  if (isMe) return <div className={`${base} bg-gradient-to-br from-primary to-accent`}>{name.charAt(0).toUpperCase()}</div>;
  return <div className={`${base} bg-gradient-to-br from-slate-300 to-slate-400`}>{name.charAt(0).toUpperCase()}</div>;
}

export default function Leaderboard() {
  const { data: user } = useUser();
  const [period, setPeriod] = useState<Period>("all");

  const { data: leaders, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard", period],
    queryFn: () => fetch(`/api/leaderboard?limit=20&period=${period}`, { credentials: "include" }).then(r => r.json()),
  });

  const myEntry = leaders?.find(e => e.id === user?.id);
  const myRank = myEntry?.rank;
  const showXP = period === "all";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-amber-200">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Topplista</h1>
          <p className="text-muted-foreground mt-1">De bästa eleverna i NP Coach</p>
        </div>

        {/* Period filter tabs */}
        <div className="flex gap-1 p-1 bg-white border border-border rounded-xl mb-6 shadow-sm" data-testid="period-filter">
          {PERIODS.map(p => (
            <button
              key={p.key}
              data-testid={`filter-${p.key}`}
              onClick={() => setPeriod(p.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                period === p.key
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-4 px-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="w-8 text-center">#</div>
          <div className="w-10 shrink-0" />
          <div className="flex-1">Användare</div>
          <div className="w-16 text-right hidden sm:block">Prov</div>
          <div className="w-20 text-right">{showXP ? "XP" : "XP (period)"}</div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-2xl border border-border animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {leaders?.map((entry, i) => {
              const isMe = user?.id === entry.id;
              const medal = MEDAL[entry.rank];
              const displayXP = showXP ? entry.xp : entry.periodXP;
              const displayTests = showXP ? entry.testsCompleted : entry.periodTests;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-4 px-4 py-3 rounded-2xl border-2 transition-all ${getRankBg(entry.rank, isMe)} ${isMe ? "ring-2 ring-primary ring-offset-1 shadow-md shadow-primary/10" : "hover:shadow-sm"}`}
                  data-testid={`row-leaderboard-${entry.id}`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {medal ? (
                      <span className="text-xl leading-none">{medal}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{entry.rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar name={entry.username} rank={entry.rank} isMe={isMe} />

                  {/* Name + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`font-bold truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                        {entry.username}
                      </span>
                      {isMe && (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0" data-testid="badge-you">
                          Du
                        </span>
                      )}
                      {entry.isPremium && (
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
                          ★
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Flame className="w-3 h-3 text-orange-400" />
                        {entry.streak}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground sm:hidden">
                        <BookOpen className="w-3 h-3" />
                        {displayTests}
                      </span>
                    </div>
                  </div>

                  {/* Tests (desktop only) */}
                  <div className="w-16 text-right hidden sm:block shrink-0">
                    <div className="flex items-center justify-end gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold text-muted-foreground" data-testid={`tests-${entry.id}`}>
                        {displayTests}
                      </span>
                    </div>
                  </div>

                  {/* XP */}
                  <div className="w-20 shrink-0">
                    <div className={`flex items-center justify-end gap-1 px-2.5 py-1.5 rounded-full ${entry.rank === 1 ? "bg-amber-100" : entry.rank <= 3 ? "bg-slate-100" : isMe ? "bg-primary/10" : "bg-slate-50"}`}>
                      <Zap className={`w-3.5 h-3.5 shrink-0 ${entry.rank === 1 ? "text-amber-500" : isMe ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-bold tabular-nums ${entry.rank === 1 ? "text-amber-600" : isMe ? "text-primary" : "text-foreground"}`} data-testid={`xp-${entry.id}`}>
                        {displayXP.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {(!leaders || leaders.length === 0) && (
              <div className="text-center py-20 text-muted-foreground">
                <Trophy className="w-14 h-14 mx-auto mb-4 opacity-20" />
                <p className="font-medium">Inga resultat för perioden</p>
                <p className="text-sm mt-1">Gör ett prov för att hamna på topplistan!</p>
              </div>
            )}
          </div>
        )}

        {/* Your position card — shown if you're not in the visible top list */}
        {user && myEntry && myRank && myRank > 20 && (
          <div className="mt-6 p-4 bg-primary/5 border-2 border-primary/30 rounded-2xl flex items-center gap-4" data-testid="your-rank-card">
            <div className="text-2xl font-bold text-primary w-12 text-center">#{myRank}</div>
            <div className="flex-1">
              <div className="font-bold text-primary">{myEntry.username} (du)</div>
              <div className="text-xs text-muted-foreground">{myEntry.xp.toLocaleString()} XP totalt · {myEntry.testsCompleted} prov</div>
            </div>
          </div>
        )}

        {/* Your stats summary */}
        {user && (
          <div className="mt-6 grid grid-cols-3 gap-3" data-testid="your-stats">
            <div className="bg-white border border-border rounded-2xl p-4 text-center shadow-sm">
              <div className="text-xl font-bold text-primary">{myRank ? `#${myRank}` : "–"}</div>
              <div className="text-xs text-muted-foreground mt-1">Din placering</div>
            </div>
            <div className="bg-white border border-border rounded-2xl p-4 text-center shadow-sm">
              <div className="text-xl font-bold text-foreground">{(user.xp || 0).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Totalt XP</div>
            </div>
            <div className="bg-white border border-border rounded-2xl p-4 text-center shadow-sm">
              <div className="text-xl font-bold text-orange-500">{user.streak || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Dagars streak</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

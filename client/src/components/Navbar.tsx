import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useLogout } from "@/hooks/use-auth";
import { BookOpen, LogOut, LayoutDashboard, Zap, Flame, Trophy, Menu, X, Shield, BarChart2, Swords } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function Navbar() {
  const { data: user, isLoading } = useUser();
  const logout = useLogout();
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout.mutateAsync();
    setMobileOpen(false);
    setLocation("/");
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300 group-hover:scale-105">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-display font-bold text-lg tracking-tight">NP Coach</span>
            </Link>
            {user?.isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-violet-100 text-violet-700 rounded-full border border-violet-200" data-testid="navbar-admin-badge">
                <Shield className="w-3 h-3" /> Admin Mode
              </span>
            )}

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-2">
              {!isLoading && user ? (
                <>
                  <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-slate-50" data-testid="link-dashboard">
                    <LayoutDashboard className="w-4 h-4" />
                    Översikt
                  </Link>
                  <Link href="/leaderboard" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-slate-50" data-testid="link-leaderboard">
                    <Trophy className="w-4 h-4" />
                    Topplista
                  </Link>
                  <Link href="/progress" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-slate-50" data-testid="link-progress">
                    <BarChart2 className="w-4 h-4" />
                    Framgång
                  </Link>
                  <Link href="/versus" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-primary bg-primary/8 hover:bg-primary/15 transition-colors rounded-xl border border-primary/20" data-testid="link-versus">
                    <Swords className="w-4 h-4" />
                    Utmana
                  </Link>
                  {user.isAdmin && (
                    <Link href="/admin" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors rounded-xl hover:bg-violet-50" data-testid="link-admin">
                      <Shield className="w-4 h-4" />
                      Admin
                    </Link>
                  )}

                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full" data-testid="badge-streak">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-bold text-orange-600">{user.streak ?? 0}</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-full" data-testid="badge-xp">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-primary">{(user.xp ?? 0).toLocaleString()} XP</span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Logga ut"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : !isLoading ? (
                <>
                  <Link href="/auth" className="text-sm font-medium hover:text-primary transition-colors px-4 py-2 rounded-xl hover:bg-slate-50" data-testid="link-login">
                    Logga in
                  </Link>
                  <Link href="/auth" className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200" data-testid="link-register">
                    Börja träna
                  </Link>
                </>
              ) : null}
            </div>

            {/* Mobile right side */}
            <div className="flex sm:hidden items-center gap-2">
              {!isLoading && user && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 border border-primary/20 rounded-full">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary">{(user.xp ?? 0).toLocaleString()}</span>
                </div>
              )}
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="p-2 rounded-xl text-muted-foreground hover:bg-slate-100 transition-colors"
                data-testid="button-mobile-menu"
                aria-label="Öppna meny"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="sm:hidden fixed top-16 inset-x-0 z-40 bg-white border-b border-border shadow-xl"
          >
            <div className="px-4 py-4 space-y-1">
              {user ? (
                <>
                  {/* User summary */}
                  <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-slate-50 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                      {(user.username || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-sm">{user.username || user.email.split("@")[0]}</div>
                        {user.isAdmin && (
                          <span className="text-xs font-bold px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-md" data-testid="mobile-admin-badge">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-primary" />{(user.xp ?? 0).toLocaleString()} XP</span>
                        <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" />{user.streak ?? 0} streak</span>
                      </div>
                    </div>
                  </div>

                  {[
                    { href: "/dashboard", icon: LayoutDashboard, label: "Översikt" },
                    { href: "/leaderboard", icon: Trophy, label: "Topplista" },
                    { href: "/progress", icon: BarChart2, label: "Framgång" },
                    { href: "/versus", icon: Swords, label: "Utmana en vän" },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-foreground hover:bg-slate-50 transition-colors"
                        data-testid={`mobile-link-${item.href.slice(1)}`}
                      >
                        <Icon className="w-5 h-5 text-muted-foreground" />
                        {item.label}
                      </Link>
                    );
                  })}

                  {user.isAdmin && (
                    <Link href="/admin" onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      <Shield className="w-5 h-5" />
                      Adminpanel
                    </Link>
                  )}

                  <div className="pt-2 border-t border-border mt-2">
                    <button onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
                      data-testid="mobile-button-logout"
                    >
                      <LogOut className="w-5 h-5" />
                      Logga ut
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/auth" onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-2xl text-sm font-medium text-foreground hover:bg-slate-50 transition-colors"
                    data-testid="mobile-link-login"
                  >
                    Logga in
                  </Link>
                  <Link href="/auth" onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-2xl text-sm font-bold bg-primary text-white text-center hover:opacity-90 transition-opacity"
                    data-testid="mobile-link-register"
                  >
                    Börja träna gratis
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

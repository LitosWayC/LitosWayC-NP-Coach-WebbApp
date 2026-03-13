import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLogin, useRegister, useUser } from "@/hooks/use-auth";
import { BookOpen, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const [, setLocation] = useLocation();
  const { data: user, isLoading: checkingAuth } = useUser();
  const login = useLogin();
  const register = useRegister();

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        await login.mutateAsync({ email, password });
      } else {
        await register.mutateAsync({ email, password, username: username || undefined });
      }
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message || "Ett fel uppstod. Försök igen.");
    }
  };

  if (checkingAuth) return null;
  const isPending = login.isPending || register.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#fafafa] relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-xl shadow-primary/30">
            <BookOpen className="w-8 h-8" />
          </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 rounded-[2rem]"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold font-display">
              {isLogin ? "Välkommen tillbaka" : "Skapa konto"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isLogin ? "Logga in för att fortsätta träna" : "Börja din resa mot ett bättre betyg"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium text-center">
                {error}
              </div>
            )}
            
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground ml-1">Användarnamn</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl bg-white border border-border text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200"
                  placeholder="Ditt namn på topplistan"
                  data-testid="input-username"
                />
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground ml-1">E-postadress</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3.5 rounded-xl bg-white border border-border text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200"
                placeholder="namn@skola.se"
                data-testid="input-email"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground ml-1">Lösenord</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3.5 rounded-xl bg-white border border-border text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200"
                placeholder="••••••••"
                data-testid="input-password"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              data-testid="button-submit"
              className="w-full py-4 mt-2 rounded-xl font-semibold text-white bg-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:transform-none transition-all duration-200 flex items-center justify-center"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? "Logga in" : "Skapa konto"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            {isLogin ? "Har du inget konto? " : "Har du redan ett konto? "}
            <button onClick={() => { setIsLogin(!isLogin); setError(""); }} className="font-semibold text-primary hover:text-primary/80 transition-colors">
              {isLogin ? "Skapa ett här" : "Logga in"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type TestResult = {
  id: number;
  userId: number;
  score: number;
  totalQuestions: number;
  level: string;
  subject: string;
  incorrectQuestions: number[];
  xpEarned: number;
  completedAt: string | null;
};

export function useTestResults() {
  return useQuery<TestResult[]>({
    queryKey: ["/api/test-results"],
    queryFn: async () => {
      const res = await fetch("/api/test-results", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error("Kunde inte hämta provresultat");
      }
      return res.json();
    },
  });
}

export function useCreateTestResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      score: number;
      totalQuestions: number;
      level: string;
      subject: string;
      incorrectQuestions: number[];
    }): Promise<TestResult> => {
      const res = await fetch("/api/test-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Kunde inte spara provresultat");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });
}

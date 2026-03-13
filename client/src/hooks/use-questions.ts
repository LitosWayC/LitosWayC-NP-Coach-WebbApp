import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

interface QuestionsParams {
  subject?: string;
  grade?: string;
  limit?: string;
}

export function useQuestions(params?: QuestionsParams) {
  return useQuery({
    queryKey: [api.questions.list.path, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.subject) searchParams.set("subject", params.subject);
      if (params?.grade) searchParams.set("grade", params.grade);
      if (params?.limit) searchParams.set("limit", params.limit);
      
      const url = `${api.questions.list.path}?${searchParams.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      
      if (!res.ok) throw new Error("Kunde inte hämta frågor");
      const data = await res.json();
      return api.questions.list.responses[200].parse(data);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 mins to prevent refetching during test
  });
}

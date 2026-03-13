import { z } from 'zod';
import { insertUserSchema, insertTestResultSchema, questions, testResults } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

const userSchema = z.object({
  id: z.number(),
  email: z.string(),
  username: z.string().optional(),
  xp: z.number().optional(),
  streak: z.number().optional(),
  isPremium: z.boolean().optional(),
});

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ email: z.string().email(), password: z.string() }),
      responses: {
        200: userSchema,
        401: errorSchemas.unauthorized,
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: z.object({ email: z.string().email(), password: z.string() }),
      responses: {
        201: userSchema,
        400: errorSchemas.validation,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: userSchema,
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    }
  },
  questions: {
    list: {
      method: 'GET' as const,
      path: '/api/questions' as const,
      input: z.object({
        subject: z.string().optional(),
        grade: z.string().optional(),
        limit: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof questions.$inferSelect>()),
      },
    },
  },
  testResults: {
    create: {
      method: 'POST' as const,
      path: '/api/test-results' as const,
      input: z.object({ 
        score: z.number(), 
        totalQuestions: z.number(),
        level: z.string(), 
        subject: z.string(),
        incorrectQuestions: z.array(z.number())
      }),
      responses: {
        201: z.custom<typeof testResults.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/test-results' as const,
      responses: {
        200: z.array(z.custom<typeof testResults.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
  },
  ai: {
    analyze: {
      method: 'POST' as const,
      path: '/api/ai/analyze' as const,
      input: z.object({
        testResultId: z.number(),
      }),
      responses: {
        200: z.object({
          feedback: z.string(),
          weakTopics: z.array(z.string()),
          suggestions: z.array(z.string()),
        }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

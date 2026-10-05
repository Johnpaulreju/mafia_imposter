function first(...values: Array<string | undefined>) {
  return values.find((value) => Boolean(value && value.trim()));
}

export const env = {
  databaseUrl: first(process.env.DATABASE_URL, process.env.POSTGRES_URL),
  redisUrl: first(process.env.KV_REST_API_URL, process.env.REDIS_REST_URL),
  // Never fall back to the read-only token: the game writes live state.
  redisToken: first(process.env.KV_REST_API_TOKEN, process.env.REDIS_REST_TOKEN),
  aiKey: process.env.AI_API_KEY,
  aiModel: process.env.AI_MODEL,
  aiUrl: process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  sessionSecret: process.env.SESSION_SECRET || "dev-only-change-me",
  storyAiDisabled: process.env.STORY_AI_DISABLED === "true",
};

export function requireEnv(name: keyof typeof env, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable for ${name}`);
  return value;
}

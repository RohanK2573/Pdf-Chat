import "dotenv/config";

const normalizedProvider = (value, fallback) =>
  (value ?? fallback).toLowerCase();

const llmProvider = normalizedProvider(process.env.LLM_PROVIDER, "gemini");
const embeddingProvider = normalizedProvider(
  process.env.EMBEDDING_PROVIDER,
  llmProvider
);

const required = ["DATABASE_URL"];
required.push("CLERK_JWT_ISSUER");

if (llmProvider === "gemini" || embeddingProvider === "gemini") {
  required.push("GOOGLE_API_KEY");
}

if (llmProvider === "openai" || embeddingProvider === "openai") {
  required.push("OPENAI_API_KEY");
}

const missing = [...new Set(required)].filter((k) => !process.env[k]);
if (missing.length) {
  console.warn(
    `Warning: missing env vars [${missing.join(
      ", "
    )}] – server may fail if these are required.`
  );
}

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  googleApiKey: process.env.GOOGLE_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  clerkJwtIssuer: process.env.CLERK_JWT_ISSUER,
  clerkAudience: process.env.CLERK_AUDIENCE,
  clerkAuthorizedParty: process.env.CLERK_AUTHORIZED_PARTY,
  llmProvider,
  embeddingProvider,
  redisHost: process.env.REDIS_HOST ?? "localhost",
  redisPort: Number(process.env.REDIS_PORT ?? 6379),
  qdrantUrl: process.env.QDRANT_URL ?? "http://localhost:6333",
  port: Number(process.env.PORT ?? 8000),
};

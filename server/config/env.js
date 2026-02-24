import "dotenv/config";

const normalizedProvider = (value, fallback) =>
  (value ?? fallback).toLowerCase();

const llmProvider = normalizedProvider(process.env.LLM_PROVIDER, "gemini");
const embeddingProvider = normalizedProvider(
  process.env.EMBEDDING_PROVIDER,
  llmProvider === "llama3" || llmProvider === "hf_router"
    ? "gemini"
    : llmProvider
);

const required = ["DATABASE_URL"];
required.push("CLERK_JWT_ISSUER");

if (llmProvider === "gemini" || embeddingProvider === "gemini") {
  required.push("GOOGLE_API_KEY");
}

if (llmProvider === "openai" || embeddingProvider === "openai") {
  required.push("OPENAI_API_KEY");
}

if (llmProvider === "llama3") {
  required.push("LLAMA_API_KEY", "LLAMA_BASE_URL");
}

if (llmProvider === "hf_router") {
  required.push("HF_TOKEN");
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
  llamaApiKey: process.env.LLAMA_API_KEY,
  llamaBaseUrl: process.env.LLAMA_BASE_URL,
  hfToken: process.env.HF_TOKEN,
  hfBaseUrl: process.env.HF_BASE_URL ?? "https://router.huggingface.co/v1",
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

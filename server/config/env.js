import "dotenv/config";

const required = ["DATABASE_URL", "GOOGLE_API_KEY"];

const missing = required.filter((k) => !process.env[k]);
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
  redisHost: process.env.REDIS_HOST ?? "localhost",
  redisPort: Number(process.env.REDIS_PORT ?? 6379),
  qdrantUrl: process.env.QDRANT_URL ?? "http://localhost:6333",
  port: Number(process.env.PORT ?? 8000),
};

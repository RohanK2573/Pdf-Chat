import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { env } from "./config/env.js";

const parsePositiveNumber = (value) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const ensureProvider = (value, fieldName) => {
  if (value === "gemini" || value === "openai") return value;
  throw new Error(
    `Invalid ${fieldName} \"${value}\". Use \"gemini\" or \"openai\".`
  );
};

const LLM_PROVIDER = ensureProvider(
  (process.env.LLM_PROVIDER ?? "gemini").toLowerCase(),
  "LLM_PROVIDER"
);

const EMBEDDING_PROVIDER = ensureProvider(
  (process.env.EMBEDDING_PROVIDER ?? LLM_PROVIDER).toLowerCase(),
  "EMBEDDING_PROVIDER"
);

const CHAT_MODEL =
  process.env.CHAT_MODEL ??
  (LLM_PROVIDER === "openai" ? "gpt-4o-mini" : "gemini-2.5-flash");

const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL ??
  (EMBEDDING_PROVIDER === "openai"
    ? "text-embedding-3-small"
    : "text-embedding-004");

const EMBEDDING_DIM = parsePositiveNumber(process.env.EMBEDDING_DIM);

export const llmConfig = {
  provider: LLM_PROVIDER,
  chatModel: CHAT_MODEL,
};

export const embeddingConfig = {
  provider: EMBEDDING_PROVIDER,
  model: EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIM,
};

export const chatClient =
  LLM_PROVIDER === "openai"
    ? new ChatOpenAI({
        apiKey: env.openaiApiKey,
        model: CHAT_MODEL,
        temperature: 0,
        maxRetries: 2,
      })
    : new ChatGoogleGenerativeAI({
        apiKey: env.googleApiKey,
        model: CHAT_MODEL,
        temperature: 0,
        maxRetries: 2,
      });

export const embeddingsFactory = () => {
  if (EMBEDDING_PROVIDER === "openai") {
    return new OpenAIEmbeddings({
      apiKey: env.openaiApiKey,
      model: EMBEDDING_MODEL,
      ...(EMBEDDING_DIM ? { dimensions: EMBEDDING_DIM } : {}),
    });
  }

  return new GoogleGenerativeAIEmbeddings({
    apiKey: env.googleApiKey,
    model: EMBEDDING_MODEL,
    ...(EMBEDDING_DIM ? { outputDimensionality: EMBEDDING_DIM } : {}),
  });
};

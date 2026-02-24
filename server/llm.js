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

const ensureChatProvider = (value, fieldName) => {
  if (
    value === "gemini" ||
    value === "openai" ||
    value === "llama3" ||
    value === "hf_router"
  ) {
    return value;
  }
  throw new Error(
    `Invalid ${fieldName} \"${value}\". Use \"gemini\", \"openai\", \"llama3\", or \"hf_router\".`
  );
};

const ensureEmbeddingProvider = (value, fieldName) => {
  if (value === "gemini" || value === "openai") return value;
  throw new Error(
    `Invalid ${fieldName} \"${value}\". Use \"gemini\" or \"openai\".`
  );
};

const LLM_PROVIDER = ensureChatProvider(
  (process.env.LLM_PROVIDER ?? "gemini").toLowerCase(),
  "LLM_PROVIDER"
);

const EMBEDDING_PROVIDER = ensureEmbeddingProvider(
  (
    process.env.EMBEDDING_PROVIDER ??
    (LLM_PROVIDER === "llama3" || LLM_PROVIDER === "hf_router"
      ? "gemini"
      : LLM_PROVIDER)
  ).toLowerCase(),
  "EMBEDDING_PROVIDER"
);

const CHAT_MODEL =
  process.env.CHAT_MODEL ??
  (LLM_PROVIDER === "openai"
    ? "gpt-4o-mini"
    : LLM_PROVIDER === "llama3"
      ? "meta-llama/llama-3.1-8b-instruct"
      : LLM_PROVIDER === "hf_router"
        ? "MiniMaxAI/MiniMax-M2.5:novita"
        : "gemini-2.5-flash");

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
    : LLM_PROVIDER === "llama3"
      ? new ChatOpenAI({
          apiKey: env.llamaApiKey,
          model: CHAT_MODEL,
          temperature: 0,
          maxRetries: 2,
          configuration: {
            baseURL: env.llamaBaseUrl,
          },
        })
      : LLM_PROVIDER === "hf_router"
        ? new ChatOpenAI({
            apiKey: env.hfToken,
            model: CHAT_MODEL,
            temperature: 0,
            maxRetries: 2,
            configuration: {
              baseURL: env.hfBaseUrl,
            },
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

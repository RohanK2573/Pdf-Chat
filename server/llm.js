import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { env } from "./config/env.js";

export const chatClient = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0,
  maxRetries: 2,
});

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-004";
const EMBEDDING_DIM = process.env.EMBEDDING_DIM
  ? Number(process.env.EMBEDDING_DIM)
  : undefined; // default 768 for text-embedding-004

export const embeddingsFactory = () =>
  new GoogleGenerativeAIEmbeddings({
    apiKey: env.googleApiKey,
    model: EMBEDDING_MODEL,
    ...(EMBEDDING_DIM ? { outputDimensionality: EMBEDDING_DIM } : {}),
  });

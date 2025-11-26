import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { env } from "./config/env.js";

export const chatClient = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro",
  temperature: 0,
  maxRetries: 2,
});

export const embeddingsFactory = () =>
  new GoogleGenerativeAIEmbeddings({
    apiKey: env.googleApiKey,
    model: "gemini-embedding-001",
  });

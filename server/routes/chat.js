import { Router } from "express";
import { db } from "../db/index.js";
import { conversation, message } from "../db/schema.js";
import { chatClient, embeddingsFactory } from "../llm.js";
import { env } from "../config/env.js";
import { QdrantVectorStore } from "@langchain/qdrant";
import { and, desc, eq, sql } from "drizzle-orm";

const router = Router();
const collectionName = "langchainjs-testing";

const buildTitleFromQuestion = (q = "") => {
  const trimmed = q.trim().replace(/\s+/g, " ");
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed || "Conversation";
};

router.post("/chat", async (req, res) => {
  const userQuery = req.body?.question;
  const conversationId = req.body?.conversationId;
  const docId = req.body?.docId;
  const userId = req.user?.id;

  if (!userQuery) return res.status(400).json({ message: "Missing question" });
  if (!userId) return res.status(401).json({ message: "Unauthenticated" });
  if (!docId) return res.status(400).json({ message: "Missing docId" });

  try {
    let activeConversationId = conversationId;
    const candidateTitle = buildTitleFromQuestion(userQuery);

    if (conversationId) {
      const existing = await db
        .select({
          id: conversation.id,
          userId: conversation.userId,
          title: conversation.title,
          docId: sql`(${conversation.metadata} ->> 'docId')`.as("docId"),
        })
        .from(conversation)
        .where(eq(conversation.id, conversationId))
        .limit(1);
      console.log(existing)
      if (!existing.length)
        return res.status(404).json({ message: "Conversation not found" });
      if (existing[0].userId !== userId)
        return res.status(403).json({ message: "Conversation does not belong to user" });
      if (existing[0].docId && existing[0].docId !== docId) {
        return res.status(400).json({ message: "Conversation is tied to a different document" });
      }
      if (!existing[0].title) {
        await db
          .update(conversation)
          .set({
            title: candidateTitle,
            updatedAt: sql`now()`,
            metadata: sql`jsonb_set(coalesce(${conversation.metadata}, '{}'::jsonb), '{docId}', to_jsonb(${docId}::text), true)`,
          })
          .where(eq(conversation.id, conversationId));
      }
    } else {
      const existingForDoc = await db
        .select({ id: conversation.id })
        .from(conversation)
        .where(
          and(
            eq(conversation.userId, userId),
            sql`(${conversation.metadata} ->> 'docId') = ${docId}`
          )
        )
        .limit(1);
      if (existingForDoc.length) {
        activeConversationId = existingForDoc[0].id;
            console.log(existingForDoc[0])
      } else {
        const [created] = await db
          .insert(conversation)
          .values({
            userId,
            title: candidateTitle,
            metadata: sql`jsonb_build_object('docId', ${docId}::text)`,
          })
          .returning({ id: conversation.id });
        activeConversationId = created.id;
      }
    }

    const embeddings = embeddingsFactory();
    const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
      url: env.qdrantUrl,
      collectionName,
    });
    const filter = {
      must: [
        {
          should: [
            { key: "user_id", match: { value: String(userId) } },
            { key: "metadata.user_id", match: { value: String(userId) } },
          ],
        },
        {
          should: [
            { key: "doc_id", match: { value: String(docId) } },
            { key: "metadata.doc_id", match: { value: String(docId) } },
          ],
        },
      ],
    };
    const ret = vectorStore.asRetriever({
      k: 2,
      searchParams: { filter },
    });
    const rawResult = await ret.invoke(userQuery);
    const result = Array.isArray(rawResult)
      ? rawResult.filter(
          (doc) =>
            doc?.metadata?.user_id === String(userId) &&
            doc?.metadata?.doc_id === String(docId)
        )
      : [];
    const hasContext = Array.isArray(result) && result.length > 0;
    if (!hasContext) {
      return res.status(200).json({
        msg: "I couldn't find any indexed content for this document yet. Please wait for processing to finish and try again.",
        conversationId: activeConversationId,
      });
    }

    await db.insert(message).values({
      conversationId: activeConversationId,
      userId,
      role: "user",
      content: userQuery,
    });

    const SYSTEM_PROMPT = `
You are a helpful AI Assistant who answers the user based on available context from PDF file.
Context: ${JSON.stringify(result)}
`;

    const aiMsg = await chatClient.invoke([
      ["system", SYSTEM_PROMPT],
      ["user", userQuery],
    ]);
    const assistantText = aiMsg.content;

    await db.insert(message).values({
      conversationId: activeConversationId,
      userId,
      role: "assistant",
      content: typeof assistantText === "string" ? assistantText : JSON.stringify(assistantText),
    });

    await db
      .update(conversation)
      .set({ updatedAt: sql`now()` })
      .where(eq(conversation.id, activeConversationId));

    return res.json({ msg: aiMsg.content, conversationId: activeConversationId });
  } catch (err) {
    console.error("Chat handler failed", err);
    return res.status(500).json({ message: "Failed to handle chat" });
  }
});

export default router;

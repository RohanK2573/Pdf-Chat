import { Router } from "express";
import { db } from "../db/index.js";
import { conversation, message } from "../db/schema.js";
import { desc, eq, sql } from "drizzle-orm";

const router = Router();

router.get("/conversations", async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthenticated" });
  try {
    const items = await db
      .select({
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt,
        docId: sql`(${conversation.metadata} ->> 'docId')`.as("docId"),
      })
      .from(conversation)
      .where(eq(conversation.userId, userId))
      .orderBy(desc(conversation.updatedAt));
    return res.json({ conversations: items });
  } catch (err) {
    console.error("List conversations failed", err);
    return res.status(500).json({ message: "Failed to list conversations" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  const userId = req.user?.id;
  const convoId = req.params.id;
  if (!userId) return res.status(401).json({ message: "Unauthenticated" });
  try {
    const convo = await db
      .select({ id: conversation.id, userId: conversation.userId })
      .from(conversation)
      .where(eq(conversation.id, convoId))
      .limit(1);
    if (!convo.length) return res.status(404).json({ message: "Conversation not found" });
    if (convo[0].userId !== userId) return res.status(403).json({ message: "Forbidden" });

    const msgs = await db
      .select({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })
      .from(message)
      .where(eq(message.conversationId, convoId))
      .orderBy(message.createdAt);

    return res.json({ messages: msgs });
  } catch (err) {
    console.error("Fetch messages failed", err);
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
});

export default router;

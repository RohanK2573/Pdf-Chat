import { Router } from "express";
import { db } from "../db/index.js";
import { documentUpload } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";

const router = Router();

router.get("/documents", async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthenticated" });
  try {
    const docs = await db
      .select({
        id: documentUpload.id,
        originalName: documentUpload.originalName,
        storedAs: documentUpload.storedAs,
        size: documentUpload.size,
        createdAt: documentUpload.createdAt,
      })
      .from(documentUpload)
      .where(eq(documentUpload.userId, userId))
      .orderBy(desc(documentUpload.createdAt))
      .limit(50);
    return res.json({ documents: docs });
  } catch (err) {
    console.error("Failed to list documents", err);
    return res.status(500).json({ message: "Failed to list documents" });
  }
});

export default router;

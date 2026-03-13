import { Router } from "express";
import multer from "multer";
import { uploadQueue } from "../clients/queue.js";
import { db } from "../db/index.js";
import { documentUpload } from "../db/schema.js";
import { uploadPdfToS3 } from "../clients/s3.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

router.post("/upload/pdf", upload.single("pdf"), async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthenticated" });
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  if (!req.file.buffer?.length) {
    return res.status(400).json({ message: "Uploaded file is empty" });
  }

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const docId = `pdf-${uniqueSuffix}`;
  const s3Key = `users/${userId}/documents/${docId}-${safeName}`;

  try {
    await uploadPdfToS3(
      req.file.buffer,
      s3Key,
      req.file.mimetype || "application/pdf"
    );
  } catch (err) {
    console.error("Failed to upload file to S3", err);
    return res.status(500).json({ message: "Failed to upload file" });
  }

  await uploadQueue.add("file-ready", {
    userId,
    docId,
    originalName: req.file.originalname,
    size: req.file.size,
    s3Key,
    mimeType: req.file.mimetype || "application/pdf",
  });

  try {
    await db
      .insert(documentUpload)
      .values({
        id: docId,
        userId,
        originalName: req.file.originalname,
        storedAs: s3Key,
        storageProvider: "s3",
        storageKey: s3Key,
        mimeType: req.file.mimetype || "application/pdf",
        size: BigInt(req.file.size),
      })
      .onConflictDoNothing();
  } catch (err) {
    console.error("Failed to record document upload", err);
  }

  return res.json({
    message: "uploaded",
    file: {
      id: docId,
      originalName: req.file.originalname,
      storedAs: s3Key,
      size: req.file.size,
      s3Key,
      docId,
    },
  });
});

export default router;

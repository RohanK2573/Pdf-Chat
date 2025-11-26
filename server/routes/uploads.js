import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { uploadQueue } from "../clients/queue.js";
import { db } from "../db/index.js";
import { documentUpload } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

router.post("/upload/pdf", upload.single("pdf"), async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthenticated" });
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  await uploadQueue.add("file-ready", {
    filename: req.file.originalname,
    destination: req.file.destination,
    path: req.file.path,
    userId,
    docId: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
  });

  try {
    await db
      .insert(documentUpload)
      .values({
        id: req.file.filename,
        userId,
        originalName: req.file.originalname,
        storedAs: req.file.filename,
        size: BigInt(req.file.size),
      })
      .onConflictDoNothing();
  } catch (err) {
    console.error("Failed to record document upload", err);
  }

  return res.json({
    message: "uploaded",
    file: {
      originalName: req.file.originalname,
      storedAs: req.file.filename,
      size: req.file.size,
      path: req.file.path,
      docId: req.file.filename,
    },
  });
});

export default router;

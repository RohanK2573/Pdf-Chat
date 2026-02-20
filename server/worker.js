import "dotenv/config";
import { Worker } from "bullmq";
import { QdrantVectorStore } from "@langchain/qdrant";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { env } from "./config/env.js";
import { embeddingConfig, embeddingsFactory } from "./llm.js";
import { getObjectBuffer } from "./clients/s3.js";

const QDRANT_URL = env.qdrantUrl ?? "http://localhost:6333";
const COLLECTION_NAME = process.env.QDRANT_COLLECTION ?? "pdf-embeddings-768";

const worker = new Worker(
  "file-upload-queue",
  async (job) => {
    const { docId, userId, originalName, size, s3Key } = job.data ?? {};
    if (!s3Key) {
      throw new Error("Missing s3Key in upload job payload");
    }

    const uid = userId != null ? String(userId) : null;
    const did = docId != null ? String(docId) : null;
    const { buffer: pdfBuffer } = await getObjectBuffer(s3Key);

    const parsed = await pdfParse(pdfBuffer);
    const content = parsed?.text ?? "";
    const rawDocs = [];
    if (content.trim().length > 0) {
      rawDocs.push({ pageContent: content, metadata: {} });
    }

    const splitter = new CharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splitDocs = await splitter.splitDocuments(rawDocs);
    const docs = splitDocs.filter(
      (d) => typeof d.pageContent === "string" && d.pageContent.trim().length > 0
    );
    if (docs.length === 0) {
      console.warn(`No text content to index for docId=${did} userId=${uid}`);
      return;
    }

    let embeddings;
    try {
      embeddings = embeddingsFactory();
      console.log(
        `embeddings created provider=${embeddingConfig.provider} model=${embeddingConfig.model} dim=${embeddingConfig.dimensions ?? "default"}`
      );
    } catch (err) {
      console.error("embedding init failed", err);
      throw err;
    }

    const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
      url: QDRANT_URL,
      collectionName: COLLECTION_NAME,
    });
    const docsWithMeta = docs.map((d) => {
      d.metadata = {
        ...(d.metadata || {}),
        doc_id: did,
        user_id: uid,
        s3_key: s3Key,
        original_name: originalName ?? null,
        size: size ?? null,
      };
      return d;
    });
    console.log(`Indexing ${docsWithMeta.length} chunks for docId=${did}, userId=${uid}`);
    const filteredDocs = [];
    const filteredVectors = [];
    for (const doc of docsWithMeta) {
      const text = doc.pageContent;
      if (!text || !text.trim()) continue;
      try {
        const vecs = await embeddings.embedDocuments([text]);
        const vec = Array.isArray(vecs) && vecs[0];
        if (Array.isArray(vec) && vec.length > 0) {
          filteredDocs.push(doc);
          filteredVectors.push(vec);
        }
      } catch (err) {
        console.warn(`Embedding skipped for docId=${did}, userId=${uid}`, err);
      }
    }
    if (filteredDocs.length === 0) {
      console.warn(`No valid embeddings to index for docId=${did}, userId=${uid}`);
      return;
    }
    try {
      await vectorStore.addVectors(filteredVectors, filteredDocs);
    } catch (err) {
      console.error(`Failed to add vectors to Qdrant for docId=${did}, userId=${uid}`, err);
      throw err;
    }
  },
  {
    concurrency: 100,
    connection: {
      host: env.redisHost,
      port: env.redisPort,
    },
  }
);

worker.on("failed", (job, err) => {
  console.error("job failed", job?.id, err);
});

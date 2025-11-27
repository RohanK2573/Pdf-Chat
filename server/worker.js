import "dotenv/config";
import { Worker } from "bullmq";
import path from "path";
import fs from "fs";
import { QdrantVectorStore } from "@langchain/qdrant";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { env } from "./config/env.js";

const GOOGLE_API_KEY = env.googleApiKey;
const QDRANT_URL = env.qdrantUrl ?? "http://localhost:6333";
const COLLECTION_NAME =
  process.env.QDRANT_COLLECTION ?? "pdf-embeddings-768";
const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL ?? "text-embedding-004";
const EMBEDDING_DIM = process.env.EMBEDDING_DIM
  ? Number(process.env.EMBEDDING_DIM)
  : undefined; // default 768 for text-embedding-004



const worker = new Worker(
    'file-upload-queue',
    async (job) => {
        const { path: pdfPathRaw, docId, userId, originalName, size } = job.data ?? {};
        const pdfPath = path.resolve(pdfPathRaw ?? job.data ?? "");
        if (!pdfPath || !fs.existsSync(pdfPath)) {
            throw new Error(`PDF path not found: ${pdfPath}`);
        }
        const uid = userId != null ? String(userId) : null;
        const did = docId != null ? String(docId) : null;

        const loader = new PDFLoader(pdfPath);
        let rawDocs = await loader.load();
        const hasText = rawDocs.some(
            (d) => typeof d.pageContent === "string" && d.pageContent.trim().length > 0
        );
        if (!hasText) {
            const dataBuffer = fs.readFileSync(pdfPath);
            const parsed = await pdfParse(dataBuffer);
            const content = parsed?.text ?? "";
            if (content.trim().length > 0) {
                rawDocs = [{ pageContent: content, metadata: {} }];
            }
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
            embeddings = new GoogleGenerativeAIEmbeddings({
                apiKey: GOOGLE_API_KEY,
                model: EMBEDDING_MODEL,
                ...(EMBEDDING_DIM ? { outputDimensionality: EMBEDDING_DIM } : {}),
            });
            console.log(
                `embeddings created model=${EMBEDDING_MODEL} dim=${EMBEDDING_DIM ?? "default"}`
            );
        } catch (err) {
            console.error("embedding init failed", err);
            throw err;
        }
    

        const vectorStore = await QdrantVectorStore.fromExistingCollection(
            embeddings,
            {
                url: QDRANT_URL,
                collectionName: COLLECTION_NAME,
            }
        );
        const docsWithMeta = docs.map((d) => {
            d.metadata = {
                ...(d.metadata || {}),
                doc_id: did,
                user_id: uid,
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
            console.error(
                `Failed to add vectors to Qdrant for docId=${did}, userId=${uid}`,
                err
            );
            throw err;
        }
        
    



    },
    {
        concurrency: 100, connection: {
            host: 'localhost',
            port: '6379'
        }
    },

);

worker.on('failed', (job, err) => {
    console.error('job failed', job?.id, err);
});

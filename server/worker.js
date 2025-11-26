import 'dotenv/config';
import { Worker } from 'bullmq'
import path from "path";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf"
import fs from "fs";




const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;



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
        const rawDocs = await loader.load();
        const splitter = new CharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const docs = await splitter.splitDocuments(rawDocs);

        let embeddings;
        try {
            embeddings = new GoogleGenerativeAIEmbeddings({
                apiKey: GOOGLE_API_KEY,
                model: "gemini-embedding-001"
            });
            console.log('embeddings created');
        } catch (err) {
            console.error('embedding init failed', err);
            throw err;
        }
    

        const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
       url: `http://localhost:6333`,
        collectionName: "langchainjs-testing",
});
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
        console.log(docsWithMeta)
        await  vectorStore.addDocuments(docsWithMeta)
        
    



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

# PDF Scanner AI 📄✨

Welcome to **PDF Scanner AI**! This is a full-stack AI-powered application that allows users to upload PDF documents, intelligently parse and embed them, and have context-aware chats with their documents. 

It leverages modern GenAI workflows to provide accurate, isolated, and responsive document-based Q&A.

## 🚀 Features

- **Secure Authentication**: Powered by Clerk to ensure user data and documents are private and isolated.
- **Intelligent Ingestion**: Upload PDFs which are automatically parsed, chunked, and embedded into a Vector Database.
- **Context-Aware Chat**: Converse with your documents! The AI retrieves relevant chunks from your specific PDF to answer your questions accurately.
- **Background Processing**: Heavy lifting (like embedding large PDFs) is offloaded to a background worker using BullMQ and Redis for a snappy user experience.
- **Provider Agnostic**: Switchable LLM and Embedding providers (Google Gemini or OpenAI).

## 🏗️ Architecture

This project is structured as a monorepo containing:

### 1. Client (`/client/my-app`)
- **Framework**: Next.js 16
- **Styling**: Tailwind CSS 4, Lucide React
- **Auth**: Clerk integration (`@clerk/nextjs`)

### 2. Server (`/server`)
- **Runtime**: Node.js & Express
- **Database**: PostgreSQL (via Drizzle ORM)
- **Vector DB**: Qdrant (for storing and querying embeddings)
- **Queue**: Redis & BullMQ (for background ingestion workers)
- **AI/LLM**: LangChain, Google Gemini (`@google/generative-ai`), OpenAI
- **Storage**: Local uploads (Multer) / S3 (configurable)

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed and running:
- **Node.js** (v18+ recommended)
- **PostgreSQL**
- **Redis**
- **Qdrant**

---

## 🏃 Quick Start

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd PDF-Scanner
```

### 2. Set up the Server (Backend)

Navigate to the server directory and install dependencies:
```bash
cd server
npm install
```

Create a `.env` file in the `server` directory. You will need the following key variables:
```env
PORT=8000
DATABASE_URL=postgres://user:password@localhost:5432/dbname
GOOGLE_API_KEY=your_gemini_api_key  # Or OPENAI_API_KEY
CLERK_JWT_ISSUER=your_clerk_issuer_url
REDIS_HOST=localhost
REDIS_PORT=6379
QDRANT_URL=http://localhost:6333
LLM_PROVIDER=gemini # or openai
```

Run the database migrations:
```bash
npm run generate
npm run migrate
```

Start the API server and the background worker (in separate terminal windows):
```bash
# Terminal 1: API Server
npm run dev

# Terminal 2: Background Worker (for PDF ingestion)
npm run dev:worker
```

### 3. Set up the Client (Frontend)

Open a new terminal, navigate to the client app, and install dependencies:
```bash
cd client/my-app
npm install
```

Create a `.env.local` file in the `client/my-app` directory with your Clerk keys and backend API URL:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend development server:
```bash
npm run dev
```

Visit `http://localhost:3000` in your browser!

---

## 🔒 Data Isolation & Security

- **User-Scoped Vectors**: Every vector in Qdrant has a `user_id` and `doc_id` payload.
- **Strict Retrieval**: Searches are filtered by the current user and selected document to ensure responses are strictly scoped to the correct context.
- **Conversations**: Chat histories are securely tied to the user and their respective documents.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

---
*Built with ❤️ using Next.js, Node.js, LangChain, and Qdrant.*

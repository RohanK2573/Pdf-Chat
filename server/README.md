# Backend Overview – PDF Scanner AI

This backend ingests user PDFs, embeds them into Qdrant with per-user/doc isolation, and serves chat answers scoped to the selected document. It uses Express, Drizzle (Postgres), BullMQ (Redis), and LangChain with Gemini or OpenAI.

## Architecture & Flow

### 1) Auth
- Middleware (`middleware/auth.js`) runs on every route except `/`.
- Expects `Authorization: Bearer <Clerk JWT>` from the client.
- Decodes token, extracts `externalId/email/name`, upserts `app_user` (Postgres), and attaches `req.user = { id, externalId, ... }`.

### 2) Upload
- Route: `POST /upload/pdf`
- Multer saves the PDF to `server/uploads/`.
- Enqueues a BullMQ job (`file-upload-queue`) with `{ userId, docId=stored filename, originalName, size, path }`.
- Persists metadata in `document_upload` (Postgres) so uploads survive refresh/logout.
- Returns `{ file: { docId, originalName, storedAs, size, path } }`.

### 3) Worker (ingestion)
- File: `queue/worker.js` (BullMQ Worker; start with `npm run dev:worker` or `node worker.js`).
- Loads PDF, creates embeddings (Gemini or OpenAI), and writes chunks to Qdrant collection `langchainjs-testing`.
- Payload per point: `user_id`, `doc_id`, `original_name`, `size` (stored under metadata).
- Requires Redis, Qdrant, Postgres, and the API keys required by your selected providers.

### 4) Documents listing
- Route: `GET /documents`
- Returns uploaded docs for the signed-in user from `document_upload`.

### 5) Conversations & messages
- `conversation` rows are user-scoped and tied to a doc via `metadata->>'docId'`.
- `message` rows store each user/assistant turn.
- Routes:
  - `GET /conversations` → list user’s conversations (with docId).
  - `GET /conversations/:id/messages` → ownership enforced, returns history.

### 6) Chat
- Route: `POST /chat`
- Requires `question`, `docId`, and auth.
- Resolves conversation for (user, docId): reuse existing or create one with docId in metadata.
- Retrieves context from Qdrant with filter on both top-level and nested keys:
  - `user_id` OR `metadata.user_id` == current user
  - `doc_id` OR `metadata.doc_id` == selected doc
- If no context, returns a friendly “not indexed yet” message.
- Persists user question and assistant reply to `message`, updates conversation `updatedAt`.

### 7) Health
- Route: `GET /` → `{ status: "allgood" }`

## Key Files
- `app.js` – Express bootstrap, route mounts, auth, error handler.
- `config/env.js` – Env loading and provider-aware key checks.
- `middleware/auth.js` – Clerk JWT decode + user upsert.
- `middleware/error.js` – Generic JSON error handler.
- `routes/uploads.js` – Upload endpoint + DB record + queue job.
- `routes/documents.js` – List user uploads from DB.
- `routes/conversations.js` – List conversations, fetch messages (ownership enforced).
- `routes/chat.js` – Chat pipeline: conversation resolution, Qdrant retrieval, LLM call, message persistence.
- `queue/worker.js` – BullMQ worker to embed PDFs into Qdrant with per-user/doc payloads.
- `llm.js` – Provider-switchable chat and embedding clients (Gemini/OpenAI).
- `db/schema.js` – `app_user`, `document_upload`, `conversation`, `message`.
- `db/index.js` – Drizzle init.
- `clients/queue.js` – BullMQ queue connection.

## Environment Variables
- `PORT` (default 8000)
- `DATABASE_URL` (Postgres, required)
- `GOOGLE_API_KEY` (required if `LLM_PROVIDER` or `EMBEDDING_PROVIDER` uses `gemini`)
- `OPENAI_API_KEY` (required if `LLM_PROVIDER` or `EMBEDDING_PROVIDER` uses `openai`)
- `LLM_PROVIDER` (optional, `gemini` default, or `openai`)
- `EMBEDDING_PROVIDER` (optional, defaults to `LLM_PROVIDER`)
- `CHAT_MODEL` (optional, provider default if omitted)
- `EMBEDDING_MODEL` (optional, provider default if omitted)
- `EMBEDDING_DIM` (optional, model dimensions override)
- `REDIS_HOST` (default `localhost`)
- `REDIS_PORT` (default `6379`)
- `QDRANT_URL` (default `http://localhost:6333`)

## Running Locally
1) Services: start Postgres, Redis, Qdrant.
2) Backend API:
   ```bash
   cd server
   npm install
   node app.js
   ```
3) Worker:
   ```bash
   cd server
   node queue/worker.js
   ```
4) Client: ensure it sends Clerk JWT in `Authorization: Bearer <token>` and includes `docId` on `/chat`.

## Data isolation
- Every vector has `user_id` and `doc_id` payload.
- Retrieval filters by user & doc, then results are additionally filtered in-code to drop any mismatches.
- Conversations are owned by the user; API enforces ownership on conversation/messages/documents.

## Common pitfalls
- Redis/worker not running → uploads never indexed → chat has no context.
- Qdrant has old points without payload → purge or re-upload so filters work.
- Missing `docId` in `/chat` → rejected; client must pass selected doc’s `docId` (stored filename).

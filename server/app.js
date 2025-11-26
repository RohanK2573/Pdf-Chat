import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";
import { requestLogger } from "./middleware/logger.js";
import healthRoutes from "./routes/health.js";
import uploadRoutes from "./routes/uploads.js";
import documentRoutes from "./routes/documents.js";
import conversationRoutes from "./routes/conversations.js";
import chatRoutes from "./routes/chat.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(authMiddleware);

app.use(healthRoutes);
app.use(uploadRoutes);
app.use(documentRoutes);
app.use(conversationRoutes);
app.use(chatRoutes);

app.use(errorHandler);

app.listen(env.port, () => console.log(`server started on PORT ${env.port}`));

import { logger } from "../utils/logger.js";

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const userId = req.user?.id ?? "anon";
    logger.info(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms user=${userId}`
    );
  });
  next();
};

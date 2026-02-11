import { logger } from "../utils/logger.js";

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  console.log(`${req.method} ${req.originalUrl} - Start`);
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(req.user)
    const userId = req.user?.id ?? "anon";
    logger.info(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms user=${userId}`
    );
  });
  next();
};

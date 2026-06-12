const requiredEnvVars = ["DATABASE_URL", "REPL_ID", "SESSION_SECRET", "PORT"] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`FATAL: Required environment variable "${key}" is not set.`);
    console.error("Set it in the Replit Secrets panel and restart the server.");
    process.exit(1);
  }
}

import app from "./app";
import { logger } from "./lib/logger";
import { purgeStaleQuestionCache } from "./services/questionGenerator";

const rawPort = process.env["PORT"]!;
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  logger.error({ rawPort }, "Invalid PORT value");
  process.exit(1);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  purgeStaleQuestionCache().then(() => {
    logger.info("Question cache: stale entries without explanations purged");
  }).catch((e: unknown) => {
    logger.warn({ err: e }, "Question cache purge failed (non-fatal)");
  });
});

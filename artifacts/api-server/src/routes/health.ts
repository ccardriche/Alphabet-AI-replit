import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (req, res) => {
  const start = Date.now();
  let dbStatus = "ok";
  let dbLatencyMs: number | undefined;

  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      dbLatencyMs = Date.now() - start;
    } finally {
      client.release();
    }
  } catch (err) {
    req.log.error({ err }, "DB health check failed");
    dbStatus = "error";
  }

  const status = dbStatus === "ok" ? "ok" : "degraded";
  const httpStatus = dbStatus === "ok" ? 200 : 503;

  const body: Record<string, unknown> = { status, db: dbStatus };
  if (dbLatencyMs !== undefined) body.dbLatencyMs = dbLatencyMs;

  res.status(httpStatus).json(body);
});

export default router;

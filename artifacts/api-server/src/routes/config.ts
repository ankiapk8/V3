import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

type CheckStatus = "ok" | "missing" | "error";

interface IntegrationCheck {
  status: CheckStatus;
  detail?: string;
}

async function checkDatabase(): Promise<IntegrationCheck> {
  if (!process.env["DATABASE_URL"]) {
    return { status: "missing", detail: "DATABASE_URL env var is not set" };
  }
  try {
    const result = await pool.query("SELECT 1 AS ok");
    if (result.rows[0]?.ok === 1) {
      return { status: "ok" };
    }
    return { status: "error", detail: "Unexpected query result" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error", detail: message };
  }
}

function checkOpenAI(): IntegrationCheck {
  const baseUrl = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  const missing: string[] = [];
  if (!baseUrl) missing.push("AI_INTEGRATIONS_OPENAI_BASE_URL");
  if (!apiKey) missing.push("AI_INTEGRATIONS_OPENAI_API_KEY");
  if (missing.length > 0) {
    return { status: "missing", detail: `Not set: ${missing.join(", ")}` };
  }
  return { status: "ok", detail: `baseUrl: ${baseUrl}` };
}

function checkCors(): IntegrationCheck {
  const origin = process.env["CORS_ORIGIN"];
  if (!origin) {
    return {
      status: "missing",
      detail: "CORS_ORIGIN unset — allowing all origins (dev mode)",
    };
  }
  return { status: "ok", detail: origin };
}

router.get("/config", async (_req, res) => {
  const [database, openai, cors] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkOpenAI()),
    Promise.resolve(checkCors()),
  ]);

  const allOk =
    database.status === "ok" &&
    openai.status === "ok";

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ready" : "degraded",
    nodeEnv: process.env["NODE_ENV"] ?? "unknown",
    nodeVersion: process.version,
    port: process.env["PORT"] ?? "unset",
    integrations: {
      database,
      openai,
      cors,
    },
  });
});

export default router;

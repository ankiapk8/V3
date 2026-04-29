import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const corsOriginEnv = process.env["CORS_ORIGIN"];
const corsOrigins = corsOriginEnv
  ? corsOriginEnv.split(",").map((o) => o.trim()).filter(Boolean)
  : undefined;
app.use(
  cors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);

const frontendDistDir = process.env["FRONTEND_DIST_DIR"];
if (frontendDistDir && existsSync(frontendDistDir)) {
  const indexHtml = path.join(frontendDistDir, "index.html");
  logger.info({ frontendDistDir }, "Serving static frontend");
  app.use(
    express.static(frontendDistDir, {
      index: false,
      maxAge: "1h",
    }),
  );
  app.get(/^\/(?!api(\/|$)).*/, (_req: Request, res: Response, next: NextFunction) => {
    if (!existsSync(indexHtml)) {
      return next();
    }
    res.sendFile(indexHtml);
  });
}

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error({ err, url: req.url, method: req.method }, "Unhandled error");
  if (!res.headersSent) {
    res.status(500).json({ error: message });
  }
});

export default app;

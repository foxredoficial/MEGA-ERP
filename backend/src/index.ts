import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./env.js";
import { ensureDatabaseAndSchema, pingDb } from "./db.js";
import { sendError } from "./http.js";
import { publicRouter } from "./routes/public.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { billingRouter } from "./routes/billing.js";
import { adminRouter } from "./routes/admin.js";
import productsRouter from "./routes/products.js";
import contactsRouter from "./routes/contacts.js";

const app = express();

app.disable("x-powered-by");

app.use(
  cors({
    origin: [
      env.APP_ORIGIN,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "http://localhost:5175",
      "http://127.0.0.1:5175",
      "http://localhost:5176",
      "http://127.0.0.1:5176",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", async (_req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  try {
    await pingDb();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({
      ok: false,
      message: "Falha ao conectar no MySQL.",
      details: isProd ? null : String(e),
    });
  }
});

app.use("/api/public", publicRouter);
app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/billing", billingRouter);
app.use("/api/admin", adminRouter);
app.use("/api/products", productsRouter);
app.use("/api/contacts", contactsRouter);

app.use((_req, res) => {
  sendError(res, 404, "Rota não encontrada.");
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) return sendError(res, 500, "Erro interno.");
  const message = err instanceof Error ? err.message : "Erro interno.";
  sendError(res, 500, message, err);
});

async function start() {
  await ensureDatabaseAndSchema();
  await pingDb();

  app.listen(env.PORT, () => {
    console.log(`MEGA ERP API rodando em http://localhost:${env.PORT}`);
  });
}

start().catch((e) => {
  console.error("Falha ao iniciar o backend:", e);
  process.exit(1);
});

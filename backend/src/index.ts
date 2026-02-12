import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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
import categoriesRouter from "./routes/categories.js";
import priceListsRouter from "./routes/price_lists.js";
import salespersonsRouter from "./routes/salespersons.js";
import cashRouter from "./routes/cash.js";
import financialTitlesRouter from "./routes/financial_titles.js";
import salesOrdersRouter from "./routes/sales_orders.js";
import pdvSalesRouter from "./routes/pdv_sales.js";
import serviceOrdersRouter from "./routes/service_orders.js";
import analyticsRouter from "./routes/analytics.js";
import reportsRouter from "./routes/reports.js";
import bizDocumentsRouter from "./routes/biz_documents.js";
import banksRouter from "./routes/banks.js";
import { financeRouter } from "./routes/finance.js";
import mpWebhooksRouter from "./routes/webhooks_mercadopago.js";
import searchRouter from "./routes/search.js";
import { honeypotRouter } from "./security/honeypot.js";
import { sameOriginGuard } from "./security/sameOrigin.js";
import { csrfGuard } from "./security/csrf.js";

const app = express();

function stripPoisonKeys(value: any): any {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripPoisonKeys);
  const out: any = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    out[k] = stripPoisonKeys(v);
  }
  return out;
}

app.disable("x-powered-by");

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const allowedOrigins = [
  env.APP_ORIGIN,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5176",
];

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas. Tente novamente em alguns minutos." },
});

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use((req, _res, next) => {
  if (req.body) req.body = stripPoisonKeys(req.body);
  next();
});
app.use(cookieParser());
app.use("/api", apiLimiter);
app.use(honeypotRouter());
app.use("/api", sameOriginGuard(allowedOrigins));
app.use("/api", csrfGuard());

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
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/me", meRouter);
app.use("/api/billing", billingRouter);
app.use("/api/admin", adminRouter);
app.use("/api/search", searchRouter);
app.use("/api/products", productsRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/price-lists", priceListsRouter);
app.use("/api/salespersons", salespersonsRouter);
app.use("/api/cash", cashRouter);
app.use("/api/financial", financialTitlesRouter);
app.use("/api/sales-orders", salesOrdersRouter);
app.use("/api/pdv", pdvSalesRouter);
app.use("/api/service-orders", serviceOrdersRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/docs", bizDocumentsRouter);
app.use("/api/banks", banksRouter);
app.use("/api/finance", financeRouter);
app.use("/api/webhooks", mpWebhooksRouter);

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

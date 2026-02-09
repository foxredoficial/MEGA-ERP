import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { asyncHandler } from "../http.js";
import { findUserById } from "../repos/users.js";
import { cancelBizDocument, createBizDocument, getBizDocument, listBizDocuments, updateBizDocument, type BizDocumentType } from "../repos/biz_documents.js";
import { getContact } from "../repos/contacts.js";
import { issueWithMegaNfe } from "../nfe/megaNfeClient.js";
import { env } from "../env.js";

const router = Router();

const typeSchema = z.enum([
  "proposal",
  "contract",
  "purchase_order",
  "incoming_invoice",
  "production_order",
  "nfe",
  "nfce",
  "service_invoice",
]);

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const q = z
    .object({
      type: typeSchema,
      query: z.string().optional(),
      status: z.string().optional(),
    })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.flatten() });

  const docs = await listBizDocuments((req as AuthedRequest).auth.userId, q.data);
  res.json({ docs });
}));

router.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const doc = await getBizDocument((req as AuthedRequest).auth.userId, req.params.id);
  if (!doc) return res.status(404).json({ error: "Documento não encontrado" });
  res.json({ doc });
}));

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid().nullable().optional(),
  description: z.string().min(1),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  discount: z.number().min(0),
  total: z.number().min(0),
});

const docSchema = z.object({
  type: typeSchema,
  partyId: z.string().uuid().nullable().optional(),
  partyName: z.string().nullable().optional(),
  date: z.string().min(1),
  status: z.string().min(1),
  notes: z.string().nullable().optional(),
  items: z.array(itemSchema).optional(),
  payload: z.any().optional(),
  totalOverride: z.number().nullable().optional(),
});

router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const body = docSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const doc = await createBizDocument((req as AuthedRequest).auth.userId, body.data as any);
  res.status(201).json({ doc });
}));

router.put("/:id", requireAuth, asyncHandler(async (req, res) => {
  const body = docSchema.omit({ type: true }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });
  const doc = await updateBizDocument((req as AuthedRequest).auth.userId, req.params.id, body.data as any);
  res.json({ doc });
}));

router.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  const doc = await cancelBizDocument((req as AuthedRequest).auth.userId, req.params.id);
  res.json({ doc });
}));

router.post("/:id/issue", requireAuth, asyncHandler(async (req, res) => {
  const body = z.object({}).safeParse(req.body ?? {});
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const userId = (req as AuthedRequest).auth.userId;
  const user = await findUserById(userId);
  if (!user) return res.status(401).json({ error: "Sessão inválida" });

  const doc = await getBizDocument(userId, req.params.id);
  if (!doc) return res.status(404).json({ error: "Documento não encontrado" });
  if (!(doc.type === "nfe" || doc.type === "nfce")) {
    return res.status(400).json({ error: "Ação inválida para este tipo de documento." });
  }

  if (doc.status === "issued") {
    return res.json({ doc });
  }

  if (!doc.partyId) {
    return res.status(400).json({ error: "Selecione um cliente para emissão." });
  }

  const contact = await getContact(userId, doc.partyId);
  if (!contact) {
    return res.status(400).json({ error: "Cliente não encontrado." });
  }

  if (!doc.items?.length) {
    return res.status(400).json({ error: "Adicione itens antes de emitir." });
  }

  const companyName = (user.company_name ?? "").trim();
  const emitterDoc = (user.document ?? "").trim();
  if (!companyName || !emitterDoc) {
    return res.status(400).json({ error: "Preencha Dados da Empresa (Razão Social e CNPJ/CPF) antes de emitir." });
  }

  const prefs = typeof user.preferences === "object" && user.preferences ? user.preferences : {};
  const fiscal = (prefs as any).fiscal;
  const environment =
    fiscal?.environment === "prod" ? "prod" : fiscal?.environment === "homolog" ? "homolog" : env.MEGA_NFE_DEFAULT_ENV ?? "homolog";

  try {
    const issued = await issueWithMegaNfe({
      kind: doc.type,
      environment,
      document: {
        id: doc.id,
        number: doc.number,
        date: doc.date,
        total: doc.totals.total,
      },
      emitter: {
        companyName,
        document: emitterDoc,
        ie: user.ie ?? null,
        address: {
          zip: user.address_zip ?? null,
          street: user.address_street ?? null,
          number: user.address_number ?? null,
          neighborhood: user.address_neighborhood ?? null,
          city: user.address_city ?? null,
          state: user.address_state ?? null,
          complement: user.address_complement ?? null,
        },
      },
      recipient: {
        name: contact.name,
        document: contact.cpf_cnpj,
        ie: contact.rg_ie,
        address: {
          zip: contact.address_zip,
          street: contact.address_street,
          number: contact.address_number,
          neighborhood: contact.address_neighborhood,
          city: contact.address_city,
          state: contact.address_state,
          complement: contact.address_complement,
        },
      },
      items: doc.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        total: it.total,
      })),
    });

    const nextPayload = {
      ...(doc.payload ?? {}),
      issuedAt: new Date().toISOString(),
      nfe: {
        service: "mega_erp",
        environment,
        status: issued.status,
        accessKey: issued.accessKey,
        protocol: issued.protocol ?? null,
        pdfUrl: issued.pdfUrl ?? null,
        xmlUrl: issued.xmlUrl ?? null,
      },
    };

    const nextStatus = issued.status === "authorized" ? "issued" : "open";

    const updated = await updateBizDocument(userId, doc.id, {
      partyId: doc.partyId,
      partyName: doc.partyName,
      date: doc.date,
      status: nextStatus,
      notes: doc.notes,
      items: doc.items,
      payload: nextPayload,
      totalOverride: doc.totals.total,
    });

    res.json({ doc: updated });
  } catch (e: any) {
    return res.status(502).json({ error: e?.message ?? "Falha ao emitir nota." });
  }
}));

export default router;

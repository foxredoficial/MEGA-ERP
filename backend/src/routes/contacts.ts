import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { 
  createContact, 
  listContacts, 
  getContact, 
  updateContact, 
  deleteContact 
} from "../repos/contacts.js";
import { asyncHandler } from "../http.js";
import { z } from "zod";

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  fantasy_name: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  type: z.enum(['fisica', 'juridica']).default('fisica'),
  cpf_cnpj: z.string().nullable().optional(),
  rg_ie: z.string().nullable().optional(),
  contributor_type: z.number().nullable().optional(),
  date_since: z.string().nullable().optional(),
  
  address_zip: z.string().nullable().optional(),
  address_street: z.string().nullable().optional(),
  address_number: z.string().nullable().optional(),
  address_complement: z.string().nullable().optional(),
  address_neighborhood: z.string().nullable().optional(),
  address_city: z.string().nullable().optional(),
  address_state: z.string().nullable().optional(),
  
  address_billing_zip: z.string().nullable().optional(),
  address_billing_street: z.string().nullable().optional(),
  address_billing_number: z.string().nullable().optional(),
  address_billing_complement: z.string().nullable().optional(),
  address_billing_neighborhood: z.string().nullable().optional(),
  address_billing_city: z.string().nullable().optional(),
  address_billing_state: z.string().nullable().optional(),
  
  phone: z.string().nullable().optional(),
  fax: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  website: z.string().nullable().optional(),
  skype: z.string().nullable().optional(),
  contacts_json: z.any().nullable().optional(),
  
  avg_load: z.number().nullable().optional(),
  marital_status: z.string().nullable().optional(),
  profession: z.string().nullable().optional(),
  gender: z.enum(['masculino', 'feminino', 'outro']).nullable().optional(),
  birth_date: z.string().nullable().optional(),
  naturalness: z.string().nullable().optional(),
  parents_json: z.any().nullable().optional(),
  contact_type: z.enum(["cliente", "fornecedor"]).nullable().optional(),
  status: z.enum(['ativo', 'inativo', 'sem_movimento']).default('ativo'),
  seller: z.string().nullable().optional(),
  operation_nature: z.string().nullable().optional(),
  
  credit_limit: z.number().nullable().optional(),
  credit_limit_type: z.enum(['limitado', 'ilimitado', 'zero']).default('limitado'),
  payment_condition: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  
  observations: z.string().nullable().optional(),
});

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const q = z
    .object({
      contactType: z.enum(["cliente", "fornecedor"]).optional(),
    })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.flatten() });

  const contacts = await listContacts((req as AuthedRequest).auth.userId, { contactType: q.data.contactType });
  res.json({ contacts });
}));

router.post("/", requireAuth, asyncHandler(async (req, res) => {
  try {
    const data = contactSchema.parse(req.body);
    const id = await createContact((req as AuthedRequest).auth.userId, data as any);
    res.status(201).json({ id });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    throw e;
  }
}));

router.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const contact = await getContact((req as AuthedRequest).auth.userId, req.params.id);
  if (!contact) {
    return res.status(404).json({ error: "Contato não encontrado" });
  }
  res.json({ contact });
}));

router.put("/:id", requireAuth, asyncHandler(async (req, res) => {
  try {
    const data = contactSchema.partial().parse(req.body);
    await updateContact((req as AuthedRequest).auth.userId, req.params.id, data as any);
    res.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    throw e;
  }
}));

router.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  await deleteContact((req as AuthedRequest).auth.userId, req.params.id);
  res.json({ success: true });
}));

export default router;

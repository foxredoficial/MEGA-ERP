import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { asyncHandler, sendError } from "../http.js";
import { createUser, findUserByEmail, findUserById, findUserByGoogleId } from "../repos/users.js";
import { clearSessionCookie, getSessionFromRequest, setSessionCookie, signSession } from "../auth/session.js";
import { requireAuth, type AuthedRequest } from "../auth/requireAuth.js";
import { env } from "../env.js";
import { buildGoogleAuthUrl, exchangeGoogleCodeForTokens, verifyGoogleIdToken } from "../auth/google.js";

export const authRouter = Router();

function buildProfile(user: any) {
  return {
    fullName: user.full_name,
    companyName: user.company_name,
    document: user.document ?? null,
    phone: user.phone ?? null,
    addressZip: user.address_zip ?? null,
    addressStreet: user.address_street ?? null,
    addressNumber: user.address_number ?? null,
    addressNeighborhood: user.address_neighborhood ?? null,
    addressCity: user.address_city ?? null,
    addressState: user.address_state ?? null,
    addressComplement: user.address_complement ?? null,
    personType: user.person_type ?? null,
    ie: user.ie ?? null,
    im: user.im ?? null,
    cnae: user.cnae ?? null,
    taxRegime: user.tax_regime ?? null,
    mobile: user.mobile ?? null,
    emailBilling: user.email_billing ?? null,
    website: user.website ?? null,
  };
}

function safeNextPath(value: unknown) {
  if (typeof value !== "string") return "/app";
  if (!value.startsWith("/")) return "/app";
  if (value.startsWith("//")) return "/app";
  return value;
}

import { linkGoogleAccount, unlinkGoogleAccount } from "../repos/users.js";

authRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const session = await getSessionFromRequest(req);
    if (!session) return res.json({ authenticated: false } as const);
    const user = await findUserById(session.userId);
    if (!user) return res.json({ authenticated: false } as const);
    res.json({
      authenticated: true as const,
      user: { id: user.id, email: user.email, role: user.role },
      profile: buildProfile(user),
      auth: {
        hasPassword: Boolean(user.has_password),
        googleId: user.google_id
      },
      preferences: user.preferences
    });
  })
);

authRouter.get(
  "/google/start",
  asyncHandler(async (req, res) => {
    try {
      const next = safeNextPath(req.query.next);
      const isLinking = req.query.mode === "link";
      const state = isLinking ? `link:${randomUUID()}` : randomUUID();
      const isProd = process.env.NODE_ENV === "production";

      if (isLinking) {
        // Verificar se o usuário está logado antes de permitir iniciar vinculação
        const session = await getSessionFromRequest(req);
        if (!session) return res.redirect(`${env.APP_ORIGIN}/auth?mode=login&oauthError=login_required`);
      }

      res.cookie("megaerp_g_state", state, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 1000 * 60 * 10,
      });
      res.cookie("megaerp_g_next", next, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 1000 * 60 * 10,
      });

      const url = buildGoogleAuthUrl({ state });
      res.redirect(url);
    } catch {
      res.redirect(`${env.APP_ORIGIN}/auth?mode=login&oauthError=google_config`);
    }
  })
);

authRouter.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const next = safeNextPath(req.cookies?.megaerp_g_next);
    const stateCookie = typeof req.cookies?.megaerp_g_state === "string" ? (req.cookies.megaerp_g_state as string) : null;

    res.clearCookie("megaerp_g_state", { path: "/" });
    res.clearCookie("megaerp_g_next", { path: "/" });

    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;
    if (!code || !state || !stateCookie || state !== stateCookie) {
      return res.redirect(`${env.APP_ORIGIN}/auth?mode=login&oauthError=google_state`);
    }

    try {
      const { idToken } = await exchangeGoogleCodeForTokens({ code });
      const profile = await verifyGoogleIdToken(idToken);
      const googleId = profile.sub; // Google User ID

      const isLinking = state.startsWith("link:");

      if (isLinking) {
        const session = await getSessionFromRequest(req);
        
        if (!session) return res.redirect(`${env.APP_ORIGIN}/app#security?error=link_failed_session`);
        
        // Verificar se já existe conta com esse googleId
        // Como findUserByEmail não busca por googleId, precisaríamos de findUserByGoogleId.
        // Mas podemos tentar achar pelo email do google também.
        
        // Na verdade, queremos garantir que este Google ID não esteja em uso por OUTRO usuário.
        // Por simplicidade, vamos assumir que se o email bater, é o mesmo usuário.
        // Se o email for diferente, pode ser problemático se quisermos vincular emails diferentes.
        // Mas a regra mais segura é: só vincula se o email for o mesmo OU se o Google ID não estiver em uso.
        
        // Vamos simplificar: vincula ao usuário logado. Se der erro de duplicate key (google_id unique), tratamos.
        try {
          await linkGoogleAccount(session.userId, googleId);
          return res.redirect(`${env.APP_ORIGIN}/app#security?success=google_linked`);
        } catch (e: any) {
           if (e.code === 'ER_DUP_ENTRY') {
             return res.redirect(`${env.APP_ORIGIN}/app#security?error=google_in_use`);
           }
           throw e;
        }
      }

      const email = profile.email.toLowerCase().trim();
      
      // 1. Tentar encontrar usuário pelo Google ID (Login direto)
      let user = await findUserByGoogleId(googleId);

      // 2. Se não encontrou, tentar pelo e-mail
      if (!user) {
        user = await findUserByEmail(email);

        if (user) {
          // Usuário existe por e-mail, mas não tem Google ID vinculado.
          // Tentar vincular.
          if (!user.google_id) {
            try {
              await linkGoogleAccount(user.id, googleId);
              user.google_id = googleId; // Atualizar objeto local
            } catch (e: any) {
              if (e.code === 'ER_DUP_ENTRY') {
                // Google ID já está em uso por OUTRO usuário (race condition ou inconsistência)
                console.error("[Google Callback] Google ID collision:", googleId);
                return res.redirect(`${env.APP_ORIGIN}/auth?mode=login&oauthError=google_in_use`);
              }
              throw e;
            }
          } else {
             // Usuário já tem um google_id diferente?
             // Se google_id for diferente do que estamos tentando logar, e estamos logando com o NOVO...
             // Isso seria "troca de conta google"? Não, aqui é login.
             // Se o user.google_id != googleId, então o email está vinculado a OUTRA conta Google.
             // Não podemos logar com ESTA conta Google.
             if (user.google_id !== googleId) {
               return res.redirect(`${env.APP_ORIGIN}/auth?mode=login&oauthError=google_email_mismatch`);
             }
          }
        } else {
           // 3. Criar novo usuário se não encontrou nem por ID nem por e-mail
           const id = randomUUID();
           const passwordHash = await bcrypt.hash(randomUUID(), 12);
           const fullName = (profile.name ?? email.split("@")[0] ?? "Cliente").trim();
           await createUser({
             id,
             email,
             passwordHash,
             fullName,
             companyName: null,
             googleId: googleId,
             hasPassword: false
           });
           user = await findUserById(id);
        }
      }

      if (!user) return res.redirect(`${env.APP_ORIGIN}/auth?mode=login&oauthError=google_user`);
      const token = await signSession({ sub: user.id, email: user.email, role: user.role });
      
      setSessionCookie(res, token);
      return res.redirect(`${env.APP_ORIGIN}${next}`);
    } catch (err) {
      console.error("[Google Callback] Error:", err);
      return res.redirect(`${env.APP_ORIGIN}/auth?mode=login&oauthError=google_failed`);
    }
  })
);

authRouter.post(
  "/google/unlink",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = req as AuthedRequest;
    const user = await findUserById(r.auth.userId);
    if (!user) return sendError(res, 401, "Usuário não encontrado.");

    if (!user.has_password) {
      return sendError(res, 400, "Você precisa definir uma senha antes de desconectar o Google.");
    }

    await unlinkGoogleAccount(user.id);
    res.json({ ok: true });
  })
);

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        fullName: z.string().min(2),
        companyName: z.string().min(2),
        planId: z.string().optional().nullable(),
      })
      .safeParse(req.body);

    if (!body.success) return sendError(res, 400, "Dados inválidos.", body.error.flatten());

    const email = body.data.email.toLowerCase().trim();
    const existing = await findUserByEmail(email);
    if (existing) return sendError(res, 409, "Email já cadastrado.");

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(body.data.password, 12);
    await createUser({
      id,
      email,
      passwordHash,
      fullName: body.data.fullName.trim(),
      companyName: body.data.companyName.trim() || null,
      hasPassword: true,
    });

    const token = await signSession({ sub: id, email });
    setSessionCookie(res, token);

    res.json({
      user: { id, email },
      profile: {
        fullName: body.data.fullName.trim(),
        companyName: body.data.companyName.trim() || null,
        document: null,
        phone: null,
        addressZip: null,
        addressStreet: null,
        addressNumber: null,
        addressNeighborhood: null,
        addressCity: null,
        addressState: null,
        addressComplement: null,
        personType: 'juridica',
        ie: null,
        im: null,
        cnae: null,
        taxRegime: null,
        mobile: null,
        emailBilling: null,
        website: null,
      },
      auth: { hasPassword: true, googleId: null },
      preferences: null,
    });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(1),
      })
      .safeParse(req.body);

    if (!body.success) return sendError(res, 400, "Dados inválidos.", body.error.flatten());

    const email = body.data.email.toLowerCase().trim();
    const user = await findUserByEmail(email);
    if (!user) return sendError(res, 401, "Email ou senha inválidos.");

    const ok = await bcrypt.compare(body.data.password, user.password_hash);
    if (!ok) return sendError(res, 401, "Email ou senha inválidos.");

    const token = await signSession({ sub: user.id, email: user.email, role: user.role });
    setSessionCookie(res, token);

    res.json({
      user: { id: user.id, email: user.email, role: user.role },
      profile: buildProfile(user),
      auth: { hasPassword: Boolean(user.has_password), googleId: user.google_id },
      preferences: user.preferences
    });
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    clearSessionCookie(res);
    res.status(204).send();
  })
);

authRouter.post(
  "/password/forgot",
  asyncHandler(async (_req, res) => {
    return sendError(res, 501, "Recuperação de senha requer serviço de email configurado.");
  })
);

authRouter.get(
  "/protected-ping",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = req as AuthedRequest;
    res.json({ ok: true, userId: r.auth.userId });
  })
);

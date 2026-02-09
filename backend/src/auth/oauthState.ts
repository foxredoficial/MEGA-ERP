import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { env } from "../env.js";

type GoogleOAuthState = {
  kind: "google";
  mode: "login" | "link";
  next: string;
  nonce: string;
};

function secretKey() {
  return new TextEncoder().encode(env.SESSION_JWT_SECRET);
}

export async function signGoogleOAuthState(args: { mode: "login" | "link"; next: string }) {
  const payload: GoogleOAuthState = {
    kind: "google",
    mode: args.mode,
    next: args.next,
    nonce: randomUUID(),
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secretKey());
}

export async function verifyGoogleOAuthState(state: string): Promise<GoogleOAuthState> {
  const { payload } = await jwtVerify(state, secretKey(), { algorithms: ["HS256"] });
  if (payload.kind !== "google") throw new Error("Estado OAuth inválido.");
  if (payload.mode !== "login" && payload.mode !== "link") throw new Error("Estado OAuth inválido.");
  if (typeof payload.next !== "string" || !payload.next.startsWith("/")) throw new Error("Estado OAuth inválido.");
  if (typeof payload.nonce !== "string" || payload.nonce.length < 10) throw new Error("Estado OAuth inválido.");
  return payload as unknown as GoogleOAuthState;
}


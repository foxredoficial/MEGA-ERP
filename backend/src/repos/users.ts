import { pool } from "../db.js";
import type { RowDataPacket } from "mysql2/promise";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  google_id: string | null;
  has_password: number; // 0 or 1 in mysql
  full_name: string;
  company_name: string | null;
  document: string | null;
  phone: string | null;
  address_zip: string | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_complement: string | null;
  created_at: Date;
  updated_at: Date;
  // Novos campos
  person_type: 'fisica' | 'juridica' | null;
  ie: string | null;
  im: string | null;
  cnae: string | null;
  tax_regime: string | null;
  mobile: string | null;
  email_billing: string | null;
  website: string | null;
  role: 'user' | 'admin';
  preferences: any | null;
  trial_started_at: Date | null;
  trial_ended_at: Date | null;
};

const SELECT_FIELDS = `
  id, email, password_hash, google_id, has_password, full_name, company_name, 
  document, phone, address_zip, address_street, address_number, address_neighborhood, 
  address_city, address_state, address_complement, created_at, updated_at,
  person_type, ie, im, cnae, tax_regime, mobile, email_billing, website, role, preferences,
  trial_started_at, trial_ended_at
`;

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const [rows] = await pool.query<(UserRow & RowDataPacket)[]>(
    `SELECT ${SELECT_FIELDS} FROM users WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const [rows] = await pool.query<(UserRow & RowDataPacket)[]>(
    `SELECT ${SELECT_FIELDS} FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function findUserByGoogleId(googleId: string): Promise<UserRow | null> {
  const [rows] = await pool.query<(UserRow & RowDataPacket)[]>(
    `SELECT ${SELECT_FIELDS} FROM users WHERE google_id = ? LIMIT 1`,
    [googleId]
  );
  return rows[0] ?? null;
}

export async function createUser(args: {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  companyName: string | null;
  googleId?: string | null;
  hasPassword?: boolean;
  role?: 'user' | 'admin';
}) {
  const now = new Date();
  await pool.query(
    "INSERT INTO users (id, email, password_hash, full_name, company_name, google_id, has_password, role, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [
      args.id,
      args.email,
      args.passwordHash,
      args.fullName,
      args.companyName,
      args.googleId ?? null,
      args.hasPassword === false ? 0 : 1,
      args.role ?? 'user',
      now,
      now,
    ]
  );
}

export async function linkGoogleAccount(id: string, googleId: string) {
  const now = new Date();
  await pool.query("UPDATE users SET google_id = ?, updated_at = ? WHERE id = ?", [googleId, now, id]);
}

export async function unlinkGoogleAccount(id: string) {
  const now = new Date();
  await pool.query("UPDATE users SET google_id = NULL, updated_at = ? WHERE id = ?", [now, id]);
}

export async function updateUserProfile(args: {
  id: string;
  fullName: string;
  companyName: string | null;
  document?: string | null;
  phone?: string | null;
  addressZip?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressComplement?: string | null;
  // Novos
  personType?: 'fisica' | 'juridica' | null;
  ie?: string | null;
  im?: string | null;
  cnae?: string | null;
  taxRegime?: string | null;
  mobile?: string | null;
  emailBilling?: string | null;
  website?: string | null;
}) {
  const now = new Date();
  await pool.query(
    `UPDATE users SET 
      full_name = ?, 
      company_name = ?, 
      document = ?,
      phone = ?,
      address_zip = ?,
      address_street = ?,
      address_number = ?,
      address_neighborhood = ?,
      address_city = ?,
      address_state = ?,
      address_complement = ?,
      person_type = ?,
      ie = ?,
      im = ?,
      cnae = ?,
      tax_regime = ?,
      mobile = ?,
      email_billing = ?,
      website = ?,
      updated_at = ? 
    WHERE id = ?`,
    [
      args.fullName,
      args.companyName,
      args.document ?? null,
      args.phone ?? null,
      args.addressZip ?? null,
      args.addressStreet ?? null,
      args.addressNumber ?? null,
      args.addressNeighborhood ?? null,
      args.addressCity ?? null,
      args.addressState ?? null,
      args.addressComplement ?? null,
      args.personType ?? 'juridica',
      args.ie ?? null,
      args.im ?? null,
      args.cnae ?? null,
      args.taxRegime ?? null,
      args.mobile ?? null,
      args.emailBilling ?? null,
      args.website ?? null,
      now,
      args.id,
    ]
  );
}

export async function updateUserPassword(id: string, passwordHash: string) {
  const now = new Date();
  await pool.query("UPDATE users SET password_hash = ?, has_password = 1, updated_at = ? WHERE id = ?", [passwordHash, now, id]);
}

export async function updateUserPreferences(id: string, preferences: any) {
  const now = new Date();
  await pool.query("UPDATE users SET preferences = ?, updated_at = ? WHERE id = ?", [JSON.stringify(preferences), now, id]);
}

export async function updateUserTrial(id: string, trialStartedAt: Date | null, trialEndedAt: Date | null) {
  const now = new Date();
  await pool.query("UPDATE users SET trial_started_at = ?, trial_ended_at = ?, updated_at = ? WHERE id = ?", [
    trialStartedAt,
    trialEndedAt,
    now,
    id,
  ]);
}

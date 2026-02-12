export type BankStatementLine = {
  externalId: string;
  occurredAt: string;
  type: "in" | "out";
  amount: number;
  description: string;
  raw?: any;
};

function normalizeMoney(s: string) {
  const cleaned = s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^0-9,.-]/g, "");
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;
  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizeDate(s: string) {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m1 = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  const m2 = t.match(/^(\d{8})$/);
  if (m2) return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function fnv1a(str: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function buildExternalId(parts: { date: string; amount: number; description: string; fitId?: string | null }) {
  if (parts.fitId && parts.fitId.trim().length >= 8) return parts.fitId.trim();
  const base = `${parts.date}|${parts.amount.toFixed(2)}|${parts.description.trim().toLowerCase()}`;
  return `auto_${fnv1a(base)}`;
}

export function parseCsvBankStatement(content: string): BankStatementLine[] {
  const lines = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const out: BankStatementLine[] = [];
  for (const line of lines) {
    const sep = line.includes(";") ? ";" : ",";
    const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 3) continue;

    const date = normalizeDate(cols[0]);
    if (!date) continue;

    const maybeValue = normalizeMoney(cols[cols.length - 1]);
    if (maybeValue === null) continue;

    const description = cols.slice(1, cols.length - 1).join(" ").trim() || "Extrato";
    const signed = maybeValue;
    const type: "in" | "out" = signed >= 0 ? "in" : "out";
    const amount = Math.abs(signed);

    out.push({
      externalId: buildExternalId({ date, amount, description }),
      occurredAt: `${date}T12:00:00.000Z`,
      type,
      amount,
      description,
      raw: { cols },
    });
  }
  return out;
}

function ofxTagValue(block: string, tag: string) {
  const r = new RegExp(`<${tag}>([^<\n\r]+)`, "i");
  const m = block.match(r);
  return m ? m[1].trim() : null;
}

export function parseOfxBankStatement(content: string): BankStatementLine[] {
  const text = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const out: BankStatementLine[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  for (const b0 of blocks) {
    const block = b0.split(/<\/STMTTRN>/i)[0] ?? b0;
    const dt = ofxTagValue(block, "DTPOSTED") ?? ofxTagValue(block, "DTUSER") ?? "";
    const amtRaw = ofxTagValue(block, "TRNAMT") ?? "";
    const memo = ofxTagValue(block, "MEMO") ?? ofxTagValue(block, "NAME") ?? "Extrato";
    const fitId = ofxTagValue(block, "FITID");

    const date = normalizeDate(dt.slice(0, 8));
    const money = normalizeMoney(amtRaw);
    if (!date || money === null) continue;
    const type: "in" | "out" = money >= 0 ? "in" : "out";
    const amount = Math.abs(money);

    out.push({
      externalId: buildExternalId({ date, amount, description: memo, fitId }),
      occurredAt: `${date}T12:00:00.000Z`,
      type,
      amount,
      description: memo,
      raw: { fitId, dtPosted: dt, trnAmt: amtRaw },
    });
  }
  return out;
}

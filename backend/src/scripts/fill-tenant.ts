import { randomUUID } from "node:crypto";
import { pool } from "../db.js";
import { createTenantDatabase, getTenantPool } from "../db_tenant.js";

type Args = {
  email: string;
  tenantId?: string;
  months: number;
  reset: boolean;
  recreate: boolean;
  profile: "normal" | "rich";
  companyName: string;
};

function parseArgs(argv: string[]): Args {
  const out: Args = {
    email: "",
    tenantId: undefined,
    months: 8,
    reset: false,
    recreate: false,
    profile: "rich",
    companyName: "LojaTeste",
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email") out.email = String(argv[i + 1] ?? "");
    if (a === "--tenant") out.tenantId = String(argv[i + 1] ?? "");
    if (a === "--months") out.months = Number(argv[i + 1] ?? out.months);
    if (a === "--reset") out.reset = true;
    if (a === "--recreate") out.recreate = true;
    if (a === "--profile") out.profile = String(argv[i + 1] ?? out.profile) === "normal" ? "normal" : "rich";
    if (a === "--company") out.companyName = String(argv[i + 1] ?? out.companyName);
  }

  if (!out.email && !out.tenantId) {
    throw new Error("Uso: tsx src/scripts/fill-tenant.ts --email <email> [--months 8] [--company LojaTeste] [--profile rich|normal] [--reset] [--recreate]");
  }

  out.months = clampInt(out.months, 1, 24);
  out.companyName = (out.companyName || "LojaTeste").trim();
  return out;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toMysqlDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toMysqlDateTime(d: Date) {
  return `${toMysqlDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]!;
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

function formatCpf(digits11: string) {
  const d = onlyDigits(digits11).padStart(11, "0").slice(0, 11);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

function formatCnpj(digits14: string) {
  const d = onlyDigits(digits14).padStart(14, "0").slice(0, 14);
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

function genCpfInvalid() {
  const base = Array.from({ length: 9 }, () => randInt(0, 9)).join("");
  return formatCpf(base + "00");
}

function genCnpjInvalid() {
  const base = Array.from({ length: 12 }, () => randInt(0, 9)).join("");
  return formatCnpj(base + "00");
}

function subMonths(date: Date, months: number) {
  const d = new Date(date);
  const targetMonth = d.getMonth() - months;
  const target = new Date(d);
  target.setMonth(targetMonth);
  if (target.getMonth() === ((targetMonth % 12) + 12) % 12) return target;
  return new Date(target.getFullYear(), target.getMonth() + 1, 0, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function randTimeOnDay(day: Date, hourStart: number, hourEnd: number) {
  const h = randInt(hourStart, hourEnd);
  const m = randInt(0, 59);
  const s = randInt(0, 59);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, s, 0);
}

type WeightedDay = { day: Date; weight: number; mood: "good" | "bad" };

function buildWeightedDays(start: Date, end: Date): WeightedDay[] {
  const s = startOfDay(start);
  const e = startOfDay(end);
  const days: WeightedDay[] = [];

  const monthCycle = [0.8, 1.05, 0.9, 1.2, 0.75, 1.15, 0.95, 1.25, 0.85];
  const monthFactor = new Map<string, number>();
  let cursor = new Date(s);
  while (cursor <= e) {
    const mk = `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}`;
    if (!monthFactor.has(mk)) monthFactor.set(mk, monthCycle[monthFactor.size % monthCycle.length]!);
    cursor = addDays(cursor, 1);
  }

  const totalDays = Math.max(1, Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const specialBadDays = new Set<string>();
  for (let i = 0; i < Math.min(12, Math.max(6, Math.floor(totalDays * 0.04))); i++) {
    specialBadDays.add(dateKey(addDays(s, randInt(0, totalDays - 1))));
  }

  for (let i = 0; i < totalDays; i++) {
    const day = addDays(s, i);
    const weekday = day.getDay();
    const weekdayFactor = weekday === 5 ? 1.25 : weekday === 6 ? 1.35 : weekday === 0 ? 0.8 : weekday === 1 ? 0.75 : 1.0;
    const mk = `${day.getFullYear()}-${pad2(day.getMonth() + 1)}`;
    const mf = monthFactor.get(mk) ?? 1;
    const paydayFactor = day.getDate() >= 4 && day.getDate() <= 7 ? 1.12 : day.getDate() >= 18 && day.getDate() <= 22 ? 1.1 : 1.0;
    const bad = specialBadDays.has(dateKey(day));
    const weight = Math.max(0.05, 1.0 * weekdayFactor * mf * paydayFactor * (bad ? 0.2 : 1.0));
    days.push({ day, weight, mood: weight >= 1.05 ? "good" : weight <= 0.75 ? "bad" : "good" });
  }

  return days;
}

function pickWeightedDay(days: WeightedDay[]) {
  let total = 0;
  for (const d of days) total += d.weight;
  let r = Math.random() * total;
  for (const d of days) {
    r -= d.weight;
    if (r <= 0) return d;
  }
  return days[days.length - 1]!;
}

const FIRST_NAMES_M = ["João", "Pedro", "Lucas", "Mateus", "Guilherme", "Rafael", "Bruno", "Diego", "Thiago", "Felipe", "Eduardo", "Leonardo", "Gabriel", "Caio", "Vitor", "Henrique", "André", "Marcos", "Roberto", "Carlos"];
const FIRST_NAMES_F = ["Maria", "Ana", "Beatriz", "Camila", "Juliana", "Fernanda", "Carolina", "Mariana", "Aline", "Patrícia", "Larissa", "Letícia", "Jéssica", "Gabriela", "Bruna", "Renata", "Priscila", "Sabrina", "Vanessa", "Débora"];
const LAST_NAMES = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Ferreira", "Almeida", "Costa", "Rodrigues", "Martins", "Araújo", "Melo", "Barbosa", "Ribeiro", "Gomes", "Carvalho", "Cardoso", "Teixeira", "Cavalcante"];

const COMPANY_PREFIX = ["Comercial", "Distribuidora", "Atacadão", "Casa", "Center", "Importadora", "Auto", "Tech", "Mega", "Rápido"];
const COMPANY_SUFFIX = ["LTDA", "ME", "EIRELI", "S/A"];
const COMPANY_NOUNS = ["Acessórios", "Eletrônicos", "Celulares", "Informática", "Variedades", "Serviços", "Assistência", "Bazar", "Utilidades", "Consertos"];

const ADDRESS_STREETS = [
  "Rua das Flores",
  "Rua São José",
  "Rua da Paz",
  "Rua 7 de Setembro",
  "Rua XV de Novembro",
  "Avenida Brasil",
  "Avenida Paulista",
  "Avenida Independência",
  "Rua Padre Anchieta",
  "Rua do Comércio",
  "Rua das Acácias",
  "Rua dos Ipês",
  "Avenida Central",
];
const ADDRESS_NEIGHBORHOODS = ["Centro", "Jardim América", "Vila Nova", "Santa Cecília", "Boa Vista", "Jardim das Oliveiras", "Parque Industrial", "Vila Mariana", "São Francisco", "Jardim Primavera"];
const ADDRESS_CITIES = [
  { city: "São Paulo", state: "SP" },
  { city: "Campinas", state: "SP" },
  { city: "Santo André", state: "SP" },
  { city: "São Bernardo do Campo", state: "SP" },
  { city: "Rio de Janeiro", state: "RJ" },
  { city: "Niterói", state: "RJ" },
  { city: "Belo Horizonte", state: "MG" },
  { city: "Contagem", state: "MG" },
  { city: "Curitiba", state: "PR" },
  { city: "Londrina", state: "PR" },
  { city: "Porto Alegre", state: "RS" },
  { city: "Canoas", state: "RS" },
];

function genPersonName() {
  const isF = Math.random() < 0.52;
  const first = isF ? randChoice(FIRST_NAMES_F) : randChoice(FIRST_NAMES_M);
  const last1 = randChoice(LAST_NAMES);
  const last2 = Math.random() < 0.65 ? randChoice(LAST_NAMES) : null;
  return [first, last1, last2].filter(Boolean).join(" ");
}

function genCompanyName() {
  const p = randChoice(COMPANY_PREFIX);
  const n = randChoice(COMPANY_NOUNS);
  const s = randChoice(COMPANY_SUFFIX);
  const extra = Math.random() < 0.35 ? randChoice(["do Brasil", "Prime", "Express", "Sul", "Norte", "Central"]) : null;
  return [p, n, extra, s].filter(Boolean).join(" ");
}

function slugEmail(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.+/g, ".");
}

function genZip() {
  return `${randInt(10000, 99999)}-${randInt(100, 999)}`;
}

function genPhone() {
  const ddd = randChoice(["11", "21", "31", "41", "51"]);
  const isMobile = Math.random() < 0.7;
  if (isMobile) return `(${ddd}) 99999-0${randInt(0, 999)}`.replace(/-(\d)$/, `-${String(randInt(0, 9999)).padStart(4, "0")}`);
  return `(${ddd}) 4000-${String(randInt(0, 9999)).padStart(4, "0")}`;
}

function genAddress() {
  const street = randChoice(ADDRESS_STREETS);
  const neighborhood = randChoice(ADDRESS_NEIGHBORHOODS);
  const number = String(randInt(10, 9999));
  const complement = Math.random() < 0.35 ? randChoice(["Apto 12", "Casa", "Sala 3", "Loja 1", "Fundos"]) : null;
  const city = randChoice(ADDRESS_CITIES);
  return {
    zip: genZip(),
    street,
    number,
    complement,
    neighborhood,
    city: city.city,
    state: city.state,
  };
}

async function findTenantIdByEmail(email: string) {
  const e = email.toLowerCase().trim();
  const [rows] = await pool.query<any[]>("SELECT id FROM users WHERE email = ? LIMIT 1", [e]);
  return rows?.[0]?.id ? String(rows[0].id) : null;
}

async function resetFill(tenantPool: any, userId: string) {
  const conn = await tenantPool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query("DELETE soi FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.order_id WHERE so.user_id = ? AND so.observations LIKE '%FILL::%'", [userId]);
    await conn.query("DELETE FROM sales_orders WHERE user_id = ? AND observations LIKE '%FILL::%'", [userId]);

    await conn.query("DELETE soi FROM service_order_items soi JOIN service_orders so ON so.id = soi.order_id WHERE so.user_id = ? AND so.description LIKE '%FILL::%'", [userId]);
    await conn.query("DELETE FROM service_orders WHERE user_id = ? AND description LIKE '%FILL::%'", [userId]);

    await conn.query("DELETE psi FROM pdv_sale_items psi JOIN pdv_sales ps ON ps.id = psi.sale_id WHERE ps.user_id = ? AND ps.customer_name LIKE '%FILL::%'", [userId]);
    await conn.query("DELETE FROM pdv_sales WHERE user_id = ? AND customer_name LIKE '%FILL::%'", [userId]);

    await conn.query("DELETE fp FROM financial_payments fp JOIN financial_titles ft ON ft.id = fp.title_id WHERE ft.user_id = ? AND ft.description LIKE '%FILL::%'", [userId]);
    await conn.query("DELETE FROM financial_titles WHERE user_id = ? AND description LIKE '%FILL::%'", [userId]);

    await conn.query("DELETE ct FROM cash_transactions ct JOIN cash_sessions cs ON cs.id = ct.session_id WHERE cs.user_id = ? AND cs.notes LIKE '%FILL::%'", [userId]);
    await conn.query("DELETE FROM cash_sessions WHERE user_id = ? AND notes LIKE '%FILL::%'", [userId]);

    await conn.query("DELETE FROM stock_movements WHERE user_id = ? AND reason LIKE '%FILL::%'", [userId]);
    await conn.query("DELETE FROM product_lots WHERE observations LIKE '%FILL::%'", []);
    await conn.query("DELETE FROM products WHERE user_id = ? AND observations LIKE '%FILL::%'", [userId]);
    await conn.query("DELETE FROM contacts WHERE user_id = ? AND observations LIKE '%FILL::%'", [userId]);
    await conn.query("DELETE FROM salespersons WHERE user_id = ? AND observations LIKE '%FILL::%'", [userId]);
    await conn.query("DELETE FROM categories WHERE user_id = ? AND description LIKE '%FILL::%'", [userId]);

    await conn.query("DELETE bdi FROM biz_document_items bdi JOIN biz_documents bd ON bd.id = bdi.document_id WHERE bd.user_id = ? AND bd.notes LIKE '%FILL::%'", [userId]);
    await conn.query("DELETE FROM biz_documents WHERE user_id = ? AND notes LIKE '%FILL::%'", [userId]);

    await conn.query("DELETE pli FROM price_list_items pli JOIN price_lists pl ON pl.id = pli.price_list_id WHERE pl.user_id = ? AND pl.name LIKE '%FILL::%'", [userId]);
    await conn.query("DELETE FROM price_lists WHERE user_id = ? AND name LIKE '%FILL::%'", [userId]);

    await conn.query("DELETE br FROM bank_reconciliations br JOIN bank_transactions bt ON bt.id = br.bank_transaction_id WHERE bt.user_id = ? AND bt.description LIKE '%FILL::%'", [userId]);
    await conn.query("DELETE FROM bank_transactions WHERE user_id = ? AND description LIKE '%FILL::%'", [userId]);
    await conn.query("DELETE FROM bank_accounts WHERE user_id = ? AND name LIKE '%FILL::%'", [userId]);

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tenantId = args.tenantId?.trim() || (args.email ? await findTenantIdByEmail(args.email) : null);
  if (!tenantId) throw new Error(`Tenant/usuário não encontrado para: ${args.email || args.tenantId}`);

  const now = new Date();
  const start = subMonths(now, args.months);
  const weightedDays = buildWeightedDays(start, now);
  const runId = `FILL::${new Date().toISOString()}`;
  const tag = (text: string) => text;
  const companyName = args.companyName;

  if (args.recreate) {
    const dbName = `megaerp_tenant_${tenantId.replace(/-/g, "_")}`;
    await pool.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await createTenantDatabase(tenantId);
  }

  const tenantPool = await getTenantPool(tenantId);
  if (args.reset && !args.recreate) await resetFill(tenantPool, tenantId);

  const conn = await tenantPool.getConnection();
  try {
    await conn.beginTransaction();

    const categories = [
      { id: randomUUID(), name: "Acessórios", color: "blue" },
      { id: randomUUID(), name: "Capas", color: "slate" },
      { id: randomUUID(), name: "Carregadores", color: "green" },
      { id: randomUUID(), name: "Películas", color: "indigo" },
      { id: randomUUID(), name: "Fones", color: "violet" },
      { id: randomUUID(), name: "Cabos", color: "cyan" },
      { id: randomUUID(), name: "Power Bank", color: "emerald" },
      { id: randomUUID(), name: "Suportes", color: "amber" },
      { id: randomUUID(), name: "Áudio", color: "pink" },
      { id: randomUUID(), name: "Informática", color: "teal" },
      { id: randomUUID(), name: "Assistência", color: "orange" },
      { id: randomUUID(), name: "Variedades", color: "red" },
    ];
    for (const c of categories) {
      const createdAt = toMysqlDateTime(randDateBetween(start, now));
      await conn.query(
        "INSERT INTO categories (id, user_id, name, parent_id, description, color, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
        [c.id, tenantId, c.name, null, tag(`Catálogo ${companyName}: linha ${c.name.toLowerCase()}`), c.color, createdAt, createdAt]
      );
    }

    const brands = ["AuroraTech", "Nexa", "Vértice", "Polar", "VivaSound", "CargaRápida", "Nylomax", "SteelFlex", "Lumina", "Orbit"];
    const models = ["iPhone 11", "iPhone 12", "iPhone 13", "iPhone 14", "iPhone 15", "Galaxy A14", "Galaxy A24", "Galaxy S22", "Moto G54", "Moto G84", "Redmi Note 12", "Redmi Note 13"];
    const productNouns = ["Cabo USB-C", "Cabo Lightning", "Carregador", "Fonte USB", "Película Vidro", "Película Hidrogel", "Fone Bluetooth", "Suporte Veicular", "Power Bank", "Capinha", "Adaptador", "Mouse", "Teclado", "Ring Light", "Tripé", "Carregador Veicular", "Hub USB", "Cartão de Memória", "Cabo P2", "Caixa de Som"];
    const productVariants = ["Premium", "Reforçado", "Turbo", "Ultra", "Pro", "Slim", "Magnético", "Antishock", "Transparente", "Full Cover", "Privacidade", "Original"];

    function genProductName(i: number) {
      const noun = randChoice(productNouns);
      const v1 = Math.random() < 0.75 ? randChoice(productVariants) : null;
      const v2 = Math.random() < 0.25 ? randChoice(productVariants) : null;
      const model = /Capinha|Película/.test(noun) ? randChoice(models) : Math.random() < 0.15 ? randChoice(models) : null;
      const extra =
        noun === "Power Bank"
          ? `${randChoice(["10.000mAh", "20.000mAh"])}`
          : noun === "Carregador"
            ? `${randChoice(["20W", "33W", "65W"])}`
            : noun === "Fonte USB"
              ? `${randChoice(["5V 2A", "5V 3A"])}`
              : noun === "Cartão de Memória"
                ? `${randChoice(["32GB", "64GB", "128GB"])}`
                : null;
      return [noun, extra, v1, v2, model].filter(Boolean).join(" ") || `Produto ${i + 1}`;
    }

    const productCount = args.profile === "rich" ? 240 : 140;
    const products: Array<{ id: string; name: string; sku: string; price: number; cost: number; stock: number; stockMin: number; categoryId: string }> = [];
    for (let i = 0; i < productCount; i++) {
      const id = randomUUID();
      const name = genProductName(i);
      const sku = `LT-${String(i + 1).padStart(5, "0")}`;
      const price = randFloat(9.9, 249.9, 2);
      const cost = Math.max(0, Math.round(price * randFloat(0.45, 0.78, 2) * 100) / 100);
      const forceCritical = i < Math.max(14, Math.floor(productCount * 0.08));
      const stockMin = forceCritical ? randFloat(8, 20, 3) : i % 5 === 0 ? randFloat(5, 12, 3) : randFloat(0, 5, 3);
      const stock = forceCritical ? randFloat(0, Math.max(0, stockMin - 0.5), 3) : randFloat(0, 70, 3);
      const categoryId = randChoice(categories).id;
      products.push({ id, name, sku, price, cost, stock, stockMin, categoryId });
    }

    const lotControlledCount = Math.max(8, Math.floor(products.length * 0.03));
    const lotControlled = new Set<string>(products.slice(0, lotControlledCount).map((p) => p.id));

    for (const p of products) {
      const createdAt = toMysqlDateTime(randDateBetween(start, now));
      const updatedAt = toMysqlDateTime(randDateBetween(new Date(createdAt), now));
      const brand = randChoice(brands);
      const loc = `Est-${randInt(1, 6)}-${randInt(1, 20)}`;
      const descShort =
        /Cabo/.test(p.name)
          ? "Cabo com boa flexibilidade e conector firme. Ideal para uso diário e para manter no carro."
          : /Carregador|Fonte/.test(p.name)
            ? "Carregador com proteção contra sobrecarga e aquecimento. Indicado para recarga rápida em tomadas padrão BR."
            : /Película/.test(p.name)
              ? "Película de aplicação simples com boa transparência e proteção contra riscos no dia a dia."
              : /Fone|Áudio|Caixa de Som/.test(p.name)
                ? "Som equilibrado e boa autonomia para uso em chamadas e música."
                : /Power Bank/.test(p.name)
                  ? "Bateria portátil para emergências e viagens, com boa eficiência e indicador de carga."
                  : "Item de venda rápida, recomendado manter reposição regular no estoque.";

      await conn.query(
        `INSERT INTO products (
          id, user_id, name, sku, price, cost_price, unit, format, type, category_id,
          brand, description_short, observations, stock, stock_min, stock_max, location,
          has_lot_control, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, 'UN', 'simple', 'product', ?,
          ?, ?, ?, ?, ?, 0, ?,
          ?, ?, ?
        )`,
        [
          p.id,
          tenantId,
          p.name,
          p.sku,
          p.price,
          p.cost,
          p.categoryId,
          brand,
          `${p.name}. ${descShort}`,
          tag(`Cadastro de produto. Localização ${loc}. Reposição sugerida quando abaixo do mínimo.`),
          p.stock,
          p.stockMin,
          loc,
          lotControlled.has(p.id) ? 1 : 0,
          createdAt,
          updatedAt,
        ]
      );

      if (lotControlled.has(p.id)) {
        const lotsCount = randInt(2, 4);
        let allocated = 0;
        for (let k = 0; k < lotsCount; k++) {
          const lotId = randomUUID();
          const remaining = Math.max(0, Math.round((p.stock - allocated) * 1000) / 1000);
          const lotQty = k === lotsCount - 1 ? remaining : remaining === 0 ? 0 : randFloat(0, remaining, 3);
          allocated += lotQty;
          const mfg = randDateBetween(subMonths(now, 6), now);
          const exp = randDateBetween(addDays(now, 30), addDays(now, 540));
          const code = `L${String(randInt(100000, 999999))}`;
          await conn.query(
            "INSERT INTO product_lots (id, product_id, code, manufacturing_date, expiration_date, observations, stock, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)",
            [lotId, p.id, code, toMysqlDate(mfg), toMysqlDate(exp), tag(`Lote ${code} (entrada inicial)`), lotQty, createdAt, updatedAt]
          );
          await conn.query(
            "INSERT INTO stock_movements (id, product_id, user_id, type, quantity, reason, lot_id, created_at) VALUES (?,?,?,'in',?,?,?,?)",
            [randomUUID(), p.id, tenantId, lotQty, tag(`Entrada inicial de estoque (lote ${code})`), lotId, createdAt]
          );
        }
      } else {
        await conn.query(
          "INSERT INTO stock_movements (id, product_id, user_id, type, quantity, reason, lot_id, created_at) VALUES (?,?,?,'in',?, ?, NULL, ?)",
          [randomUUID(), p.id, tenantId, p.stock, tag("Entrada inicial de estoque"), createdAt]
        );
      }
    }

    const serviceCatalog = [
      "Troca de tela",
      "Troca de bateria",
      "Limpeza/Manutenção",
      "Atualização de software",
      "Conector de carga",
      "Troca de alto-falante",
      "Troca de microfone",
      "Reparo de placa",
      "Diagnóstico",
      "Formatação",
      "Instalação de aplicativos",
      "Configuração de e-mail",
      "Backup e restauração",
      "Troca de câmera",
      "Troca de tampa traseira",
      "Desoxidação",
    ];
    const serviceCount = args.profile === "rich" ? 45 : 24;
    const services: Array<{ id: string; name: string; sku: string; price: number; categoryId: string }> = [];
    for (let i = 0; i < serviceCount; i++) {
      const base = serviceCatalog[i % serviceCatalog.length]!;
      const model = Math.random() < 0.4 ? randChoice(models) : null;
      const name = model ? `${base} - ${model}` : base;
      const sku = `SERV-${String(i + 1).padStart(4, "0")}`;
      const price = randFloat(29.9, 399.9, 2);
      const categoryId = categories.find((c) => c.name === "Assistência")?.id ?? categories[categories.length - 3]!.id;
      services.push({ id: randomUUID(), name, sku, price, categoryId });
    }
    for (const s of services) {
      const createdAt = toMysqlDateTime(randDateBetween(start, now));
      const updatedAt = toMysqlDateTime(randDateBetween(new Date(createdAt), now));
      await conn.query(
        `INSERT INTO products (
          id, user_id, name, sku, price, cost_price, unit, format, type, category_id,
          description_short, observations, stock, stock_min, stock_max, location,
          has_lot_control, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, 0, 'SERV', 'simple', 'service', ?,
          ?, ?, 0, 0, 0, NULL,
          0, ?, ?
        )`,
        [s.id, tenantId, s.name, s.sku, s.price, s.categoryId, `${s.name}. Serviço com orçamento e garantia conforme avaliação técnica.`, tag("Cadastro de serviço"), createdAt, updatedAt]
      );
    }

    const priceLists = [
      { id: randomUUID(), name: tag(`Tabela Atacado (${companyName})`), type: "percentage" as const, adjustmentType: "decrease" as const, adjustmentValue: 10 },
      { id: randomUUID(), name: tag(`Promoção Fim de Mês (${companyName})`), type: "percentage" as const, adjustmentType: "decrease" as const, adjustmentValue: 15 },
      { id: randomUUID(), name: tag(`Preço Especial Parceiros (${companyName})`), type: "custom" as const, adjustmentType: null as any, adjustmentValue: null as any },
    ];
    for (let i = 0; i < priceLists.length; i++) {
      const pl = priceLists[i]!;
      const createdAt = toMysqlDateTime(randDateBetween(start, now));
      const startDate = i === 1 ? toMysqlDateTime(subMonths(now, 2)) : null;
      const endDate = i === 1 ? toMysqlDateTime(subMonths(now, 1)) : null;
      await conn.query(
        "INSERT INTO price_lists (id, user_id, name, type, adjustment_type, adjustment_value, start_date, end_date, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?, 'active', ?, ?)",
        [pl.id, tenantId, pl.name, pl.type, pl.adjustmentType, pl.adjustmentValue, startDate, endDate, createdAt, createdAt]
      );
    }
    const customList = priceLists.find((p) => p.type === "custom")!;
    const customCount = Math.min(100, Math.max(30, Math.floor(products.length * 0.14)));
    for (let i = 0; i < customCount; i++) {
      const p = randChoice(products);
      const createdAt = toMysqlDateTime(randDateBetween(start, now));
      const price = Math.max(1, Math.round(p.price * randFloat(0.82, 0.95, 2) * 100) / 100);
      await conn.query("INSERT INTO price_list_items (id, price_list_id, product_id, price, created_at, updated_at) VALUES (?,?,?,?,?,?)", [
        randomUUID(),
        customList.id,
        p.id,
        price,
        createdAt,
        createdAt,
      ]);
    }

    const clients: Array<{ id: string; name: string }> = [];
    const suppliers: Array<{ id: string; name: string }> = [];

    const clientCount = args.profile === "rich" ? 260 : 160;
    for (let i = 0; i < clientCount; i++) {
      const id = randomUUID();
      const createdAt = toMysqlDateTime(randDateBetween(start, now));
      const updatedAt = toMysqlDateTime(randDateBetween(new Date(createdAt), now));
      const asCompany = Math.random() < 0.22;
      const addr = genAddress();
      const billingAddr = Math.random() < 0.25 ? genAddress() : addr;
      const phone = genPhone();
      const mobile = genPhone();

      if (!asCompany) {
        const name = genPersonName();
        const cpf = genCpfInvalid();
        const email = `${slugEmail(name)}.${randInt(10, 99)}@example.invalid`;
        clients.push({ id, name });
        await conn.query(
          `INSERT INTO contacts (
            id, user_id, name, fantasy_name, code, type, cpf_cnpj, rg_ie, contributor_type, date_since,
            address_zip, address_street, address_number, address_complement, address_neighborhood, address_city, address_state,
            address_billing_zip, address_billing_street, address_billing_number, address_billing_complement, address_billing_neighborhood, address_billing_city, address_billing_state,
            phone, mobile, email, website, contact_type, status, observations, created_at, updated_at
          ) VALUES (
            ?, ?, ?, NULL, ?, 'fisica', ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, 'cliente', ?, ?, ?, ?
          )`,
          [
            id,
            tenantId,
            name,
            `CLI-${String(i + 1).padStart(5, "0")}`,
            cpf,
            String(randInt(1000000, 9999999)),
            randInt(1, 9),
            toMysqlDate(randDateBetween(subMonths(now, 36), now)),
            addr.zip,
            addr.street,
            addr.number,
            addr.complement,
            addr.neighborhood,
            addr.city,
            addr.state,
            billingAddr.zip,
            billingAddr.street,
            billingAddr.number,
            billingAddr.complement,
            billingAddr.neighborhood,
            billingAddr.city,
            billingAddr.state,
            phone,
            mobile,
            email,
            Math.random() < 0.25 ? `https://www.${slugEmail(name)}.example` : null,
            randChoice(["ativo", "ativo", "ativo", "inativo", "sem_movimento"]),
            tag("Cliente pessoa física. Preferência: retirada na loja; contato via WhatsApp; histórico com picos no fim de semana."),
            createdAt,
            updatedAt,
          ]
        );
      } else {
        const company = genCompanyName();
        const fantasy = company.replace(/\s+(LTDA|ME|EIRELI|S\/A)$/i, "");
        const cnpj = genCnpjInvalid();
        const email = `${slugEmail(fantasy)}.${randInt(10, 99)}@example.invalid`;
        clients.push({ id, name: fantasy });
        await conn.query(
          `INSERT INTO contacts (
            id, user_id, name, fantasy_name, code, type, cpf_cnpj, rg_ie, contributor_type, date_since,
            address_zip, address_street, address_number, address_complement, address_neighborhood, address_city, address_state,
            address_billing_zip, address_billing_street, address_billing_number, address_billing_complement, address_billing_neighborhood, address_billing_city, address_billing_state,
            phone, mobile, email, website, contact_type, status, observations, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, 'juridica', ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, 'cliente', ?, ?, ?, ?
          )`,
          [
            id,
            tenantId,
            company,
            fantasy,
            `CLPJ-${String(i + 1).padStart(4, "0")}`,
            cnpj,
            String(randInt(100000000, 999999999)),
            randInt(1, 9),
            toMysqlDate(randDateBetween(subMonths(now, 48), now)),
            addr.zip,
            addr.street,
            addr.number,
            addr.complement,
            addr.neighborhood,
            addr.city,
            addr.state,
            billingAddr.zip,
            billingAddr.street,
            billingAddr.number,
            billingAddr.complement,
            billingAddr.neighborhood,
            billingAddr.city,
            billingAddr.state,
            phone,
            mobile,
            email,
            Math.random() < 0.4 ? `https://www.${slugEmail(fantasy)}.example` : null,
            randChoice(["ativo", "ativo", "ativo", "inativo", "sem_movimento"]),
            tag("Cliente PJ. Compra por reposição; variação de volume por semana; solicita condição diferenciada em campanhas."),
            createdAt,
            updatedAt,
          ]
        );
      }
    }

    const supplierCount = args.profile === "rich" ? 80 : 50;
    for (let i = 0; i < supplierCount; i++) {
      const id = randomUUID();
      const createdAt = toMysqlDateTime(randDateBetween(start, now));
      const updatedAt = toMysqlDateTime(randDateBetween(new Date(createdAt), now));
      const company = genCompanyName();
      const fantasy = company.replace(/\s+(LTDA|ME|EIRELI|S\/A)$/i, "");
      const addr = genAddress();
      const cnpj = genCnpjInvalid();
      const billingAddr = Math.random() < 0.25 ? genAddress() : addr;
      const email = `${slugEmail(fantasy)}.${randInt(10, 99)}@example.invalid`;
      const phone = genPhone();
      const mobile = genPhone();
      suppliers.push({ id, name: fantasy });
      await conn.query(
        `INSERT INTO contacts (
          id, user_id, name, fantasy_name, code, type, cpf_cnpj, rg_ie, contributor_type, date_since,
          address_zip, address_street, address_number, address_complement, address_neighborhood, address_city, address_state,
          address_billing_zip, address_billing_street, address_billing_number, address_billing_complement, address_billing_neighborhood, address_billing_city, address_billing_state,
          phone, mobile, email, website, contact_type, status, observations, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, 'juridica', ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, 'fornecedor', 'ativo', ?, ?, ?
        )`,
        [
          id,
          tenantId,
          company,
          fantasy,
          `FOR-${String(i + 1).padStart(4, "0")}`,
          cnpj,
          String(randInt(100000000, 999999999)),
          randInt(1, 9),
          toMysqlDate(randDateBetween(subMonths(now, 48), now)),
          addr.zip,
          addr.street,
          addr.number,
          addr.complement,
          addr.neighborhood,
          addr.city,
          addr.state,
          billingAddr.zip,
          billingAddr.street,
          billingAddr.number,
          billingAddr.complement,
          billingAddr.neighborhood,
          billingAddr.city,
          billingAddr.state,
          phone,
          mobile,
          email,
          Math.random() < 0.35 ? `https://www.${slugEmail(fantasy)}.example` : null,
          tag("Fornecedor recorrente. Entrega entre 2 e 7 dias úteis; variação de custo por lote e por prazo de pagamento."),
          createdAt,
          updatedAt,
        ]
      );
    }

    const salespersons = [
      { id: randomUUID(), name: genPersonName(), email: "vendas.01@example.invalid" },
      { id: randomUUID(), name: genPersonName(), email: "vendas.02@example.invalid" },
      { id: randomUUID(), name: genPersonName(), email: "vendas.03@example.invalid" },
    ];
    for (const sp of salespersons) {
      const createdAt = toMysqlDateTime(randDateBetween(start, now));
      const updatedAt = toMysqlDateTime(randDateBetween(new Date(createdAt), now));
      await conn.query(
        "INSERT INTO salespersons (id, user_id, name, email, phone, cpf, commission_rate, status, observations, created_at, updated_at) VALUES (?,?,?,?,?,NULL,?,'active',?,?,?)",
        [sp.id, tenantId, sp.name, sp.email, genPhone(), randFloat(1, 5, 2), tag("Vendedor ativo. Carteira com clientes recorrentes e campanhas de semana/mês."), createdAt, updatedAt]
      );
    }

    const docTypes = ["proposal", "contract", "purchase_order", "incoming_invoice", "production_order", "nfce"] as const;
    const docCount = args.profile === "rich" ? 90 : 50;
    for (let i = 0; i < docCount; i++) {
      const type = randChoice([...docTypes]);
      const wd = pickWeightedDay(weightedDays);
      const date = wd.day;
      const createdAt = toMysqlDateTime(randTimeOnDay(date, 8, 20));
      const updatedAt = createdAt;
      const party = type === "purchase_order" || type === "incoming_invoice" ? randChoice(suppliers) : randChoice(clients);

      const numberPrefix =
        type === "proposal"
          ? "PROP"
          : type === "contract"
            ? "CT"
            : type === "purchase_order"
              ? "PO"
              : type === "incoming_invoice"
                ? "NFE-ENT"
                : type === "production_order"
                  ? "OP"
                  : "NFCE";
      const number = `${numberPrefix}-${String(i + 1).padStart(5, "0")}`;

      const status =
        type === "proposal"
          ? randChoice(["rascunho", "enviada", "aprovada", "cancelada"] as const)
          : type === "contract"
            ? randChoice(["ativo", "encerrado", "cancelado"] as const)
            : type === "purchase_order"
              ? randChoice(["emitida", "enviada", "confirmada", "cancelada"] as const)
              : type === "incoming_invoice"
                ? randChoice(["recebida", "em_conferencia", "cancelada"] as const)
                : type === "production_order"
                  ? randChoice(["aberta", "em_producao", "concluida", "cancelada"] as const)
                  : randChoice(["autorizada", "cancelada"] as const);

      const itemsCount = wd.mood === "good" ? randInt(2, 7) : randInt(1, 5);
      let subtotal = 0;
      let discount = 0;
      const items: Array<{ id: string; productId: string; desc: string; qty: number; unit: number; disc: number; total: number }> = [];
      for (let j = 0; j < itemsCount; j++) {
        const p = randChoice(products);
        const qty = randFloat(1, wd.mood === "good" ? 6 : 3, 3);
        const unit = p.price;
        const disc = Math.random() < (wd.mood === "bad" ? 0.25 : 0.12) ? randFloat(0.5, 8, 2) : 0;
        const lineTotal = Math.max(0, Math.round((qty * unit - disc) * 100) / 100);
        subtotal += Math.round(qty * unit * 100) / 100;
        discount += disc;
        items.push({ id: randomUUID(), productId: p.id, desc: p.name, qty, unit, disc, total: lineTotal });
      }
      const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

      const docId = randomUUID();
      await conn.query(
        `INSERT INTO biz_documents (
          id, user_id, type, number, party_id, party_name, date, status, notes,
          totals_count, totals_subtotal, totals_discount, totals_total, payload_json, created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          docId,
          tenantId,
          type,
          number,
          party.id,
          party.name,
          toMysqlDate(date),
          status,
          tag(`${numberPrefix} ${number}. ${type === "incoming_invoice" ? "Entrada de mercadorias para reposição." : "Documento gerencial para acompanhamento de operações."}`),
          itemsCount,
          subtotal,
          discount,
          total,
          JSON.stringify({ source: "fill-tenant", runId, mood: wd.mood, companyName }),
          createdAt,
          updatedAt,
        ]
      );

      for (const it of items) {
        await conn.query(
          "INSERT INTO biz_document_items (id, document_id, product_id, description, quantity, unit_price, discount, total) VALUES (?,?,?,?,?,?,?,?)",
          [it.id, docId, it.productId, it.desc, it.qty, it.unit, it.disc, it.total]
        );
      }
    }

    const cashSessionsCount = args.profile === "rich" ? 90 : 60;
    const cashSessions: Array<{ id: string; openedAt: Date; status: "open" | "closed" }> = [];
    for (let i = 0; i < cashSessionsCount; i++) {
      const id = randomUUID();
      const openedAt = randTimeOnDay(pickWeightedDay(weightedDays).day, 8, 20);
      const closed = i < Math.max(0, cashSessionsCount - 1);
      const closedAt = closed ? new Date(openedAt.getTime() + 1000 * 60 * 60 * randInt(6, 10)) : null;
      const status = closed ? "closed" : "open";
      cashSessions.push({ id, openedAt, status });
      const openingBalance = randFloat(0, 300, 2);
      const closingBalance = closed ? openingBalance + randFloat(0, 1200, 2) - randFloat(0, 200, 2) : null;
      await conn.query(
        "INSERT INTO cash_sessions (id, user_id, user_name, status, opening_balance, closing_balance, opened_at, closed_at, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [
          id,
          tenantId,
          "Caixa 01",
          status,
          openingBalance,
          closingBalance,
          toMysqlDateTime(openedAt),
          closedAt ? toMysqlDateTime(closedAt) : null,
          tag(`Sessão de caixa (${status === "open" ? "em andamento" : "fechada"})`),
          toMysqlDateTime(openedAt),
          toMysqlDateTime(closedAt ?? openedAt),
        ]
      );
    }

    const paymentMethods = ["money", "pix", "credit", "debit"];

    const [[soMaxRow]] = await conn.query<any[]>(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(number, 4) AS UNSIGNED)), 0) as n FROM sales_orders WHERE user_id = ? AND number LIKE 'SO-%'",
      [tenantId]
    );
    let salesOrderSeq = Number(soMaxRow?.n ?? 0) + 1;

    const salesOrdersCount = args.profile === "rich" ? 420 : 200;
    for (let i = 0; i < salesOrdersCount; i++) {
      const id = randomUUID();
      const customer = randChoice(clients);
      const wd = pickWeightedDay(weightedDays);
      const date = wd.day;
      const status = randChoice(["open", "billed", "delivered", "canceled"] as const);
      const itemsCount = wd.mood === "good" ? randInt(2, 6) : randInt(1, 4);
      let subtotal = 0;
      let discount = 0;
      const items: Array<{ id: string; productId: string; desc: string; qty: number; unit: number; disc: number; total: number }> = [];
      for (let j = 0; j < itemsCount; j++) {
        const p = randChoice(products);
        const qty = randFloat(1, wd.mood === "good" ? 5 : 3, 3);
        const unit = p.price;
        const disc = Math.random() < (wd.mood === "bad" ? 0.35 : 0.18) ? randFloat(0.5, 7.5, 2) : 0;
        const lineTotal = Math.max(0, Math.round((qty * unit - disc) * 100) / 100);
        subtotal += Math.round(qty * unit * 100) / 100;
        discount += disc;
        items.push({ id: randomUUID(), productId: p.id, desc: p.name, qty, unit, disc, total: lineTotal });
      }
      const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
      const number = `SO-${String(salesOrderSeq++).padStart(5, "0")}`;
      const createdAt = toMysqlDateTime(randTimeOnDay(date, 9, 20));

      await conn.query(
        "INSERT INTO sales_orders (id, user_id, number, customer_id, customer_name, date, status, observations, totals_count, totals_subtotal, totals_discount, totals_total, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          id,
          tenantId,
          number,
          customer.id,
          customer.name,
          toMysqlDate(date),
          status,
          tag(`Pedido ${number}. ${status === "canceled" ? "Cancelado pelo cliente após orçamento." : "Retirada na loja / entrega local conforme combinado."}`),
          itemsCount,
          subtotal,
          discount,
          total,
          createdAt,
          createdAt,
        ]
      );
      for (const it of items) {
        await conn.query("INSERT INTO sales_order_items (id, order_id, product_id, description, quantity, unit_price, discount, total) VALUES (?,?,?,?,?,?,?,?)", [
          it.id,
          id,
          it.productId,
          it.desc,
          it.qty,
          it.unit,
          it.disc,
          it.total,
        ]);
      }

      if (status !== "canceled") {
        const due = new Date(date.getTime() + 1000 * 60 * 60 * 24 * randInt(3, 14));
        const titleId = randomUUID();
        const amount = total;
        const willPay = status === "delivered" || Math.random() < 0.6;
        const paidAmount = willPay ? amount : Math.random() < 0.3 ? Math.round(amount * 0.5 * 100) / 100 : 0;
        const finStatus = paidAmount >= amount ? "paid" : paidAmount > 0 ? "partial" : "open";
        await conn.query(
          "INSERT INTO financial_titles (id, user_id, kind, status, origin, ref_id, party_id, party_name, description, amount, paid_amount, due_date, created_at, updated_at) VALUES (?,?, 'ar', ?, 'sales', ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            titleId,
            tenantId,
            finStatus,
            id,
            customer.id,
            customer.name,
            tag(`Recebimento do pedido ${number}`),
            amount,
            paidAmount,
            toMysqlDate(due),
            createdAt,
            createdAt,
          ]
        );
        if (paidAmount > 0) {
          const paidAt = randDateBetween(date, new Date(Math.min(now.getTime(), due.getTime() + 1000 * 60 * 60 * 24 * 5)));
          await conn.query("INSERT INTO financial_payments (id, title_id, user_id, amount, method, paid_at, notes, created_at) VALUES (?,?,?,?,?,?,?,?)", [
            randomUUID(),
            titleId,
            tenantId,
            paidAmount,
            randChoice(paymentMethods),
            toMysqlDateTime(paidAt),
            tag(`Baixa do pedido ${number}`),
            toMysqlDateTime(paidAt),
          ]);
        }
      }
    }

    const pdvSalesCount = args.profile === "rich" ? 1100 : 450;
    for (let i = 0; i < pdvSalesCount; i++) {
      const session = randChoice(cashSessions);
      const wd = pickWeightedDay(weightedDays);
      const createdAt = randTimeOnDay(wd.day, 9, 21);
      const id = randomUUID();
      const itemsCount = wd.mood === "good" ? randInt(2, 7) : randInt(1, 5);
      let subtotal = 0;
      let discount = 0;
      const items: Array<{ id: string; productId: string; name: string; sku: string | null; qty: number; unit: number; discPerUnit: number; total: number }> = [];
      for (let j = 0; j < itemsCount; j++) {
        const p = randChoice(products);
        const qty = randFloat(1, wd.mood === "good" ? 4 : 2.5, 3);
        const unit = p.price;
        const discPerUnit = Math.random() < (wd.mood === "bad" ? 0.22 : 0.12) ? randFloat(0.2, 3, 2) : 0;
        const lineTotal = Math.max(0, Math.round((qty * (unit - discPerUnit)) * 100) / 100);
        subtotal += Math.round(qty * unit * 100) / 100;
        discount += Math.round(qty * discPerUnit * 100) / 100;
        items.push({ id: randomUUID(), productId: p.id, name: p.name, sku: p.sku, qty, unit, discPerUnit, total: lineTotal });
      }
      const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
      const pm = randChoice([...paymentMethods, "boleto", "crediario"]);
      const customer = Math.random() < 0.78 ? randChoice(clients) : null;
      const customerId = customer ? customer.id : null;
      const customerName = customer ? customer.name : "Consumidor Final";

      await conn.query(
        "INSERT INTO pdv_sales (id, user_id, cash_session_id, customer_id, customer_name, payment_method, subtotal, discount, total, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,'completed',?)",
        [id, tenantId, session.id, customerId, tag(`${customerName} (PDV)`), pm, subtotal, discount, total, toMysqlDateTime(createdAt)]
      );
      for (const it of items) {
        await conn.query(
          "INSERT INTO pdv_sale_items (id, sale_id, product_id, name, sku, quantity, unit_price, discount_per_unit, line_total) VALUES (?,?,?,?,?,?,?,?,?)",
          [it.id, id, it.productId, it.name, it.sku, it.qty, it.unit, it.discPerUnit, it.total]
        );
      }

      await conn.query(
        "INSERT INTO cash_transactions (id, session_id, user_id, type, category, amount, description, payment_method, ref_id, meta_json, created_at) VALUES (?,?,?,'in','sale',?,?,?,?,?,?)",
        [randomUUID(), session.id, tenantId, total, tag(`Venda PDV ${id.slice(0, 8)} (${pm})`), pm, id, JSON.stringify({ refId: id, runId }), toMysqlDateTime(createdAt)]
      );

      const titleId = randomUUID();
      const due = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
      await conn.query(
        "INSERT INTO financial_titles (id, user_id, kind, status, origin, ref_id, party_id, party_name, description, amount, paid_amount, due_date, created_at, updated_at) VALUES (?,?, 'ar','paid','pdv',?,?,?,?,?,?,?,?,?)",
        [titleId, tenantId, id, customerId, customerName, tag(`Recebimento PDV ${id.slice(0, 8)}`), total, total, toMysqlDate(due), toMysqlDateTime(createdAt), toMysqlDateTime(createdAt)]
      );
      await conn.query(
        "INSERT INTO financial_payments (id, title_id, user_id, amount, method, paid_at, notes, created_at) VALUES (?,?,?,?,?,?,?,?)",
        [randomUUID(), titleId, tenantId, total, pm, toMysqlDateTime(createdAt), tag(`Baixa automática PDV ${id.slice(0, 8)}`), toMysqlDateTime(createdAt)]
      );
    }

    const apCount = args.profile === "rich" ? 260 : 120;
    for (let i = 0; i < apCount; i++) {
      const supplier = randChoice(suppliers);
      const wd = pickWeightedDay(weightedDays);
      const d = randTimeOnDay(wd.day, 9, 18);
      const due = new Date(d.getTime() + 1000 * 60 * 60 * 24 * randInt(-10, 20));
      const amount = randFloat(80, 1200, 2);
      const titleId = randomUUID();
      const willPay = Math.random() < 0.5;
      const paidAmount = willPay ? amount : Math.random() < 0.25 ? Math.round(amount * 0.4 * 100) / 100 : 0;
      const status = paidAmount >= amount ? "paid" : paidAmount > 0 ? "partial" : "open";
      const createdAt = toMysqlDateTime(d);
      const invoiceNo = `NF-${randInt(10000, 99999)}`;
      await conn.query(
        "INSERT INTO financial_titles (id, user_id, kind, status, origin, ref_id, party_id, party_name, description, amount, paid_amount, due_date, created_at, updated_at) VALUES (?,?, 'ap', ?, 'manual', NULL, ?, ?, ?, ?, ?, ?, ?, ?)",
        [titleId, tenantId, status, supplier.id, supplier.name, tag(`Conta a pagar: ${supplier.name} (${invoiceNo}) — reposição de estoque e insumos`), amount, paidAmount, toMysqlDate(due), createdAt, createdAt]
      );
      if (paidAmount > 0) {
        const paidAt = randDateBetween(d, now);
        await conn.query(
          "INSERT INTO financial_payments (id, title_id, user_id, amount, method, paid_at, notes, created_at) VALUES (?,?,?,?,?,?,?,?)",
          [randomUUID(), titleId, tenantId, paidAmount, randChoice(paymentMethods), toMysqlDateTime(paidAt), tag(`Pagamento ${status === "partial" ? "parcial" : "total"}: ${supplier.name} (${invoiceNo})`), toMysqlDateTime(paidAt)]
        );
      }
    }

    const [[osMaxRow]] = await conn.query<any[]>(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(number, 4) AS UNSIGNED)), 0) as n FROM service_orders WHERE user_id = ? AND number LIKE 'OS-%'",
      [tenantId]
    );
    let serviceOrderSeq = Number(osMaxRow?.n ?? 0) + 1;
    const serviceSymptoms = [
      "Aparelho não carrega e apresenta oscilação no conector.",
      "Tela trincada após queda; touch falhando em algumas áreas.",
      "Bateria descarrega rápido; aquecimento em uso leve.",
      "Sem áudio em chamadas; possível dano no alto-falante.",
      "Sem sinal de rede; avaliação de antena e conectores.",
      "Entrada de líquido; necessário procedimento de desoxidação.",
      "Lentidão e travamentos; sugerida formatação e revisão de apps.",
    ];
    const serviceOrdersCount = args.profile === "rich" ? 160 : 80;
    for (let i = 0; i < serviceOrdersCount; i++) {
      const id = randomUUID();
      const customer = Math.random() < 0.85 ? randChoice(clients) : null;
      const wd = pickWeightedDay(weightedDays);
      const date = wd.day;
      const status = wd.mood === "bad" ? randChoice(["open", "in_progress", "canceled", "canceled"] as const) : randChoice(["open", "in_progress", "completed", "completed", "canceled"] as const);
      const total = randInt(1, 4) * 50 + randFloat(0, 99, 2);
      const createdAt = toMysqlDateTime(randTimeOnDay(date, 9, 19));
      const number = `OS-${String(serviceOrderSeq++).padStart(5, "0")}`;
      await conn.query(
        "INSERT INTO service_orders (id, user_id, number, customer_id, customer_name, date, status, description, total_cents, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [id, tenantId, number, customer?.id ?? null, customer?.name ?? "Consumidor Final", toMysqlDate(date), status, tag(`Ordem de serviço ${number}. Sintoma: ${randChoice(serviceSymptoms)}`), Math.round(total * 100), createdAt, createdAt]
      );

      const itemsCount = randInt(1, 4);
      for (let j = 0; j < itemsCount; j++) {
        const kind = randChoice(["labor", "part", "service", "fee"] as const);
        const p = kind === "part" ? randChoice(products) : null;
        const qty = randFloat(1, 2, 3);
        const unit = randFloat(20, 180, 2);
        const disc = Math.random() < 0.2 ? randFloat(1, 10, 2) : 0;
        const lineTotal = Math.max(0, Math.round((qty * unit - disc) * 100) / 100);
        const desc =
          p?.name ??
          (kind === "labor"
            ? "Mão de obra técnica (diagnóstico, desmontagem e testes)"
            : kind === "service"
              ? "Serviço complementar (backup/atualização)"
              : "Taxa operacional (insumos/urgência)");
        await conn.query(
          "INSERT INTO service_order_items (id, order_id, kind, product_id, description, quantity, unit_price, discount, total) VALUES (?,?,?,?,?,?,?,?,?)",
          [randomUUID(), id, kind, p?.id ?? null, desc, qty, unit, disc, lineTotal]
        );
      }
    }

    const bankAccountId = randomUUID();
    const bankCreatedAt = toMysqlDateTime(randDateBetween(start, now));
    await conn.query(
      "INSERT INTO bank_accounts (id, user_id, name, bank, agency, account_number, initial_balance, balance, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [bankAccountId, tenantId, tag("Conta Principal"), "Banco Teste", "0001", "12345-6", 0, 0, bankCreatedAt, bankCreatedAt]
    );

    const bankTxCount = args.profile === "rich" ? 520 : 200;
    const bankTxIds: string[] = [];
    const paymentIds: string[] = [];
    const [payRows] = await conn.query<any[]>("SELECT id FROM financial_payments WHERE user_id = ? ORDER BY paid_at DESC LIMIT 200", [tenantId]);
    for (const r of payRows) if (r?.id) paymentIds.push(String(r.id));

    for (let i = 0; i < bankTxCount; i++) {
      const wd = pickWeightedDay(weightedDays);
      const occurredAt = randTimeOnDay(wd.day, 8, 20);
      const type = randChoice(["in", "out"] as const);
      const amount = randFloat(20, 900, 2);
      const txId = randomUUID();
      bankTxIds.push(txId);
      await conn.query(
        "INSERT INTO bank_transactions (id, account_id, user_id, type, amount, description, occurred_at, matched_ref_type, matched_ref_id, source, external_id, import_batch_id, raw_json, reconciled_at) VALUES (?,?,?,?,?,?,?,NULL,NULL,'manual',NULL,NULL,NULL,NULL)",
        [txId, bankAccountId, tenantId, type, amount, tag(type === "in" ? "Crédito bancário (recebível/ajuste)" : "Débito bancário (pagamento/tarifa)"), toMysqlDateTime(occurredAt)]
      );
    }

    const reconCount = Math.min(90, Math.min(bankTxIds.length, paymentIds.length));
    for (let i = 0; i < reconCount; i++) {
      const txId = bankTxIds[i]!;
      const payId = paymentIds[i]!;
      const amount = randFloat(20, 400, 2);
      await conn.query(
        "UPDATE bank_transactions SET matched_ref_type = 'financial_payment', matched_ref_id = ?, reconciled_at = ? WHERE user_id = ? AND id = ?",
        [payId, toMysqlDateTime(now), tenantId, txId]
      );
      await conn.query(
        "UPDATE financial_payments SET settlement_account_type = 'bank', bank_account_id = ?, bank_transaction_id = ?, reconciled_at = ? WHERE user_id = ? AND id = ?",
        [bankAccountId, txId, toMysqlDateTime(now), tenantId, payId]
      );
      await conn.query(
        "INSERT INTO bank_reconciliations (id, user_id, bank_transaction_id, matched_ref_type, matched_ref_id, amount, memo) VALUES (?,?,?,?,?,?,?)",
        [randomUUID(), tenantId, txId, "financial_payment", payId, amount, tag("Conciliação automática para simulação de extrato x baixas")]
      );
    }

    await conn.commit();

    const counts: Record<string, number> = {};
    const tables = [
      "categories",
      "products",
      "product_lots",
      "stock_movements",
      "contacts",
      "salespersons",
      "price_lists",
      "price_list_items",
      "biz_documents",
      "biz_document_items",
      "cash_sessions",
      "cash_transactions",
      "sales_orders",
      "sales_order_items",
      "pdv_sales",
      "pdv_sale_items",
      "financial_titles",
      "financial_payments",
      "service_orders",
      "service_order_items",
      "bank_accounts",
      "bank_transactions",
      "bank_reconciliations",
    ];
    for (const t of tables) {
      const countSql =
        t === "product_lots"
          ? "SELECT COUNT(*) as n FROM product_lots"
          : t === "price_list_items"
            ? "SELECT COUNT(*) as n FROM price_list_items pli JOIN price_lists pl ON pl.id = pli.price_list_id WHERE pl.user_id = ?"
            : t === "biz_document_items"
              ? "SELECT COUNT(*) as n FROM biz_document_items bdi JOIN biz_documents bd ON bd.id = bdi.document_id WHERE bd.user_id = ?"
              : t === "sales_order_items"
                ? "SELECT COUNT(*) as n FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.order_id WHERE so.user_id = ?"
                : t === "pdv_sale_items"
                  ? "SELECT COUNT(*) as n FROM pdv_sale_items psi JOIN pdv_sales ps ON ps.id = psi.sale_id WHERE ps.user_id = ?"
                  : t === "service_order_items"
                    ? "SELECT COUNT(*) as n FROM service_order_items soi JOIN service_orders so ON so.id = soi.order_id WHERE so.user_id = ?"
                    : `SELECT COUNT(*) as n FROM ${t} WHERE user_id = ?`;
      const [[row]] = await conn.query<any[]>(countSql, t === "product_lots" ? [] : [tenantId]);
      counts[t] = Number(row?.n ?? 0);
    }

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ok: true, tenantId, email: args.email || null, runId, period: { start: toMysqlDate(start), end: toMysqlDate(now) }, counts }, null, 2));
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
    try {
      await tenantPool.end();
    } catch {}
    try {
      await pool.end();
    } catch {}
  }
}

function randFloat(min: number, max: number, decimals: number) {
  const f = Math.random() * (max - min) + min;
  const p = 10 ** decimals;
  return Math.round(f * p) / p;
}

function randDateBetween(start: Date, end: Date) {
  const t = randInt(start.getTime(), end.getTime());
  return new Date(t);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

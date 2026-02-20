import { randomUUID } from "node:crypto";
import { pool } from "../db.js";
import { getTenantPool } from "../db_tenant.js";

type Args = {
  email: string;
  reset: boolean;
  clients: number;
  suppliers: number;
  products: number;
  services: number;
  salesOrders: number;
  pdvSales: number;
  serviceOrders: number;
  cashSessions: number;
  bankTransactions: number;
};

function parseArgs(argv: string[]): Args {
  const out: Args = {
    email: "",
    reset: false,
    clients: 220,
    suppliers: 80,
    products: 260,
    services: 40,
    salesOrders: 220,
    pdvSales: 350,
    serviceOrders: 120,
    cashSessions: 8,
    bankTransactions: 120,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email") out.email = String(argv[i + 1] ?? "");
    if (a === "--reset") out.reset = true;
    if (a === "--clients") out.clients = Number(argv[i + 1] ?? out.clients);
    if (a === "--suppliers") out.suppliers = Number(argv[i + 1] ?? out.suppliers);
    if (a === "--products") out.products = Number(argv[i + 1] ?? out.products);
    if (a === "--services") out.services = Number(argv[i + 1] ?? out.services);
    if (a === "--sales-orders") out.salesOrders = Number(argv[i + 1] ?? out.salesOrders);
    if (a === "--pdv-sales") out.pdvSales = Number(argv[i + 1] ?? out.pdvSales);
    if (a === "--service-orders") out.serviceOrders = Number(argv[i + 1] ?? out.serviceOrders);
    if (a === "--cash-sessions") out.cashSessions = Number(argv[i + 1] ?? out.cashSessions);
    if (a === "--bank-tx") out.bankTransactions = Number(argv[i + 1] ?? out.bankTransactions);
  }
  if (!out.email) {
    throw new Error(
      "Uso: tsx src/scripts/seed-tenant.ts --email <email> [--reset] [--clients N] [--suppliers N] [--products N] [--services N] [--sales-orders N] [--pdv-sales N] [--service-orders N] [--cash-sessions N] [--bank-tx N]"
    );
  }
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

function calcCpfDigit(base: number[]) {
  const weightStart = base.length + 1;
  let sum = 0;
  for (let i = 0; i < base.length; i++) sum += base[i]! * (weightStart - i);
  const mod = sum % 11;
  const d = 11 - mod;
  return d >= 10 ? 0 : d;
}

function genCpfDigits() {
  const base: number[] = [];
  for (let i = 0; i < 9; i++) base.push(randInt(0, 9));
  const d1 = calcCpfDigit(base);
  const d2 = calcCpfDigit([...base, d1]);
  return [...base, d1, d2].join("");
}

function calcCnpjDigit(base: number[], weights: number[]) {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) sum += base[i]! * weights[i]!;
  const mod = sum % 11;
  const d = 11 - mod;
  return d >= 10 ? 0 : d;
}

function genCnpjDigits() {
  const base: number[] = [];
  for (let i = 0; i < 12; i++) base.push(randInt(0, 9));
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcCnpjDigit(base, w1);
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d2 = calcCnpjDigit([...base, d1], w2);
  return [...base, d1, d2].join("");
}

function genPhone(sp = "11") {
  const ddd = onlyDigits(sp).slice(0, 2) || "11";
  const isMobile = Math.random() < 0.7;
  if (isMobile) return `(${ddd}) 9${randInt(1000, 9999)}-${randInt(1000, 9999)}`;
  return `(${ddd}) ${randInt(2000, 4999)}-${randInt(1000, 9999)}`;
}

function genZip() {
  return `${randInt(10000, 99999)}-${randInt(100, 999)}`;
}

const FIRST_NAMES_M = [
  "João",
  "Pedro",
  "Lucas",
  "Mateus",
  "Guilherme",
  "Rafael",
  "Bruno",
  "Diego",
  "Thiago",
  "Felipe",
  "Eduardo",
  "Leonardo",
  "Gabriel",
  "Caio",
  "Vitor",
  "Henrique",
  "André",
  "Marcos",
  "Roberto",
  "Carlos",
];

const FIRST_NAMES_F = [
  "Maria",
  "Ana",
  "Beatriz",
  "Camila",
  "Juliana",
  "Fernanda",
  "Carolina",
  "Mariana",
  "Aline",
  "Patrícia",
  "Larissa",
  "Letícia",
  "Jéssica",
  "Gabriela",
  "Bruna",
  "Renata",
  "Priscila",
  "Sabrina",
  "Vanessa",
  "Débora",
];

const LAST_NAMES = [
  "Silva",
  "Santos",
  "Oliveira",
  "Souza",
  "Lima",
  "Pereira",
  "Ferreira",
  "Almeida",
  "Costa",
  "Rodrigues",
  "Martins",
  "Araújo",
  "Melo",
  "Barbosa",
  "Ribeiro",
  "Gomes",
  "Carvalho",
  "Cardoso",
  "Teixeira",
  "Cavalcante",
];

const COMPANY_PREFIX = ["Comercial", "Distribuidora", "Atacadão", "Casa", "Center", "Loja", "Importadora", "Auto", "Tech", "Sisfec"];
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
  "Avenida Central",
  "Rua da Independência",
  "Rua do Comércio",
  "Rua Monte Alegre",
  "Rua Antônio Prado",
  "Rua Tiradentes",
  "Rua das Acácias",
  "Avenida dos Ipês",
];

const ADDRESS_NEIGHBORHOODS = [
  "Centro",
  "Jardim América",
  "Vila Nova",
  "Jardim Primavera",
  "Parque das Nações",
  "Jardim das Oliveiras",
  "Vila São José",
  "Jardim São Paulo",
  "Boa Vista",
  "Santa Cecília",
];

const CITIES = [
  { city: "Jussara", state: "SP" },
  { city: "São Paulo", state: "SP" },
  { city: "Campinas", state: "SP" },
  { city: "Ribeirão Preto", state: "SP" },
  { city: "Sorocaba", state: "SP" },
  { city: "Santos", state: "SP" },
  { city: "Bauru", state: "SP" },
  { city: "Rio de Janeiro", state: "RJ" },
  { city: "Niterói", state: "RJ" },
  { city: "Belo Horizonte", state: "MG" },
  { city: "Uberlândia", state: "MG" },
  { city: "Curitiba", state: "PR" },
  { city: "Londrina", state: "PR" },
  { city: "Florianópolis", state: "SC" },
  { city: "Joinville", state: "SC" },
  { city: "Porto Alegre", state: "RS" },
  { city: "Caxias do Sul", state: "RS" },
  { city: "Salvador", state: "BA" },
  { city: "Feira de Santana", state: "BA" },
  { city: "Recife", state: "PE" },
  { city: "Olinda", state: "PE" },
  { city: "Fortaleza", state: "CE" },
  { city: "Natal", state: "RN" },
  { city: "Goiânia", state: "GO" },
];

function slugEmail(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase();
}

function genPersonName() {
  const isF = Math.random() < 0.55;
  const first = randChoice(isF ? FIRST_NAMES_F : FIRST_NAMES_M);
  const last1 = randChoice(LAST_NAMES);
  let last2 = randChoice(LAST_NAMES);
  if (last2 === last1) last2 = randChoice(LAST_NAMES);
  return `${first} ${last1} ${last2}`;
}

function genCompanyName() {
  const p = randChoice(COMPANY_PREFIX);
  const n = randChoice(COMPANY_NOUNS);
  const c = randChoice(["Jussara", "Paulista", "Brasil", "Prime", "Central", "Nova", "Vip", "Mix"]);
  const suf = randChoice(COMPANY_SUFFIX);
  return `${p} ${n} ${c} ${suf}`;
}

function genAddress() {
  const city = randChoice(CITIES);
  const street = randChoice(ADDRESS_STREETS);
  const neighborhood = randChoice(ADDRESS_NEIGHBORHOODS);
  const number = String(randInt(10, 9999));
  const complement = Math.random() < 0.35 ? randChoice(["Apto 12", "Casa", "Sala 3", "Loja 1", "Fundos"]) : null;
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

function genCpfUnique(used: Set<string>) {
  for (let i = 0; i < 50; i++) {
    const cpf = genCpfDigits();
    if (!used.has(cpf)) {
      used.add(cpf);
      return cpf;
    }
  }
  const cpf = genCpfDigits();
  used.add(cpf);
  return cpf;
}

function genCnpjUnique(used: Set<string>) {
  for (let i = 0; i < 50; i++) {
    const cnpj = genCnpjDigits();
    if (!used.has(cnpj)) {
      used.add(cnpj);
      return cnpj;
    }
  }
  const cnpj = genCnpjDigits();
  used.add(cnpj);
  return cnpj;
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

async function findUserIdByEmail(email: string) {
  const [rows] = await pool.query<any[]>("SELECT id, email FROM users WHERE email = ? LIMIT 1", [email]);
  const row = rows?.[0];
  return row?.id ? String(row.id) : null;
}

async function resetSeed(tenantPool: any, userId: string) {
  const conn = await tenantPool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      "DELETE soi FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.order_id WHERE so.user_id = ? AND so.observations LIKE 'SEED::%'",
      [userId]
    );
    await conn.query("DELETE FROM sales_orders WHERE user_id = ? AND observations LIKE 'SEED::%'", [userId]);

    await conn.query(
      "DELETE soi FROM service_order_items soi JOIN service_orders so ON so.id = soi.order_id WHERE so.user_id = ? AND so.description LIKE 'SEED::%'",
      [userId]
    );
    await conn.query("DELETE FROM service_orders WHERE user_id = ? AND description LIKE 'SEED::%'", [userId]);

    await conn.query(
      "DELETE psi FROM pdv_sale_items psi JOIN pdv_sales ps ON ps.id = psi.sale_id WHERE ps.user_id = ? AND ps.customer_name LIKE 'SEED::%'",
      [userId]
    );
    await conn.query("DELETE FROM pdv_sales WHERE user_id = ? AND customer_name LIKE 'SEED::%'", [userId]);

    await conn.query(
      "DELETE fp FROM financial_payments fp JOIN financial_titles ft ON ft.id = fp.title_id WHERE ft.user_id = ? AND ft.description LIKE 'SEED::%'",
      [userId]
    );
    await conn.query("DELETE FROM financial_titles WHERE user_id = ? AND description LIKE 'SEED::%'", [userId]);

    await conn.query(
      "DELETE ct FROM cash_transactions ct JOIN cash_sessions cs ON cs.id = ct.session_id WHERE cs.user_id = ? AND cs.notes LIKE 'SEED::%'",
      [userId]
    );
    await conn.query("DELETE FROM cash_sessions WHERE user_id = ? AND notes LIKE 'SEED::%'", [userId]);

    await conn.query("DELETE FROM stock_movements WHERE user_id = ? AND reason LIKE 'SEED::%'", [userId]);
    await conn.query("DELETE FROM product_lots WHERE observations LIKE 'SEED::%'", []);
    await conn.query("DELETE FROM products WHERE user_id = ? AND observations LIKE 'SEED::%'", [userId]);
    await conn.query("DELETE FROM contacts WHERE user_id = ? AND observations LIKE 'SEED::%'", [userId]);
    await conn.query("DELETE FROM salespersons WHERE user_id = ? AND observations LIKE 'SEED::%'", [userId]);
    await conn.query("DELETE FROM categories WHERE user_id = ? AND description LIKE 'SEED::%'", [userId]);
    await conn.query("DELETE FROM bank_transactions WHERE user_id = ? AND description LIKE 'SEED::%'", [userId]);
    await conn.query("DELETE FROM bank_accounts WHERE user_id = ? AND name LIKE 'SEED::%'", [userId]);

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
  const userId = await findUserIdByEmail(args.email);
  if (!userId) {
    throw new Error(`Usuário não encontrado para o email: ${args.email}`);
  }

  args.clients = clampInt(args.clients, 0, 5000);
  args.suppliers = clampInt(args.suppliers, 0, 5000);
  args.products = clampInt(args.products, 0, 5000);
  args.services = clampInt(args.services, 0, 1000);
  args.salesOrders = clampInt(args.salesOrders, 0, 8000);
  args.pdvSales = clampInt(args.pdvSales, 0, 12000);
  args.serviceOrders = clampInt(args.serviceOrders, 0, 8000);
  args.cashSessions = clampInt(args.cashSessions, 0, 200);
  args.bankTransactions = clampInt(args.bankTransactions, 0, 10000);

  if (args.cashSessions === 0 && args.pdvSales > 0) args.cashSessions = 1;

  const tenantPool = await getTenantPool(userId);

  if (args.reset) {
    await resetSeed(tenantPool, userId);
  }

  const seedTag = `SEED::${new Date().toISOString()}`;
  const now = new Date();
  const start = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 90);

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
        `INSERT INTO categories (id, user_id, name, parent_id, description, color, created_at, updated_at)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?)` ,
        [c.id, userId, c.name, seedTag, c.color, createdAt, createdAt]
      );
    }

    const productNouns = [
      "Cabo USB-C",
      "Cabo Lightning",
      "Carregador",
      "Fonte USB",
      "Película Vidro",
      "Película Hidrogel",
      "Fone Bluetooth",
      "Suporte Veicular",
      "Power Bank",
      "Capinha",
      "Adaptador",
      "Mouse",
      "Teclado",
      "Ring Light",
      "Tripé",
      "Carregador Veicular",
      "Hub USB",
      "Cartão de Memória",
      "Cabo P2",
      "Caixa de Som",
    ];

    const productVariants = [
      "Premium",
      "Reforçado",
      "Turbo",
      "Ultra",
      "Pro",
      "Slim",
      "Magnético",
      "Antishock",
      "Transparente",
      "Full Cover",
      "Privacidade",
      "Original",
    ];

    const models = [
      "iPhone 11",
      "iPhone 12",
      "iPhone 13",
      "iPhone 14",
      "iPhone 15",
      "Galaxy A14",
      "Galaxy A24",
      "Galaxy S22",
      "Moto G54",
      "Moto G84",
      "Redmi Note 12",
      "Redmi Note 13",
    ];

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

    const products: Array<{ id: string; name: string; sku: string; price: number; cost: number; stock: number; stockMin: number; categoryId: string }> = [];
    for (let i = 0; i < args.products; i++) {
      const id = randomUUID();
      const name = genProductName(i);
      const sku = `MC-${String(i + 1).padStart(5, "0")}`;
      const price = randFloat(9.9, 249.9, 2);
      const cost = Math.max(0, Math.round(price * randFloat(0.45, 0.75, 2) * 100) / 100);
      const forceCritical = i < Math.max(10, Math.floor(args.products * 0.08));
      const stockMin = forceCritical ? randFloat(8, 20, 3) : i % 5 === 0 ? randFloat(5, 12, 3) : randFloat(0, 5, 3);
      const stock = forceCritical ? randFloat(0, Math.max(0, stockMin - 0.5), 3) : randFloat(0, 60, 3);
      const categoryId = randChoice(categories).id;
      products.push({ id, name, sku, price, cost, stock, stockMin, categoryId });
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

    const services: Array<{ id: string; name: string; sku: string; price: number; categoryId: string }> = [];
    for (let i = 0; i < args.services; i++) {
      const base = serviceCatalog[i % serviceCatalog.length]!;
      const model = Math.random() < 0.4 ? randChoice(models) : null;
      const name = model ? `${base} - ${model}` : base;
      const sku = `SERV-${String(i + 1).padStart(4, "0")}`;
      const price = randFloat(29.9, 399.9, 2);
      const categoryId = categories.find((c) => c.name === "Assistência")?.id ?? categories[categories.length - 3]!.id;
      services.push({ id: randomUUID(), name, sku, price, categoryId });
    }

    const lotControlledCount = Math.max(6, Math.floor(args.products * 0.03));
    const lotControlled = new Set<string>(products.slice(0, lotControlledCount).map((p) => p.id));

    for (const p of products) {
      const createdAt = toMysqlDateTime(randDateBetween(start, now));
      const updatedAt = toMysqlDateTime(randDateBetween(new Date(createdAt), now));
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
          userId,
          p.name,
          p.sku,
          p.price,
          p.cost,
          p.categoryId,
          "Genérico",
          `${p.name} de alta qualidade.`,
          seedTag,
          p.stock,
          p.stockMin,
          `Est-${randInt(1, 6)}-${randInt(1, 20)}`,
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
          const mfg = randDateBetween(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 120), now);
          const exp = randDateBetween(new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30), new Date(now.getTime() + 1000 * 60 * 60 * 24 * 540));
          const code = `L${String(randInt(100000, 999999))}`;
          await conn.query(
            `INSERT INTO product_lots (id, product_id, code, manufacturing_date, expiration_date, observations, stock, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)` ,
            [lotId, p.id, code, toMysqlDate(mfg), toMysqlDate(exp), seedTag, lotQty, createdAt, updatedAt]
          );
          await conn.query(
            `INSERT INTO stock_movements (id, product_id, user_id, type, quantity, reason, lot_id, created_at)
             VALUES (?, ?, ?, 'in', ?, ?, ?, ?)` ,
            [randomUUID(), p.id, userId, lotQty, `${seedTag}::Entrada inicial (lote ${code})`, lotId, createdAt]
          );
        }
      } else {
        const mvInId = randomUUID();
        await conn.query(
          `INSERT INTO stock_movements (id, product_id, user_id, type, quantity, reason, lot_id, created_at)
           VALUES (?, ?, ?, 'in', ?, ?, NULL, ?)` ,
          [mvInId, p.id, userId, p.stock, `${seedTag}::Entrada inicial`, createdAt]
        );
      }
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
        [s.id, userId, s.name, s.sku, s.price, s.categoryId, `${s.name}.`, seedTag, createdAt, updatedAt]
      );
    }

    const usedCpf = new Set<string>();
    const usedCnpj = new Set<string>();

    const clients: Array<{ id: string; name: string }> = [];
    const suppliers: Array<{ id: string; name: string }> = [];
    for (let i = 0; i < args.clients; i++) {
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
        const cpf = formatCpf(genCpfUnique(usedCpf));
        const email = `${slugEmail(name)}.${randInt(10, 99)}@example.com`;
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
            userId,
            name,
            `CLI-${String(i + 1).padStart(5, "0")}`,
            cpf,
            String(randInt(1000000, 9999999)),
            randInt(1, 9),
            toMysqlDate(randDateBetween(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 900), now)),
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
            Math.random() < 0.25 ? `https://www.${slugEmail(name)}.com.br` : null,
            randChoice(["ativo", "ativo", "ativo", "inativo", "sem_movimento"]),
            seedTag,
            createdAt,
            updatedAt,
          ]
        );
      } else {
        const company = genCompanyName();
        const fantasy = company.replace(/\s+(LTDA|ME|EIRELI|S\/A)$/i, "");
        const cnpj = formatCnpj(genCnpjUnique(usedCnpj));
        const email = `${slugEmail(fantasy)}.${randInt(10, 99)}@example.com`;
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
            userId,
            company,
            fantasy,
            `CLPJ-${String(i + 1).padStart(4, "0")}`,
            cnpj,
            String(randInt(100000000, 999999999)),
            randInt(1, 9),
            toMysqlDate(randDateBetween(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1800), now)),
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
            Math.random() < 0.4 ? `https://www.${slugEmail(fantasy)}.com.br` : null,
            randChoice(["ativo", "ativo", "ativo", "inativo", "sem_movimento"]),
            seedTag,
            createdAt,
            updatedAt,
          ]
        );
      }
    }
    for (let i = 0; i < args.suppliers; i++) {
      const id = randomUUID();
      const createdAt = toMysqlDateTime(randDateBetween(start, now));
      const updatedAt = toMysqlDateTime(randDateBetween(new Date(createdAt), now));
      const company = genCompanyName();
      const fantasy = company.replace(/\s+(LTDA|ME|EIRELI|S\/A)$/i, "");
      const addr = genAddress();
      const cnpj = formatCnpj(genCnpjUnique(usedCnpj));
      const billingAddr = Math.random() < 0.25 ? genAddress() : addr;
      const email = `${slugEmail(fantasy)}.${randInt(10, 99)}@example.com`;
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
          userId,
          company,
          fantasy,
          `FOR-${String(i + 1).padStart(4, "0")}`,
          cnpj,
          String(randInt(100000000, 999999999)),
          randInt(1, 9),
          toMysqlDate(randDateBetween(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1800), now)),
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
          Math.random() < 0.4 ? `https://www.${slugEmail(fantasy)}.com.br` : null,
          seedTag,
          createdAt,
          updatedAt,
        ]
      );
    }

    const salespersons = [
      { id: randomUUID(), name: genPersonName(), email: "vendas.01@example.com" },
      { id: randomUUID(), name: genPersonName(), email: "vendas.02@example.com" },
      { id: randomUUID(), name: genPersonName(), email: "vendas.03@example.com" },
    ];
    for (const sp of salespersons) {
      const createdAt = toMysqlDateTime(randDateBetween(start, now));
      const updatedAt = toMysqlDateTime(randDateBetween(new Date(createdAt), now));
      await conn.query(
        `INSERT INTO salespersons (id, user_id, name, email, phone, cpf, commission_rate, status, observations, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, 'active', ?, ?, ?)` ,
        [sp.id, userId, sp.name, sp.email, genPhone(), randFloat(1, 5, 2), seedTag, createdAt, updatedAt]
      );
    }

    const cashSessions: Array<{ id: string; openedAt: Date; status: "open" | "closed" }> = [];
    for (let i = 0; i < args.cashSessions; i++) {
      const id = randomUUID();
      const openedAt = randDateBetween(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 20), now);
      openedAt.setHours(randInt(8, 20), randInt(0, 59), randInt(0, 59), 0);
      const closed = i < Math.max(0, args.cashSessions - 1);
      const closedAt = closed ? new Date(openedAt.getTime() + 1000 * 60 * 60 * randInt(6, 10)) : null;
      const status = closed ? "closed" : "open";
      cashSessions.push({ id, openedAt, status });
      const openingBalance = randFloat(0, 300, 2);
      const closingBalance = closed ? openingBalance + randFloat(0, 1200, 2) - randFloat(0, 200, 2) : null;
      await conn.query(
        `INSERT INTO cash_sessions (
          id, user_id, user_name, status, opening_balance, closing_balance, opened_at, closed_at, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          id,
          userId,
          "Operador Seed",
          status,
          openingBalance,
          closingBalance,
          toMysqlDateTime(openedAt),
          closedAt ? toMysqlDateTime(closedAt) : null,
          seedTag,
          toMysqlDateTime(openedAt),
          toMysqlDateTime(closedAt ?? openedAt),
        ]
      );
    }

    const paymentMethods = ["money", "pix", "credit", "debit"];

    const [[soMaxRow]] = await conn.query<any[]>(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(number, 4) AS UNSIGNED)), 0) as n FROM sales_orders WHERE user_id = ? AND number LIKE 'SO-%'",
      [userId]
    );
    let salesOrderSeq = Number(soMaxRow?.n ?? 0) + 1;
    for (let i = 0; i < args.salesOrders; i++) {
      const id = randomUUID();
      const customer = randChoice(clients);
      const d = randDateBetween(start, now);
      const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const status = randChoice(["open", "billed", "delivered", "canceled"] as const);
      const itemsCount = randInt(1, 5);
      let subtotal = 0;
      let discount = 0;

      const items: Array<{ id: string; productId: string; desc: string; qty: number; unit: number; disc: number; total: number }> = [];
      for (let j = 0; j < itemsCount; j++) {
        const p = randChoice(products);
        const qty = randFloat(1, 4, 3);
        const unit = p.price;
        const disc = Math.random() < 0.25 ? randFloat(0.5, 5, 2) : 0;
        const total = Math.max(0, Math.round((qty * unit - disc) * 100) / 100);
        subtotal += Math.round(qty * unit * 100) / 100;
        discount += disc;
        items.push({ id: randomUUID(), productId: p.id, desc: p.name, qty, unit, disc, total });
      }
      const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

      const createdAt = toMysqlDateTime(randDateBetween(date, now));
      const updatedAt = createdAt;
      const number = `SO-${String(salesOrderSeq++).padStart(5, "0")}`;

      await conn.query(
        `INSERT INTO sales_orders (
          id, user_id, number, customer_id, customer_name, date, status, observations,
          totals_count, totals_subtotal, totals_discount, totals_total, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          id,
          userId,
          number,
          customer.id,
          customer.name,
          toMysqlDate(date),
          status,
          `${seedTag}::Pedido`,
          itemsCount,
          subtotal,
          discount,
          total,
          createdAt,
          updatedAt,
        ]
      );
      for (const it of items) {
        await conn.query(
          `INSERT INTO sales_order_items (id, order_id, product_id, description, quantity, unit_price, discount, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
          [it.id, id, it.productId, it.desc, it.qty, it.unit, it.disc, it.total]
        );
      }

      if (status !== "canceled") {
        const due = new Date(date.getTime() + 1000 * 60 * 60 * 24 * randInt(3, 14));
        const titleId = randomUUID();
        const amount = total;
        const willPay = status === "delivered" || Math.random() < 0.6;
        const paidAmount = willPay ? amount : Math.random() < 0.3 ? Math.round(amount * 0.5 * 100) / 100 : 0;
        const finStatus = paidAmount >= amount ? "paid" : paidAmount > 0 ? "partial" : "open";
        await conn.query(
          `INSERT INTO financial_titles (
            id, user_id, kind, status, origin, ref_id, party_id, party_name, description, amount, paid_amount, due_date, created_at, updated_at
          ) VALUES (?, ?, 'ar', ?, 'sales', ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
          [
            titleId,
            userId,
            finStatus,
            id,
            customer.id,
            customer.name,
            `${seedTag}::Recebimento pedido ${number}`,
            amount,
            paidAmount,
            toMysqlDate(due),
            createdAt,
            createdAt,
          ]
        );
        if (paidAmount > 0) {
          const paidAt = randDateBetween(date, new Date(Math.min(now.getTime(), due.getTime() + 1000 * 60 * 60 * 24 * 5)));
          await conn.query(
            `INSERT INTO financial_payments (id, title_id, user_id, amount, method, paid_at, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
            [randomUUID(), titleId, userId, paidAmount, randChoice(paymentMethods), toMysqlDateTime(paidAt), seedTag, toMysqlDateTime(paidAt)]
          );
        }
      }
    }

    for (let i = 0; i < args.pdvSales; i++) {
      const session = randChoice(cashSessions);
      const createdAt = randDateBetween(start, now);
      const id = randomUUID();
      const itemsCount = randInt(1, 6);
      let subtotal = 0;
      let discount = 0;
      const items: Array<{ id: string; productId: string; name: string; sku: string | null; qty: number; unit: number; discPerUnit: number; total: number }> = [];
      for (let j = 0; j < itemsCount; j++) {
        const p = randChoice(products);
        const qty = randFloat(1, 3, 3);
        const unit = p.price;
        const discPerUnit = Math.random() < 0.15 ? randFloat(0.2, 2, 2) : 0;
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
        `INSERT INTO pdv_sales (
          id, user_id, cash_session_id, customer_id, customer_name, payment_method,
          subtotal, discount, total, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)` ,
        [id, userId, session.id, customerId, `${seedTag}::${customerName}`, pm, subtotal, discount, total, toMysqlDateTime(createdAt)]
      );
      for (const it of items) {
        await conn.query(
          `INSERT INTO pdv_sale_items (id, sale_id, product_id, name, sku, quantity, unit_price, discount_per_unit, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
          [it.id, id, it.productId, it.name, it.sku, it.qty, it.unit, it.discPerUnit, it.total]
        );
      }

      await conn.query(
        `INSERT INTO cash_transactions (id, session_id, user_id, type, category, amount, description, payment_method, ref_id, meta_json, created_at)
         VALUES (?, ?, ?, 'in', 'sale', ?, ?, ?, ?, ?, ?)` ,
        [randomUUID(), session.id, userId, total, `${seedTag}::Venda PDV ${id.slice(0, 8)}`, pm, id, JSON.stringify({ refId: id }), toMysqlDateTime(createdAt)]
      );

      const titleId = randomUUID();
      const due = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
      await conn.query(
        `INSERT INTO financial_titles (
          id, user_id, kind, status, origin, ref_id, party_id, party_name, description, amount, paid_amount, due_date, created_at, updated_at
        ) VALUES (?, ?, 'ar', 'paid', 'pdv', ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          titleId,
          userId,
          id,
          customerId,
          customerName,
          `${seedTag}::Recebimento PDV ${id.slice(0, 8)}`,
          total,
          total,
          toMysqlDate(due),
          toMysqlDateTime(createdAt),
          toMysqlDateTime(createdAt),
        ]
      );
      await conn.query(
        `INSERT INTO financial_payments (id, title_id, user_id, amount, method, paid_at, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
        [randomUUID(), titleId, userId, total, pm, toMysqlDateTime(createdAt), seedTag, toMysqlDateTime(createdAt)]
      );
    }

    const apCount = Math.max(24, Math.floor(args.suppliers * 0.9));
    for (let i = 0; i < apCount; i++) {
      const supplier = randChoice(suppliers);
      const d = randDateBetween(start, now);
      const due = new Date(d.getTime() + 1000 * 60 * 60 * 24 * randInt(-10, 20));
      const amount = randFloat(80, 1200, 2);
      const titleId = randomUUID();
      const willPay = Math.random() < 0.5;
      const paidAmount = willPay ? amount : Math.random() < 0.25 ? Math.round(amount * 0.4 * 100) / 100 : 0;
      const status = paidAmount >= amount ? "paid" : paidAmount > 0 ? "partial" : "open";
      const createdAt = toMysqlDateTime(d);
      await conn.query(
        `INSERT INTO financial_titles (
          id, user_id, kind, status, origin, ref_id, party_id, party_name, description, amount, paid_amount, due_date, created_at, updated_at
        ) VALUES (?, ?, 'ap', ?, 'manual', NULL, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          titleId,
          userId,
          status,
          supplier.id,
          supplier.name,
          `${seedTag}::Conta a pagar`,
          amount,
          paidAmount,
          toMysqlDate(due),
          createdAt,
          createdAt,
        ]
      );
      if (paidAmount > 0) {
        const paidAt = randDateBetween(d, now);
        await conn.query(
          `INSERT INTO financial_payments (id, title_id, user_id, amount, method, paid_at, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
          [randomUUID(), titleId, userId, paidAmount, randChoice(paymentMethods), toMysqlDateTime(paidAt), seedTag, toMysqlDateTime(paidAt)]
        );
      }
    }

    const [[osMaxRow]] = await conn.query<any[]>(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(number, 4) AS UNSIGNED)), 0) as n FROM service_orders WHERE user_id = ? AND number LIKE 'OS-%'",
      [userId]
    );
    let serviceOrderSeq = Number(osMaxRow?.n ?? 0) + 1;

    for (let i = 0; i < args.serviceOrders; i++) {
      const id = randomUUID();
      const customer = Math.random() < 0.85 ? randChoice(clients) : null;
      const d = randDateBetween(start, now);
      const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const status = randChoice(["open", "in_progress", "completed", "canceled"] as const);
      const total = randInt(1, 4) * 50 + randFloat(0, 99, 2);
      const createdAt = toMysqlDateTime(randDateBetween(date, now));
      const updatedAt = createdAt;
      const number = `OS-${String(serviceOrderSeq++).padStart(5, "0")}`;
      await conn.query(
        `INSERT INTO service_orders (id, user_id, number, customer_id, customer_name, date, status, description, total_cents, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          id,
          userId,
          number,
          customer?.id ?? null,
          customer?.name ?? "Consumidor Final",
          toMysqlDate(date),
          status,
          `${seedTag}::Ordem de serviço`,
          Math.round(total * 100),
          createdAt,
          updatedAt,
        ]
      );

      const itemsCount = randInt(1, 4);
      for (let j = 0; j < itemsCount; j++) {
        const kind = randChoice(["labor", "part", "service", "fee"] as const);
        const p = kind === "part" ? randChoice(products) : null;
        const qty = randFloat(1, 2, 3);
        const unit = randFloat(20, 180, 2);
        const disc = Math.random() < 0.2 ? randFloat(1, 10, 2) : 0;
        const lineTotal = Math.max(0, Math.round((qty * unit - disc) * 100) / 100);
        await conn.query(
          `INSERT INTO service_order_items (id, order_id, kind, product_id, description, quantity, unit_price, discount, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
          [
            randomUUID(),
            id,
            kind,
            p?.id ?? null,
            p?.name ?? (kind === "labor" ? "Mão de obra" : kind === "service" ? "Serviço" : "Taxa"),
            qty,
            unit,
            disc,
            lineTotal,
          ]
        );
      }
    }

    const bankAccountId = randomUUID();
    const bankCreatedAt = toMysqlDateTime(randDateBetween(start, now));
    await conn.query(
      `INSERT INTO bank_accounts (id, user_id, name, bank, agency, account_number, initial_balance, balance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [bankAccountId, userId, `${seedTag}::Conta Principal`, "Banco Teste", "0001", "12345-6", 0, 0, bankCreatedAt, bankCreatedAt]
    );
    for (let i = 0; i < args.bankTransactions; i++) {
      const occurredAt = randDateBetween(start, now);
      const type = randChoice(["in", "out"] as const);
      const amount = randFloat(20, 900, 2);
      await conn.query(
        `INSERT INTO bank_transactions (id, account_id, user_id, type, amount, description, occurred_at, matched_ref_type, matched_ref_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)` ,
        [randomUUID(), bankAccountId, userId, type, amount, `${seedTag}::Movimento bancário`, toMysqlDateTime(occurredAt), toMysqlDateTime(occurredAt)]
      );
    }

    await conn.commit();

    const [[cContacts]] = await conn.query<any[]>("SELECT COUNT(*) as n FROM contacts WHERE user_id = ?", [userId]);
    const [[cProducts]] = await conn.query<any[]>("SELECT COUNT(*) as n FROM products WHERE user_id = ?", [userId]);
    const [[cSalesOrders]] = await conn.query<any[]>("SELECT COUNT(*) as n FROM sales_orders WHERE user_id = ?", [userId]);
    const [[cPdvSales]] = await conn.query<any[]>("SELECT COUNT(*) as n FROM pdv_sales WHERE user_id = ?", [userId]);
    const [[cServiceOrders]] = await conn.query<any[]>("SELECT COUNT(*) as n FROM service_orders WHERE user_id = ?", [userId]);
    const [[cTitles]] = await conn.query<any[]>("SELECT COUNT(*) as n FROM financial_titles WHERE user_id = ?", [userId]);
    const [[cCashSessions]] = await conn.query<any[]>("SELECT COUNT(*) as n FROM cash_sessions WHERE user_id = ?", [userId]);
    const [[cCashTx]] = await conn.query<any[]>("SELECT COUNT(*) as n FROM cash_transactions WHERE user_id = ?", [userId]);

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          ok: true,
          userId,
          email: args.email,
          seedTag,
          counts: {
            contacts: Number(cContacts?.n ?? 0),
            products: Number(cProducts?.n ?? 0),
            salesOrders: Number(cSalesOrders?.n ?? 0),
            pdvSales: Number(cPdvSales?.n ?? 0),
            serviceOrders: Number(cServiceOrders?.n ?? 0),
            financialTitles: Number(cTitles?.n ?? 0),
            cashSessions: Number(cCashSessions?.n ?? 0),
            cashTransactions: Number(cCashTx?.n ?? 0),
          },
        },
        null,
        2
      )
    );
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
    try {
      await tenantPool.end();
    } catch {
      // ignore
    }
    try {
      await pool.end();
    } catch {
      // ignore
    }
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

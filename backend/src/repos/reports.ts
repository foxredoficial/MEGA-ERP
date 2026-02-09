import type { RowDataPacket } from "mysql2/promise";
import { getTenantPool } from "../db_tenant.js";

export type ReportDefinition = {
  id: string;
  group: "Financeiro" | "Vendas" | "Estoque" | "Caixa" | "Produtos" | "Transações";
  title: string;
  defaultGranularity: "day" | "week" | "month";
};

export type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

export type ReportResult = {
  meta: {
    id: string;
    title: string;
    generatedAt: string;
    filters: Record<string, string | number | boolean | null>;
  };
  columns: ReportColumn[];
  rows: Array<Record<string, any>>;
  totals?: Record<string, number>;
};

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  { id: "cash-transactions", group: "Caixa", title: "Transações de Caixa", defaultGranularity: "day" },
  { id: "cash-sessions", group: "Caixa", title: "Sessões de Caixa", defaultGranularity: "day" },
  { id: "sales-orders", group: "Vendas", title: "Pedidos de Venda", defaultGranularity: "day" },
  { id: "pdv-sales", group: "Vendas", title: "Vendas (PDV)", defaultGranularity: "day" },
  { id: "financial-titles", group: "Financeiro", title: "Títulos (A Receber/A Pagar)", defaultGranularity: "day" },
  { id: "financial-payments", group: "Financeiro", title: "Pagamentos (Financeiro)", defaultGranularity: "day" },
  { id: "stock-movements", group: "Estoque", title: "Movimentações de Estoque", defaultGranularity: "day" },
  { id: "products", group: "Produtos", title: "Cadastro de Produtos", defaultGranularity: "month" },
];

type CommonFilter = {
  start: string;
  end: string;
  query?: string;
  status?: string;
  kind?: string;
};

function nowIso() {
  return new Date().toISOString();
}

export async function listReportDefinitions() {
  return REPORT_DEFINITIONS;
}

export async function runReport(userId: string, reportId: string, f: CommonFilter): Promise<ReportResult> {
  const pool = await getTenantPool(userId);

  if (reportId === "cash-transactions") {
    const columns: ReportColumn[] = [
      { key: "createdAt", label: "Data/Hora" },
      { key: "type", label: "Tipo" },
      { key: "category", label: "Categoria" },
      { key: "paymentMethod", label: "Pagamento" },
      { key: "amount", label: "Valor", align: "right" },
      { key: "description", label: "Descrição" },
      { key: "sessionId", label: "Sessão" },
    ];

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        type,
        category,
        payment_method as paymentMethod,
        amount,
        description,
        session_id as sessionId
      FROM cash_transactions
      WHERE user_id = ?
        AND created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
      ORDER BY created_at DESC
      LIMIT 5000`,
      [userId, f.start, f.end]
    );

    const [tot] = await pool.query<RowDataPacket[]>(
      `SELECT
        COALESCE(SUM(CASE WHEN type='in' THEN amount ELSE 0 END),0) as total_in,
        COALESCE(SUM(CASE WHEN type='out' THEN amount ELSE 0 END),0) as total_out
      FROM cash_transactions
      WHERE user_id = ? AND created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`,
      [userId, f.start, f.end]
    );
    const t = (tot as any[])[0] ?? {};

    return {
      meta: { id: reportId, title: "Transações de Caixa", generatedAt: nowIso(), filters: { start: f.start, end: f.end } },
      columns,
      rows: rows as any[],
      totals: { in: Number(t.total_in ?? 0), out: Number(t.total_out ?? 0), net: Number(t.total_in ?? 0) - Number(t.total_out ?? 0) },
    };
  }

  if (reportId === "cash-sessions") {
    const columns: ReportColumn[] = [
      { key: "openedAt", label: "Abertura" },
      { key: "closedAt", label: "Fechamento" },
      { key: "status", label: "Status" },
      { key: "userName", label: "Operador" },
      { key: "openingBalance", label: "Saldo abertura", align: "right" },
      { key: "closingBalance", label: "Saldo fechamento", align: "right" },
      { key: "notes", label: "Obs" },
    ];

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        id,
        DATE_FORMAT(opened_at, '%Y-%m-%d %H:%i:%s') as openedAt,
        DATE_FORMAT(closed_at, '%Y-%m-%d %H:%i:%s') as closedAt,
        status,
        user_name as userName,
        opening_balance as openingBalance,
        closing_balance as closingBalance,
        notes
      FROM cash_sessions
      WHERE user_id = ? AND opened_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
      ORDER BY opened_at DESC
      LIMIT 2000`,
      [userId, f.start, f.end]
    );
    return {
      meta: { id: reportId, title: "Sessões de Caixa", generatedAt: nowIso(), filters: { start: f.start, end: f.end } },
      columns,
      rows: rows as any[],
    };
  }

  if (reportId === "sales-orders") {
    const columns: ReportColumn[] = [
      { key: "date", label: "Data" },
      { key: "number", label: "Número" },
      { key: "customerName", label: "Cliente" },
      { key: "status", label: "Status" },
      { key: "total", label: "Total", align: "right" },
      { key: "discount", label: "Desconto", align: "right" },
      { key: "items", label: "Itens", align: "right" },
    ];

    const where: string[] = ["user_id = ?", "date BETWEEN ? AND ?"];
    const params: any[] = [userId, f.start, f.end];
    if (f.status && f.status !== "all") {
      where.push("status = ?");
      params.push(f.status);
    }
    if (f.query) {
      where.push("(number LIKE ? OR customer_name LIKE ?)");
      params.push(`%${f.query}%`, `%${f.query}%`);
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        DATE_FORMAT(date, '%Y-%m-%d') as date,
        number,
        customer_name as customerName,
        status,
        totals_total as total,
        totals_discount as discount,
        totals_count as items
      FROM sales_orders
      WHERE ${where.join(" AND ")}
      ORDER BY date DESC, number DESC
      LIMIT 5000`,
      params
    );

    const [tot] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(totals_total),0) as total FROM sales_orders WHERE ${where.join(" AND ")}`,
      params
    );
    const t = (tot as any[])[0] ?? {};

    return {
      meta: { id: reportId, title: "Pedidos de Venda", generatedAt: nowIso(), filters: { start: f.start, end: f.end, status: f.status ?? null, query: f.query ?? null } },
      columns,
      rows: rows as any[],
      totals: { total: Number(t.total ?? 0) },
    };
  }

  if (reportId === "pdv-sales") {
    const columns: ReportColumn[] = [
      { key: "createdAt", label: "Data/Hora" },
      { key: "customerName", label: "Cliente" },
      { key: "paymentMethod", label: "Pagamento" },
      { key: "subtotal", label: "Subtotal", align: "right" },
      { key: "discount", label: "Desconto", align: "right" },
      { key: "total", label: "Total", align: "right" },
      { key: "status", label: "Status" },
    ];

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        COALESCE(customer_name,'-') as customerName,
        payment_method as paymentMethod,
        subtotal,
        discount,
        total,
        status
      FROM pdv_sales
      WHERE user_id = ? AND created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
      ORDER BY created_at DESC
      LIMIT 5000`,
      [userId, f.start, f.end]
    );

    const [tot] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(total),0) as total FROM pdv_sales WHERE user_id = ? AND created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY) AND status='completed'`,
      [userId, f.start, f.end]
    );
    const t = (tot as any[])[0] ?? {};

    return {
      meta: { id: reportId, title: "Vendas (PDV)", generatedAt: nowIso(), filters: { start: f.start, end: f.end } },
      columns,
      rows: rows as any[],
      totals: { total: Number(t.total ?? 0) },
    };
  }

  if (reportId === "financial-titles") {
    const columns: ReportColumn[] = [
      { key: "dueDate", label: "Vencimento" },
      { key: "kind", label: "Tipo" },
      { key: "status", label: "Status" },
      { key: "partyName", label: "Cliente/Fornecedor" },
      { key: "description", label: "Descrição" },
      { key: "amount", label: "Valor", align: "right" },
      { key: "paidAmount", label: "Pago", align: "right" },
      { key: "openAmount", label: "Em aberto", align: "right" },
      { key: "origin", label: "Origem" },
    ];

    const where: string[] = ["user_id = ?", "due_date BETWEEN ? AND ?"];
    const params: any[] = [userId, f.start, f.end];
    if (f.kind && (f.kind === "ar" || f.kind === "ap")) {
      where.push("kind = ?");
      params.push(f.kind);
    }
    if (f.status && f.status !== "all") {
      where.push("status = ?");
      params.push(f.status);
    }
    if (f.query) {
      where.push("(description LIKE ? OR party_name LIKE ?)");
      params.push(`%${f.query}%`, `%${f.query}%`);
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        DATE_FORMAT(due_date, '%Y-%m-%d') as dueDate,
        kind,
        status,
        COALESCE(party_name,'-') as partyName,
        description,
        amount,
        paid_amount as paidAmount,
        (amount - paid_amount) as openAmount,
        origin
      FROM financial_titles
      WHERE ${where.join(" AND ")}
      ORDER BY due_date DESC
      LIMIT 8000`,
      params
    );

    const [tot] = await pool.query<RowDataPacket[]>(
      `SELECT
        COALESCE(SUM(amount),0) as amount,
        COALESCE(SUM(paid_amount),0) as paid,
        COALESCE(SUM(amount - paid_amount),0) as open
       FROM financial_titles WHERE ${where.join(" AND ")}`,
      params
    );
    const t = (tot as any[])[0] ?? {};

    return {
      meta: { id: reportId, title: "Títulos (A Receber/A Pagar)", generatedAt: nowIso(), filters: { start: f.start, end: f.end, kind: f.kind ?? null, status: f.status ?? null, query: f.query ?? null } },
      columns,
      rows: rows as any[],
      totals: { amount: Number(t.amount ?? 0), paid: Number(t.paid ?? 0), open: Number(t.open ?? 0) },
    };
  }

  if (reportId === "financial-payments") {
    const columns: ReportColumn[] = [
      { key: "paidAt", label: "Data/Hora" },
      { key: "titleKind", label: "Tipo" },
      { key: "method", label: "Método" },
      { key: "amount", label: "Valor", align: "right" },
      { key: "partyName", label: "Cliente/Fornecedor" },
      { key: "description", label: "Descrição" },
      { key: "notes", label: "Obs" },
    ];

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        DATE_FORMAT(p.paid_at, '%Y-%m-%d %H:%i:%s') as paidAt,
        t.kind as titleKind,
        p.method,
        p.amount,
        COALESCE(t.party_name,'-') as partyName,
        t.description,
        p.notes
      FROM financial_payments p
      INNER JOIN financial_titles t ON t.id = p.title_id
      WHERE p.user_id = ? AND p.paid_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
      ORDER BY p.paid_at DESC
      LIMIT 8000`,
      [userId, f.start, f.end]
    );

    const [tot] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount),0) as total FROM financial_payments WHERE user_id = ? AND paid_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`,
      [userId, f.start, f.end]
    );
    const t = (tot as any[])[0] ?? {};

    return {
      meta: { id: reportId, title: "Pagamentos (Financeiro)", generatedAt: nowIso(), filters: { start: f.start, end: f.end } },
      columns,
      rows: rows as any[],
      totals: { total: Number(t.total ?? 0) },
    };
  }

  if (reportId === "stock-movements") {
    const columns: ReportColumn[] = [
      { key: "createdAt", label: "Data/Hora" },
      { key: "type", label: "Tipo" },
      { key: "product", label: "Produto" },
      { key: "quantity", label: "Quantidade", align: "right" },
      { key: "reason", label: "Motivo" },
      { key: "lotId", label: "Lote" },
    ];

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i:%s') as createdAt,
        m.type,
        p.name as product,
        m.quantity,
        m.reason,
        m.lot_id as lotId
      FROM stock_movements m
      INNER JOIN products p ON p.id = m.product_id
      WHERE m.user_id = ? AND m.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
      ORDER BY m.created_at DESC
      LIMIT 8000`,
      [userId, f.start, f.end]
    );

    return {
      meta: { id: reportId, title: "Movimentações de Estoque", generatedAt: nowIso(), filters: { start: f.start, end: f.end } },
      columns,
      rows: rows as any[],
    };
  }

  if (reportId === "products") {
    const columns: ReportColumn[] = [
      { key: "sku", label: "SKU" },
      { key: "name", label: "Produto" },
      { key: "type", label: "Tipo" },
      { key: "stock", label: "Estoque", align: "right" },
      { key: "stockMin", label: "Mín", align: "right" },
      { key: "stockMax", label: "Máx", align: "right" },
      { key: "price", label: "Preço", align: "right" },
      { key: "costPrice", label: "Custo", align: "right" },
    ];

    const where: string[] = ["user_id = ?"];
    const params: any[] = [userId];
    if (f.query) {
      where.push("(name LIKE ? OR sku LIKE ?)");
      params.push(`%${f.query}%`, `%${f.query}%`);
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        sku,
        name,
        type,
        stock,
        stock_min as stockMin,
        stock_max as stockMax,
        price,
        cost_price as costPrice
      FROM products
      WHERE ${where.join(" AND ")}
      ORDER BY name ASC
      LIMIT 10000`,
      params
    );

    return {
      meta: { id: reportId, title: "Cadastro de Produtos", generatedAt: nowIso(), filters: { query: f.query ?? null } },
      columns,
      rows: rows as any[],
    };
  }

  throw new Error("Relatório não encontrado.");
}


import { getTenantPool } from "../db_tenant.js";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";

export type Product = {
  id: string;
  user_id: string;
  name: string;
  sku: string | null;
  price: number;
  cost_price: number;
  unit: string;
  format: 'simple' | 'variation';
  type: 'product' | 'service';
  condition_type: 'new' | 'used' | 'not_specified';
  category_id: string | null;
  brand: string | null;
  weight_net: number | null;
  weight_gross: number | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  volumes: number | null;
  items_per_box: number | null;
  gtin: string | null;
  gtin_tax: string | null;
  description_short: string | null;
  description_complementary: string | null;
  image_url: string | null;
  video_url: string | null;
  external_link: string | null;
  observations: string | null;
  stock: number;
  stock_min: number;
  stock_max: number;
  crossdocking: number;
  location: string | null;
  ncm: string | null;
  cest: string | null;
  origin: string | null;
  item_type: string | null;
  parent_id: string | null;
  variations_json: Array<{ name: string; options: string[] }> | null;
  has_lot_control?: boolean;
  created_at: Date;
  updated_at: Date;
};

export async function createProduct(userId: string, data: Partial<Product>) {
  const pool = await getTenantPool(userId);
  const id = randomUUID();
  const now = new Date();

  await pool.query(
    `INSERT INTO products (
      id, user_id, name, sku, price, unit, format, type, condition_type, 
      category_id, brand, weight_net, weight_gross, width, height, depth, 
      volumes, items_per_box, gtin, gtin_tax, description_short, 
      description_complementary, image_url, video_url, external_link, 
      observations, stock, stock_min, stock_max, crossdocking, location,
      ncm, cest, origin, item_type, parent_id, variations_json, has_lot_control,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      data.name,
      data.sku || null,
      data.price || 0,
      data.unit || 'UN',
      data.format || 'simple',
      data.type || 'product',
      data.condition_type || 'new',
      data.category_id || null,
      data.brand || null,
      data.weight_net || null,
      data.weight_gross || null,
      data.width || null,
      data.height || null,
      data.depth || null,
      data.volumes || null,
      data.items_per_box || null,
      data.gtin || null,
      data.gtin_tax || null,
      data.description_short || null,
      data.description_complementary || null,
      data.image_url || null,
      data.video_url || null,
      data.external_link || null,
      data.observations || null,
      data.stock || 0,
      data.stock_min || 0,
      data.stock_max || 0,
      data.crossdocking || 0,
      data.location || null,
      data.ncm || null,
      data.cest || null,
      data.origin || null,
      data.item_type || null,
      data.parent_id || null,
      data.variations_json ? JSON.stringify(data.variations_json) : null,
      data.has_lot_control || false,
      now,
      now,
    ]
  );

  return id;
}

export async function listProducts(userId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(Product & RowDataPacket)[]>(
    "SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows;
}

export async function getProduct(userId: string, productId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(Product & RowDataPacket)[]>(
    "SELECT * FROM products WHERE user_id = ? AND id = ?",
    [userId, productId]
  );
  return rows[0] || null;
}

export async function getProductVariations(userId: string, parentId: string) {
  const pool = await getTenantPool(userId);
  const [rows] = await pool.query<(Product & RowDataPacket)[]>(
    "SELECT * FROM products WHERE user_id = ? AND parent_id = ? ORDER BY created_at ASC",
    [userId, parentId]
  );
  return rows;
}

export async function updateProduct(userId: string, productId: string, data: Partial<Product>) {
  const pool = await getTenantPool(userId);
  const now = new Date();
  
  // Dynamic update query
  const fields: string[] = [];
  const values: any[] = [];

  const allowList = [
    'name', 'sku', 'price', 'cost_price', 'unit', 'format', 'type', 'condition_type',
    'category_id', 'brand', 'weight_net', 'weight_gross', 'width', 'height', 'depth',
    'volumes', 'items_per_box', 'gtin', 'gtin_tax', 'description_short',
    'description_complementary', 'image_url', 'video_url', 'external_link',
    'observations', 'stock',
    'stock_min', 'stock_max', 'crossdocking', 'location',
    'ncm', 'cest', 'origin', 'item_type', 'parent_id', 'variations_json', 'has_lot_control'
  ];

  for (const key of allowList) {
    if (data[key as keyof Product] !== undefined) {
      fields.push(`${key} = ?`);
      if (key === "variations_json") {
        values.push(data.variations_json ? JSON.stringify(data.variations_json) : null);
      } else {
        values.push(data[key as keyof Product]);
      }
    }
  }

  if (fields.length === 0) return;

  fields.push("updated_at = ?");
  values.push(now);

  values.push(userId);
  values.push(productId);

  await pool.query(
    `UPDATE products SET ${fields.join(", ")} WHERE user_id = ? AND id = ?`,
    values
  );
}

export async function deleteProduct(userId: string, productId: string) {
  const pool = await getTenantPool(userId);
  await pool.query("DELETE FROM products WHERE user_id = ? AND id = ?", [userId, productId]);
}

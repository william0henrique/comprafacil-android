import { z } from "zod";

const rowId = z.string().min(1).max(200);
const text = z.string().max(10_000);
const nullableText = text.nullable();
const finiteNumber = z.number().finite();
const nullableNumber = finiteNumber.nullable();
const positiveInt = z.number().int().positive();
const nullableInt = z.number().int().nonnegative().nullable();
const flag = z.union([z.literal(0), z.literal(1)]);
const isoDate = z.string().datetime({ offset: true });
const boundedRows = <T extends z.ZodType>(schema: T) => z.array(schema).max(10_000);

const storeRowSchema = z.object({
  id: rowId,
  chain_id: nullableText,
  chain_name: text,
  branch_name: nullableText,
  address: nullableText,
  city: nullableText,
  state: nullableText,
  latitude: nullableNumber,
  longitude: nullableNumber,
  source: text,
  source_url: nullableText,
  address_verified: flag,
  is_favorite: flag,
  is_active: flag,
  external_store_id: nullableText,
  created_at: isoDate,
}).strict();

const listRowSchema = z.object({
  id: rowId,
  name: text,
  is_favorite: flag,
  selected_store_id: rowId.nullable(),
  created_at: isoDate,
  updated_at: isoDate,
}).strict();

const productRowSchema = z.object({
  id: rowId,
  name: text,
  brand: nullableText,
  size_value: finiteNumber.nullable(),
  size_unit: z.enum(["kg", "g", "l", "ml", "un"]).nullable(),
  category: nullableText,
  product_key: text,
  is_favorite: flag,
  created_at: isoDate,
}).strict();

const listItemRowSchema = z.object({
  id: rowId,
  list_id: rowId,
  product_id: rowId,
  quantity: z.number().finite().positive(),
  created_at: isoDate,
}).strict();

const priceObservationRowSchema = z.object({
  id: rowId,
  product_id: rowId,
  store_id: rowId,
  price_cents: positiveInt,
  currency: z.string().length(3),
  source: text,
  source_label: text,
  observed_at: isoDate,
  availability: text,
}).strict();

const priceHistoryRowSchema = z.object({
  id: rowId,
  product_id: rowId,
  store_id: rowId,
  old_price_cents: nullableInt,
  new_price_cents: positiveInt,
  source: text,
  source_label: text,
  changed_at: isoDate,
}).strict();

const alertPreferenceRowSchema = z.object({
  alert_key: z.enum(["price_drop", "price_rise", "promotion", "unavailable", "lowest_store", "threshold"]),
  enabled: flag,
  threshold_cents: nullableInt,
}).strict();

const alertEventRowSchema = z.object({
  id: rowId,
  product_id: rowId.nullable(),
  store_id: rowId.nullable(),
  message: text,
  old_price_cents: nullableInt,
  new_price_cents: nullableInt,
  created_at: isoDate,
  is_read: flag,
}).strict();

const appSettingRowSchema = z.object({
  setting_key: z.literal("recommendation"),
  setting_value: z.enum(["lowestPrice", "closest", "balanced"]),
}).strict();

export const cloudBackupSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  createdAt: isoDate,
  tables: z.object({
    stores: boundedRows(storeRowSchema),
    shopping_lists: boundedRows(listRowSchema),
    products: boundedRows(productRowSchema),
    list_items: boundedRows(listItemRowSchema),
    price_observations: boundedRows(priceObservationRowSchema),
    price_history: boundedRows(priceHistoryRowSchema),
    alert_preferences: z.array(alertPreferenceRowSchema).max(100),
    alert_events: boundedRows(alertEventRowSchema),
    app_settings: z.array(appSettingRowSchema).max(100),
  }).strict(),
}).strict();

export type CloudBackupSnapshot = z.infer<typeof cloudBackupSnapshotSchema>;

function assertUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) throw new Error(`O backup contém identificadores duplicados em ${label}.`);
}

export function parseCloudBackupSnapshot(value: unknown): CloudBackupSnapshot {
  const snapshot = cloudBackupSnapshotSchema.parse(value);
  const { tables } = snapshot;
  const storeIds = new Set(tables.stores.map((row) => row.id));
  const listIds = new Set(tables.shopping_lists.map((row) => row.id));
  const productIds = new Set(tables.products.map((row) => row.id));

  assertUnique([...storeIds], "stores");
  assertUnique(tables.shopping_lists.map((row) => row.id), "shopping_lists");
  assertUnique(tables.products.map((row) => row.id), "products");
  assertUnique(tables.list_items.map((row) => row.id), "list_items");
  assertUnique(tables.price_observations.map((row) => row.id), "price_observations");
  assertUnique(tables.price_history.map((row) => row.id), "price_history");
  assertUnique(tables.alert_events.map((row) => row.id), "alert_events");

  for (const list of tables.shopping_lists) {
    if (list.selected_store_id !== null && !storeIds.has(list.selected_store_id)) {
      throw new Error("O backup contém uma lista vinculada a uma loja inexistente.");
    }
  }
  for (const item of tables.list_items) {
    if (!listIds.has(item.list_id) || !productIds.has(item.product_id)) {
      throw new Error("O backup contém um item vinculado a uma lista ou produto inexistente.");
    }
  }
  for (const price of tables.price_observations) {
    if (!productIds.has(price.product_id) || !storeIds.has(price.store_id)) {
      throw new Error("O backup contém um preço vinculado a um produto ou loja inexistente.");
    }
  }
  for (const row of tables.price_history) {
    if (!productIds.has(row.product_id) || !storeIds.has(row.store_id)) {
      throw new Error("O backup contém um histórico vinculado a um produto ou loja inexistente.");
    }
  }
  for (const event of tables.alert_events) {
    if (event.product_id !== null && !productIds.has(event.product_id)) {
      throw new Error("O backup contém um alerta vinculado a um produto inexistente.");
    }
    if (event.store_id !== null && !storeIds.has(event.store_id)) {
      throw new Error("O backup contém um alerta vinculado a uma loja inexistente.");
    }
  }
  return snapshot;
}

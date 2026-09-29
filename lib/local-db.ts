import type { SQLiteDatabase } from "expo-sqlite";
import {
  crossesPriceThreshold,
  formatBRL,
  isComparableStorePriceSource,
  MANUAL_STORE_PRICE_SOURCE,
  makeProductKey,
  makeProductIdentity,
  normalizeText,
  type MeasurementUnit,
  type StorePrice,
} from "./domain";

export type ShoppingList = {
  id: string;
  name: string;
  isFavorite: boolean;
  selectedStoreId: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  totalCents: number | null;
  missingCount: number;
};

export type Product = {
  id: string;
  name: string;
  brand: string | null;
  sizeValue: number | null;
  sizeUnit: MeasurementUnit | null;
  category: string | null;
  isFavorite: boolean;
  createdAt: string;
};

export type Store = {
  id: string;
  chainId: string | null;
  chainName: string;
  branchName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string;
  sourceUrl: string | null;
  addressVerified: boolean;
  isFavorite: boolean;
  isActive: boolean;
  externalStoreId: string | null;
  createdAt: string;
};

export type ListItem = {
  id: string;
  listId: string;
  productId: string;
  quantity: number;
  createdAt: string;
  productName: string;
  brand: string | null;
  sizeValue: number | null;
  sizeUnit: MeasurementUnit | null;
  category: string | null;
  isFavorite: boolean;
  priceCents: number | null;
  source: string | null;
  sourceLabel: string | null;
  observedAt: string | null;
};

export type PriceHistoryItem = {
  id: string;
  oldPriceCents: number | null;
  newPriceCents: number | null;
  changedAt: string;
  sourceLabel: string;
  storeName: string;
  branchName: string | null;
};

export type PriceEvent = {
  id: string;
  productId: string | null;
  storeId: string | null;
  message: string;
  oldPriceCents: number | null;
  newPriceCents: number | null;
  createdAt: string;
  isRead: boolean;
};

export type AlertKey = "price_drop" | "price_rise" | "promotion" | "unavailable" | "lowest_store" | "threshold";
export type AlertPreference = { key: AlertKey; enabled: boolean; thresholdCents: number | null };
export type ProductDraft = Product & { identity: string | null };
export type PriceSaveResult = { changed: boolean; oldPriceCents: number | null; newPriceCents: number; eventId: string | null; thresholdEventId: string | null; thresholdCrossed: boolean; thresholdCents: number | null };

type ShoppingListDbRow = Omit<ShoppingList, "isFavorite" | "totalCents"> & { isFavorite: number; rawTotal: number | null };
type StoreDbRow = Omit<Store, "addressVerified" | "isFavorite" | "isActive"> & { addressVerified: number; isFavorite: number; isActive: number };
type ProductDbRow = Omit<Product, "isFavorite"> & { isFavorite: number };
type PriceEventDbRow = Omit<PriceEvent, "isRead"> & { isRead: number };
type AlertPreferenceDbRow = Omit<AlertPreference, "enabled"> & { enabled: number };

const SCHEMA_VERSION = 1;
const SUPERLUNA_SOURCE = "https://superluna.com.br/lojas/";
const SUPERLUNA_BRANCHES = [
  { id: "superluna-eldorado", branch: "Eldorado", city: "Contagem" },
  { id: "superluna-palmeiras", branch: "Palmeiras", city: "Ibirité" },
  { id: "superluna-sarzedo", branch: "Sarzedo", city: null },
  { id: "superluna-alcina-campos", branch: "Alcina Campos", city: "Ibirité" },
  { id: "superluna-cachoeira", branch: "Cachoeira", city: "Betim" },
] as const;

export function makeLocalId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function initializeLocalDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA foreign_keys = ON;");
  const versionRow = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version;");
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < SCHEMA_VERSION) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS stores (
          id TEXT PRIMARY KEY NOT NULL,
          chain_id TEXT,
          chain_name TEXT NOT NULL,
          branch_name TEXT,
          address TEXT,
          city TEXT,
          state TEXT,
          latitude REAL,
          longitude REAL,
          source TEXT NOT NULL DEFAULT 'manual',
          source_url TEXT,
          address_verified INTEGER NOT NULL DEFAULT 0,
          is_favorite INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          external_store_id TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS shopping_lists (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          is_favorite INTEGER NOT NULL DEFAULT 0,
          selected_store_id TEXT REFERENCES stores(id) ON DELETE SET NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          brand TEXT,
          size_value REAL,
          size_unit TEXT,
          category TEXT,
          product_key TEXT NOT NULL UNIQUE,
          is_favorite INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS list_items (
          id TEXT PRIMARY KEY NOT NULL,
          list_id TEXT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
          product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
          quantity REAL NOT NULL CHECK (quantity > 0),
          created_at TEXT NOT NULL,
          UNIQUE(list_id, product_id)
        );
        CREATE TABLE IF NOT EXISTS price_observations (
          id TEXT PRIMARY KEY NOT NULL,
          product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
          price_cents INTEGER NOT NULL CHECK (price_cents > 0),
          currency TEXT NOT NULL DEFAULT 'BRL',
          source TEXT NOT NULL,
          source_label TEXT NOT NULL,
          observed_at TEXT NOT NULL,
          availability TEXT NOT NULL DEFAULT 'available',
          UNIQUE(product_id, store_id)
        );
        CREATE TABLE IF NOT EXISTS price_history (
          id TEXT PRIMARY KEY NOT NULL,
          product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
          old_price_cents INTEGER,
          new_price_cents INTEGER NOT NULL,
          source TEXT NOT NULL,
          source_label TEXT NOT NULL,
          changed_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS alert_preferences (
          alert_key TEXT PRIMARY KEY NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 0,
          threshold_cents INTEGER
        );
        CREATE TABLE IF NOT EXISTS alert_events (
          id TEXT PRIMARY KEY NOT NULL,
          product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
          store_id TEXT REFERENCES stores(id) ON DELETE SET NULL,
          message TEXT NOT NULL,
          old_price_cents INTEGER,
          new_price_cents INTEGER,
          created_at TEXT NOT NULL,
          is_read INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS app_settings (
          setting_key TEXT PRIMARY KEY NOT NULL,
          setting_value TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_list_items_list ON list_items(list_id);
        CREATE INDEX IF NOT EXISTS idx_price_product_store ON price_observations(product_id, store_id);
        CREATE INDEX IF NOT EXISTS idx_price_history_product_date ON price_history(product_id, changed_at DESC);
        CREATE INDEX IF NOT EXISTS idx_alert_events_date ON alert_events(created_at DESC);
        PRAGMA user_version = 1;
      `);
    });
  }

  await seedInitialData(db);
}

async function seedInitialData(db: SQLiteDatabase): Promise<void> {
  const storeCount = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM stores;");
  if ((storeCount?.count ?? 0) === 0) {
    const now = new Date().toISOString();
    for (const item of SUPERLUNA_BRANCHES) {
      await db.runAsync(
        `INSERT OR IGNORE INTO stores (id, chain_id, chain_name, branch_name, city, state, source, source_url, address_verified, is_active, created_at)
         VALUES (?, 'superluna-public-index', 'SuperLuna Supermercados', ?, ?, 'MG', 'public-index-name-only', ?, 0, 1, ?);`,
        item.id,
        item.branch,
        item.city,
        SUPERLUNA_SOURCE,
        now,
      );
    }
  }
  for (const key of ["price_drop", "price_rise", "promotion", "unavailable", "lowest_store", "threshold"] as const) {
    await db.runAsync("INSERT OR IGNORE INTO alert_preferences (alert_key, enabled, threshold_cents) VALUES (?, 0, NULL);", key);
  }
  await db.runAsync("INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('recommendation', 'balanced');");
}

export async function getLists(db: SQLiteDatabase): Promise<ShoppingList[]> {
  const rows = await db.getAllAsync<ShoppingListDbRow>(`
    SELECT l.id, l.name, l.is_favorite AS isFavorite, l.selected_store_id AS selectedStoreId,
      l.created_at AS createdAt, l.updated_at AS updatedAt,
      COUNT(li.id) AS itemCount,
      SUM(CASE WHEN po.price_cents IS NOT NULL THEN ROUND(po.price_cents * li.quantity) ELSE 0 END) AS rawTotal,
      SUM(CASE WHEN li.id IS NOT NULL AND po.price_cents IS NULL THEN 1 ELSE 0 END) AS missingCount
    FROM shopping_lists l
    LEFT JOIN list_items li ON li.list_id = l.id
    LEFT JOIN price_observations po ON po.product_id = li.product_id AND po.store_id = l.selected_store_id AND po.source = ?
    GROUP BY l.id
    ORDER BY l.updated_at DESC;
  `, MANUAL_STORE_PRICE_SOURCE);
  return rows.map(({ rawTotal, ...row }) => ({
    ...row,
    isFavorite: Boolean(row.isFavorite),
    totalCents: row.itemCount > 0 && (rawTotal ?? 0) > 0 ? rawTotal : null,
  }));
}

export async function getList(db: SQLiteDatabase, listId: string): Promise<ShoppingList | null> {
  const lists = await getLists(db);
  return lists.find((item) => item.id === listId) ?? null;
}

export async function createList(db: SQLiteDatabase, name: string): Promise<string> {
  const id = makeLocalId("list");
  const now = new Date().toISOString();
  await db.runAsync("INSERT INTO shopping_lists (id, name, created_at, updated_at) VALUES (?, ?, ?, ?);", id, name.trim(), now, now);
  return id;
}

export async function renameList(db: SQLiteDatabase, listId: string, name: string): Promise<void> {
  await db.runAsync("UPDATE shopping_lists SET name = ?, updated_at = ? WHERE id = ?;", name.trim(), new Date().toISOString(), listId);
}

export async function duplicateList(db: SQLiteDatabase, listId: string): Promise<string | null> {
  const source = await db.getFirstAsync<{ name: string; selected_store_id: string | null }>("SELECT name, selected_store_id FROM shopping_lists WHERE id = ?;", listId);
  if (!source) return null;
  const id = makeLocalId("list");
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync("INSERT INTO shopping_lists (id, name, selected_store_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?);", id, `${source.name} (cópia)`, source.selected_store_id, now, now);
    await db.runAsync(
      `INSERT INTO list_items (id, list_id, product_id, quantity, created_at)
       SELECT lower(hex(randomblob(16))), ?, product_id, quantity, ? FROM list_items WHERE list_id = ?;`,
      id,
      now,
      listId,
    );
  });
  return id;
}

export async function deleteList(db: SQLiteDatabase, listId: string): Promise<void> {
  await db.runAsync("DELETE FROM shopping_lists WHERE id = ?;", listId);
}

export async function toggleListFavorite(db: SQLiteDatabase, listId: string): Promise<void> {
  await db.runAsync("UPDATE shopping_lists SET is_favorite = CASE WHEN is_favorite = 0 THEN 1 ELSE 0 END, updated_at = ? WHERE id = ?;", new Date().toISOString(), listId);
}

export async function selectListStore(db: SQLiteDatabase, listId: string, storeId: string | null): Promise<void> {
  await db.runAsync("UPDATE shopping_lists SET selected_store_id = ?, updated_at = ? WHERE id = ?;", storeId, new Date().toISOString(), listId);
}

export async function getListItems(db: SQLiteDatabase, listId: string): Promise<ListItem[]> {
  return db.getAllAsync<ListItem>(`
    SELECT li.id, li.list_id AS listId, li.product_id AS productId, li.quantity, li.created_at AS createdAt,
      p.name AS productName, p.brand, p.size_value AS sizeValue, p.size_unit AS sizeUnit, p.category,
      p.is_favorite AS isFavorite,
      po.price_cents AS priceCents, po.source, po.source_label AS sourceLabel, po.observed_at AS observedAt
    FROM list_items li
    JOIN products p ON p.id = li.product_id
    JOIN shopping_lists l ON l.id = li.list_id
    LEFT JOIN price_observations po ON po.product_id = p.id AND po.store_id = l.selected_store_id AND po.source = ?
    WHERE li.list_id = ?
    ORDER BY li.created_at ASC;
  `, MANUAL_STORE_PRICE_SOURCE, listId).then((rows) => rows.map((row) => ({ ...row, isFavorite: Boolean(row.isFavorite) })));
}

export async function addProductToList(
  db: SQLiteDatabase,
  listId: string,
  draft: { name: string; brand?: string; sizeValue?: number | null; sizeUnit?: MeasurementUnit | null; category?: string; quantity: number },
): Promise<{ productId: string; listItemId: string }> {
  const id = makeLocalId("product");
  const identity = makeProductIdentity({ name: draft.name, brand: draft.brand, sizeValue: draft.sizeValue, sizeUnit: draft.sizeUnit });
  const productKey = makeProductKey({ name: draft.name, brand: draft.brand, sizeValue: draft.sizeValue, sizeUnit: draft.sizeUnit }, id);
  const now = new Date().toISOString();
  let product = identity
    ? await db.getFirstAsync<{ id: string }>("SELECT id FROM products WHERE product_key = ?;", productKey)
    : null;
  if (!product) {
    await db.runAsync(
      `INSERT INTO products (id, name, brand, size_value, size_unit, category, product_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      id,
      draft.name.trim(),
      draft.brand?.trim() || null,
      draft.sizeValue ?? null,
      draft.sizeUnit ?? null,
      draft.category?.trim() || null,
      productKey,
      now,
    );
    product = { id };
  }
  await db.runAsync(
    `INSERT INTO list_items (id, list_id, product_id, quantity, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(list_id, product_id) DO UPDATE SET quantity = list_items.quantity + excluded.quantity;`,
    makeLocalId("item"),
    listId,
    product.id,
    draft.quantity,
    now,
  );
  await db.runAsync("UPDATE shopping_lists SET updated_at = ? WHERE id = ?;", now, listId);
  const listItem = await db.getFirstAsync<{ id: string }>("SELECT id FROM list_items WHERE list_id = ? AND product_id = ?;", listId, product.id);
  return { productId: product.id, listItemId: listItem?.id ?? "" };
}

export async function addExistingProductToList(
  db: SQLiteDatabase,
  listId: string,
  productId: string,
  quantity: number,
): Promise<boolean> {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new RangeError("A quantidade precisa ser maior que zero.");
  const roundedQuantity = Number(quantity.toFixed(3));
  if (roundedQuantity <= 0) throw new RangeError("A quantidade precisa ser maior que zero.");
  const product = await db.getFirstAsync<{ id: string }>("SELECT id FROM products WHERE id = ?;", productId);
  if (!product) return false;

  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO list_items (id, list_id, product_id, quantity, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(list_id, product_id) DO UPDATE SET quantity = list_items.quantity + excluded.quantity;`,
      makeLocalId("item"),
      listId,
      product.id,
      roundedQuantity,
      now,
    );
    await db.runAsync("UPDATE shopping_lists SET updated_at = ? WHERE id = ?;", now, listId);
  });
  return true;
}

export async function changeItemQuantity(db: SQLiteDatabase, listId: string, itemId: string, delta: number): Promise<void> {
  const item = await db.getFirstAsync<{ quantity: number }>("SELECT quantity FROM list_items WHERE id = ? AND list_id = ?;", itemId, listId);
  if (!item) return;
  const next = item.quantity + delta;
  if (next <= 0) {
    await db.runAsync("DELETE FROM list_items WHERE id = ? AND list_id = ?;", itemId, listId);
  } else {
    await db.runAsync("UPDATE list_items SET quantity = ? WHERE id = ? AND list_id = ?;", Number(next.toFixed(3)), itemId, listId);
  }
  await db.runAsync("UPDATE shopping_lists SET updated_at = ? WHERE id = ?;", new Date().toISOString(), listId);
}

export async function getStores(db: SQLiteDatabase, includeInactive = false): Promise<Store[]> {
  const rows = await db.getAllAsync<StoreDbRow>(`
    SELECT id, chain_id AS chainId, chain_name AS chainName, branch_name AS branchName,
      address, city, state, latitude, longitude, source, source_url AS sourceUrl,
      address_verified AS addressVerified, is_favorite AS isFavorite, is_active AS isActive,
      external_store_id AS externalStoreId, created_at AS createdAt
    FROM stores ${includeInactive ? "" : "WHERE is_active = 1"}
    ORDER BY chain_name COLLATE NOCASE, branch_name COLLATE NOCASE;
  `);
  return rows.map((row) => ({
    ...row,
    addressVerified: Boolean(row.addressVerified),
    isFavorite: Boolean(row.isFavorite),
    isActive: Boolean(row.isActive),
  }));
}

export async function createStore(
  db: SQLiteDatabase,
  input: { chainName: string; branchName?: string; address?: string; city?: string; state?: string; latitude?: number | null; longitude?: number | null; source?: string; externalStoreId?: string | null },
): Promise<string> {
  const id = makeLocalId("store");
  const now = new Date().toISOString();
  const verified = input.source === "google-maps" && Boolean(input.address || (input.latitude != null && input.longitude != null));
  await db.runAsync(
    `INSERT INTO stores (id, chain_name, branch_name, address, city, state, latitude, longitude, source, address_verified, external_store_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    id,
    input.chainName.trim(),
    input.branchName?.trim() || null,
    input.address?.trim() || null,
    input.city?.trim() || null,
    input.state?.trim() || null,
    input.latitude ?? null,
    input.longitude ?? null,
    input.source ?? "user-manual",
    Number(verified),
    input.externalStoreId ?? null,
    now,
  );
  return id;
}

export async function toggleStoreFavorite(db: SQLiteDatabase, storeId: string): Promise<void> {
  await db.runAsync("UPDATE stores SET is_favorite = CASE WHEN is_favorite = 0 THEN 1 ELSE 0 END WHERE id = ?;", storeId);
}

export async function toggleProductFavorite(db: SQLiteDatabase, productId: string): Promise<void> {
  await db.runAsync("UPDATE products SET is_favorite = CASE WHEN is_favorite = 0 THEN 1 ELSE 0 END WHERE id = ?;", productId);
}

export async function getProducts(db: SQLiteDatabase, favoritesOnly = false): Promise<Product[]> {
  const rows = await db.getAllAsync<ProductDbRow>(`
    SELECT id, name, brand, size_value AS sizeValue, size_unit AS sizeUnit, category,
      is_favorite AS isFavorite, created_at AS createdAt
    FROM products ${favoritesOnly ? "WHERE is_favorite = 1" : ""}
    ORDER BY name COLLATE NOCASE;
  `);
  return rows.map((row) => ({ ...row, isFavorite: Boolean(row.isFavorite) }));
}

export async function getProduct(db: SQLiteDatabase, productId: string): Promise<Product | null> {
  const row = await db.getFirstAsync<ProductDbRow>(`
    SELECT id, name, brand, size_value AS sizeValue, size_unit AS sizeUnit, category,
      is_favorite AS isFavorite, created_at AS createdAt FROM products WHERE id = ?;
  `, productId);
  return row ? { ...row, isFavorite: Boolean(row.isFavorite) } : null;
}

export async function saveManualPrice(
  db: SQLiteDatabase,
  input: { productId: string; storeId: string; priceCents: number; productName: string; storeName: string },
): Promise<PriceSaveResult> {
  const previous = await db.getFirstAsync<{ id: string; price_cents: number }>(
    "SELECT id, price_cents FROM price_observations WHERE product_id = ? AND store_id = ? AND source = ?;",
    input.productId,
    input.storeId,
    MANUAL_STORE_PRICE_SOURCE,
  );
  const now = new Date().toISOString();
  const sourceLabel = "Informado manualmente pelo usuário";
  const changed = Boolean(previous && previous.price_cents !== input.priceCents);
  const threshold = await db.getFirstAsync<{ enabled: number; threshold_cents: number | null }>("SELECT enabled, threshold_cents FROM alert_preferences WHERE alert_key = 'threshold';");
  const thresholdCents = threshold?.threshold_cents ?? null;
  const thresholdCrossed = crossesPriceThreshold(previous?.price_cents ?? null, input.priceCents, thresholdCents, Boolean(threshold?.enabled));
  const historyId = makeLocalId("history");
  let eventId: string | null = null;
  let thresholdEventId: string | null = null;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO price_observations (id, product_id, store_id, price_cents, currency, source, source_label, observed_at, availability)
       VALUES (?, ?, ?, ?, 'BRL', 'user_manual', ?, ?, 'available')
       ON CONFLICT(product_id, store_id) DO UPDATE SET price_cents = excluded.price_cents,
         source = excluded.source, source_label = excluded.source_label, observed_at = excluded.observed_at, availability = 'available';`,
      previous?.id ?? makeLocalId("price"),
      input.productId,
      input.storeId,
      input.priceCents,
      sourceLabel,
      now,
    );
    if (!previous || changed) {
      await db.runAsync(
        `INSERT INTO price_history (id, product_id, store_id, old_price_cents, new_price_cents, source, source_label, changed_at)
         VALUES (?, ?, ?, ?, ?, 'user_manual', ?, ?);`,
        historyId,
        input.productId,
        input.storeId,
        previous?.price_cents ?? null,
        input.priceCents,
        sourceLabel,
        now,
      );
    }
    if (changed && previous) {
      eventId = makeLocalId("event");
      const direction = input.priceCents < previous.price_cents ? "caiu" : "subiu";
      await db.runAsync(
        `INSERT INTO alert_events (id, product_id, store_id, message, old_price_cents, new_price_cents, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        eventId,
        input.productId,
        input.storeId,
        `O preço informado de ${input.productName} em ${input.storeName} ${direction}.`,
        previous.price_cents,
        input.priceCents,
        now,
      );
    }
    if (thresholdCrossed && thresholdCents != null) {
      thresholdEventId = makeLocalId("event");
      await db.runAsync(
        `INSERT INTO alert_events (id, product_id, store_id, message, old_price_cents, new_price_cents, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        thresholdEventId,
        input.productId,
        input.storeId,
        `${input.productName} em ${input.storeName} chegou ao seu limite de ${formatBRL(thresholdCents)}. Valor informado manualmente.`,
        previous?.price_cents ?? null,
        input.priceCents,
        now,
      );
    }
  });
  return { changed, oldPriceCents: previous?.price_cents ?? null, newPriceCents: input.priceCents, eventId, thresholdEventId, thresholdCrossed, thresholdCents };
}

export async function getPriceHistory(db: SQLiteDatabase, productId: string): Promise<PriceHistoryItem[]> {
  return db.getAllAsync<PriceHistoryItem>(`
    SELECT h.id, h.old_price_cents AS oldPriceCents, h.new_price_cents AS newPriceCents,
      h.changed_at AS changedAt, h.source_label AS sourceLabel,
      s.chain_name AS storeName, s.branch_name AS branchName
    FROM price_history h JOIN stores s ON s.id = h.store_id
    WHERE h.product_id = ? AND h.source = ? ORDER BY h.changed_at DESC;
  `, productId, MANUAL_STORE_PRICE_SOURCE);
}

export async function getProductPriceRows(db: SQLiteDatabase, productId: string): Promise<Array<{ storeId: string; storeName: string; branchName: string | null; priceCents: number; sourceLabel: string; observedAt: string }>> {
  return db.getAllAsync(`
    SELECT po.store_id AS storeId, s.chain_name AS storeName, s.branch_name AS branchName,
      po.price_cents AS priceCents, po.source_label AS sourceLabel, po.observed_at AS observedAt
    FROM price_observations po JOIN stores s ON s.id = po.store_id
    WHERE po.product_id = ? AND po.source = ? ORDER BY po.price_cents ASC;
  `, productId, MANUAL_STORE_PRICE_SOURCE);
}

export async function getListComparisonData(db: SQLiteDatabase, listId: string): Promise<{
  listName: string;
  items: Array<{ productId: string; quantity: number; productName: string; sizeValue: number | null; sizeUnit: MeasurementUnit | null }>;
  stores: Store[];
  prices: Map<string, StorePrice>;
} | null> {
  const list = await db.getFirstAsync<{ name: string }>("SELECT name FROM shopping_lists WHERE id = ?;", listId);
  if (!list) return null;
  const items = await db.getAllAsync<{ productId: string; quantity: number; productName: string; sizeValue: number | null; sizeUnit: MeasurementUnit | null }>(`
    SELECT li.product_id AS productId, li.quantity, p.name AS productName, p.size_value AS sizeValue, p.size_unit AS sizeUnit
    FROM list_items li JOIN products p ON p.id = li.product_id WHERE li.list_id = ? ORDER BY p.name COLLATE NOCASE;
  `, listId);
  const stores = await getStores(db);
  const priceRows = await db.getAllAsync<{ storeId: string; productId: string; priceCents: number; source: string }>(`
    SELECT po.store_id AS storeId, po.product_id AS productId, po.price_cents AS priceCents, po.source AS source
    FROM price_observations po JOIN list_items li ON li.product_id = po.product_id
    WHERE li.list_id = ? AND po.source = ?;
  `, listId, MANUAL_STORE_PRICE_SOURCE);
  const prices = new Map<string, StorePrice>();
  for (const row of priceRows) {
    if (isComparableStorePriceSource(row.source)) {
      prices.set(`${row.storeId}:${row.productId}`, { priceCents: row.priceCents, source: row.source });
    }
  }
  return { listName: list.name, items, stores, prices };
}

export async function getPriceEvents(db: SQLiteDatabase): Promise<PriceEvent[]> {
  const rows = await db.getAllAsync<PriceEventDbRow>(`
    SELECT id, product_id AS productId, store_id AS storeId, message,
      old_price_cents AS oldPriceCents, new_price_cents AS newPriceCents,
      created_at AS createdAt, is_read AS isRead
    FROM alert_events ORDER BY created_at DESC;
  `);
  return rows.map((row) => ({ ...row, isRead: Boolean(row.isRead) }));
}

export async function markPriceEventRead(db: SQLiteDatabase, eventId: string): Promise<void> {
  await db.runAsync("UPDATE alert_events SET is_read = 1 WHERE id = ?;", eventId);
}

export async function getAlertPreferences(db: SQLiteDatabase): Promise<AlertPreference[]> {
  const rows = await db.getAllAsync<AlertPreferenceDbRow>("SELECT alert_key AS key, enabled, threshold_cents AS thresholdCents FROM alert_preferences ORDER BY alert_key;");
  return rows.map((row) => ({ ...row, enabled: Boolean(row.enabled) }));
}

export async function setAlertPreference(db: SQLiteDatabase, key: AlertKey, enabled: boolean, thresholdCents?: number | null): Promise<void> {
  await db.runAsync("UPDATE alert_preferences SET enabled = ?, threshold_cents = COALESCE(?, threshold_cents) WHERE alert_key = ?;", Number(enabled), thresholdCents ?? null, key);
}

export async function getRecommendationPreference(db: SQLiteDatabase): Promise<"lowestPrice" | "closest" | "balanced"> {
  const row = await db.getFirstAsync<{ setting_value: string }>("SELECT setting_value FROM app_settings WHERE setting_key = 'recommendation';");
  if (row?.setting_value === "lowestPrice" || row?.setting_value === "closest") return row.setting_value;
  return "balanced";
}

export async function setRecommendationPreference(db: SQLiteDatabase, preference: "lowestPrice" | "closest" | "balanced"): Promise<void> {
  await db.runAsync("INSERT INTO app_settings (setting_key, setting_value) VALUES ('recommendation', ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value;", preference);
}

export async function getFavoriteLists(db: SQLiteDatabase): Promise<ShoppingList[]> {
  const lists = await getLists(db);
  return lists.filter((list) => list.isFavorite);
}

export async function getFavoriteStores(db: SQLiteDatabase): Promise<Store[]> {
  const stores = await getStores(db);
  return stores.filter((store) => store.isFavorite);
}

export async function getUserEnteredPriceCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM price_observations WHERE source = 'user_manual';");
  return row?.count ?? 0;
}

export function buildStoreName(store: Pick<Store, "chainName" | "branchName">): string {
  return store.branchName ? `${store.chainName} — ${store.branchName}` : store.chainName;
}

export function isSuperLunaStore(store: Pick<Store, "chainId" | "chainName">): boolean {
  return store.chainId === "superluna-public-index" || normalizeText(store.chainName).includes("superluna");
}

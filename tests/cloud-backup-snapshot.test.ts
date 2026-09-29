import { describe, expect, it } from "vitest";
import { parseCloudBackupSnapshot } from "../lib/cloud-backup-snapshot";

const validSnapshot = {
  schemaVersion: 1,
  createdAt: "2026-09-29T03:00:00.000Z",
  tables: {
    stores: [],
    shopping_lists: [],
    products: [],
    list_items: [],
    price_observations: [],
    price_history: [],
    alert_preferences: [],
    alert_events: [],
    app_settings: [],
  },
};

describe("cloud-backup snapshot validation", () => {
  it("accepts an empty, versioned snapshot", () => {
    expect(parseCloudBackupSnapshot(validSnapshot)).toEqual(validSnapshot);
  });

  it("rejects unsupported schema versions and unexpected plaintext fields", () => {
    expect(() => parseCloudBackupSnapshot({ ...validSnapshot, schemaVersion: 2 })).toThrow();
    expect(() => parseCloudBackupSnapshot({ ...validSnapshot, accountEmail: "person@example.test" })).toThrow();
  });

  it("rejects duplicate identifiers before database replacement", () => {
    const product = {
      id: "p1", name: "Arroz", brand: null, size_value: 1, size_unit: "kg", category: null,
      product_key: "arroz-1kg", is_favorite: 0, created_at: "2026-09-29T03:00:00.000Z",
    };
    const snapshot = {
      ...validSnapshot,
      tables: { ...validSnapshot.tables, products: [product, product] },
    };
    expect(() => parseCloudBackupSnapshot(snapshot)).toThrow(/duplicados/i);
  });

  it("rejects rows with missing foreign-key parents", () => {
    const snapshot = {
      ...validSnapshot,
      tables: {
        ...validSnapshot.tables,
        list_items: [{ id: "i1", list_id: "missing-list", product_id: "missing-product", quantity: 1, created_at: "2026-09-29T03:00:00.000Z" }],
      },
    };
    expect(() => parseCloudBackupSnapshot(snapshot)).toThrow(/lista ou produto inexistente/i);
  });

  it("accepts optional barcode and image/price cache metadata in encrypted snapshots", () => {
    const product = {
      id: "p1", name: "Arroz Integral", brand: "Marca X", description: "Embalagem de 1 kg",
      size_value: 1, size_unit: "kg", category: "Mercearia", barcode: "4006381333931",
      image_url: "https://images.example.test/rice.jpg", image_source: "https://catalog.example.test/item/1",
      image_rights_verified: 1, metadata_source: "authorized-catalog", last_lookup_at: "2026-09-29T03:00:00.000Z",
      cache_expires_at: "2026-10-01T03:00:00.000Z", reference_price_cents: 2436, lowest_price_cents: 2290,
      highest_price_cents: 2590, price_source_count: 3, price_searched_at: "2026-09-29T03:00:00.000Z",
      product_key: "barcode:4006381333931", is_favorite: 0, created_at: "2026-09-29T03:00:00.000Z",
    };
    const snapshot = { ...validSnapshot, tables: { ...validSnapshot.tables, products: [product] } };
    expect(parseCloudBackupSnapshot(snapshot).tables.products[0]).toMatchObject({
      barcode: "4006381333931",
      image_rights_verified: 1,
      reference_price_cents: 2436,
    });
  });

  it("rejects an invalid EAN in the encrypted product snapshot", () => {
    const product = {
      id: "p1", name: "Arroz", brand: null, size_value: 1, size_unit: "kg", category: null,
      barcode: "4006381333932", product_key: "arroz-1kg", is_favorite: 0,
      created_at: "2026-09-29T03:00:00.000Z",
    };
    const snapshot = { ...validSnapshot, tables: { ...validSnapshot.tables, products: [product] } };
    expect(() => parseCloudBackupSnapshot(snapshot)).toThrow();
  });
});

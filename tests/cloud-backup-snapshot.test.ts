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
});

import type { SQLiteDatabase } from "expo-sqlite";
import { describe, expect, it } from "vitest";
import { addExistingProductToList, getListComparisonData } from "../lib/local-db";

function makeDatabase(productId: string | null) {
  const statements: Array<{ sql: string; parameters: unknown[] }> = [];
  let transactionCount = 0;
  const db = {
    getFirstAsync: async () => productId ? { id: productId } : null,
    withTransactionAsync: async (callback: () => Promise<void>) => {
      transactionCount += 1;
      await callback();
    },
    runAsync: async (sql: string, ...parameters: unknown[]) => {
      statements.push({ sql, parameters });
      return { changes: 1, lastInsertRowId: 1 };
    },
  } as unknown as SQLiteDatabase;
  return { db, statements, getTransactionCount: () => transactionCount };
}

describe("add existing local catalog products to a shopping list", () => {
  it("reuses the stored product ID and increments its list quantity in a transaction", async () => {
    const { db, statements, getTransactionCount } = makeDatabase("product-123");

    await expect(addExistingProductToList(db, "list-456", "product-123", 1.5)).resolves.toBe(true);

    expect(getTransactionCount()).toBe(1);
    expect(statements).toHaveLength(2);
    expect(statements[0].sql).toContain("ON CONFLICT(list_id, product_id) DO UPDATE");
    expect(statements[0].parameters).toContain("list-456");
    expect(statements[0].parameters).toContain("product-123");
    expect(statements[0].parameters).toContain(1.5);
    expect(statements[1].sql).toContain("UPDATE shopping_lists SET updated_at");
  });

  it("does not create a list row when the selected local product no longer exists", async () => {
    const { db, statements, getTransactionCount } = makeDatabase(null);

    await expect(addExistingProductToList(db, "list-456", "missing-product", 1)).resolves.toBe(false);

    expect(statements).toHaveLength(0);
    expect(getTransactionCount()).toBe(0);
  });

  it("rejects zero, negative or non-finite quantities before database writes", async () => {
    const { db, statements } = makeDatabase("product-123");

    await expect(addExistingProductToList(db, "list-456", "product-123", 0)).rejects.toBeInstanceOf(RangeError);
    await expect(addExistingProductToList(db, "list-456", "product-123", -1)).rejects.toBeInstanceOf(RangeError);
    await expect(addExistingProductToList(db, "list-456", "product-123", Number.NaN)).rejects.toBeInstanceOf(RangeError);
    expect(statements).toHaveLength(0);
  });
});

describe("store comparison provenance", () => {
  it("passes only user-entered supermarket prices even if a marketplace row is returned by a mocked database", async () => {
    const capturedQueries: Array<{ sql: string; parameters: unknown[] }> = [];
    const db = {
      getFirstAsync: async () => ({ name: "Minha lista" }),
      getAllAsync: async (sql: string, ...parameters: unknown[]) => {
        capturedQueries.push({ sql, parameters });
        if (sql.includes("FROM list_items li JOIN products p")) {
          return [{ productId: "rice", quantity: 1, productName: "Arroz", sizeValue: 1, sizeUnit: "kg" }];
        }
        if (sql.includes("FROM stores")) {
          return [{
            id: "store-1", chainId: null, chainName: "Mercado Local", branchName: null,
            address: null, city: null, state: null, latitude: null, longitude: null,
            source: "user-manual", sourceUrl: null, addressVerified: 0, isFavorite: 0,
            isActive: 1, externalStoreId: null, createdAt: "2026-09-29T00:00:00.000Z",
          }];
        }
        if (sql.includes("FROM price_observations po JOIN list_items li")) {
          return [
            { storeId: "store-1", productId: "rice", priceCents: 1200, source: "user_manual" },
            { storeId: "store-1", productId: "rice", priceCents: 100, source: "marketplace_reference" },
          ];
        }
        return [];
      },
    } as unknown as SQLiteDatabase;

    const data = await getListComparisonData(db, "list-1");
    expect(data?.prices).toEqual(new Map([
      ["store-1:rice", { priceCents: 1200, source: "user_manual" }],
    ]));
    const priceQuery = capturedQueries.find(({ sql }) => sql.includes("FROM price_observations po JOIN list_items li"));
    expect(priceQuery?.sql).toContain("po.source = ?");
    expect(priceQuery?.parameters).toEqual(["list-1", "user_manual"]);
  });
});

import type { SQLiteDatabase } from "expo-sqlite";
import { describe, expect, it } from "vitest";
import { addExistingProductToList } from "../lib/local-db";

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

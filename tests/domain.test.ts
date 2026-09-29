import { describe, expect, it } from "vitest";
import {
  calculateSubtotal,
  compareStores,
  crossesPriceThreshold,
  formatBRL,
  haversineKm,
  isPriceStale,
  makeProductIdentity,
  parseBRLToCents,
  recommendStore,
} from "../lib/domain";

describe("CompraFácil local shopping rules", () => {
  it("parses Brazilian currency to centavos and rejects invalid prices", () => {
    expect(parseBRLToCents("R$ 1.234,56")).toBe(123456);
    expect(parseBRLToCents("12,90")).toBe(1290);
    expect(parseBRLToCents("0")).toBeNull();
    expect(parseBRLToCents("-5,00")).toBeNull();
    expect(formatBRL(1290)).toContain("12,90");
  });

  it("alerts only when an enabled manual price first reaches or crosses its threshold", () => {
    expect(crossesPriceThreshold(null, 1900, 2000, true)).toBe(true);
    expect(crossesPriceThreshold(2500, 2000, 2000, true)).toBe(true);
    expect(crossesPriceThreshold(1900, 1500, 2000, true)).toBe(false);
    expect(crossesPriceThreshold(2500, 2100, 2000, true)).toBe(false);
    expect(crossesPriceThreshold(null, 1900, 2000, false)).toBe(false);
  });

  it("never identifies package sizes that differ, while normalizing equivalent units", () => {
    const rice1kg = makeProductIdentity({ name: "Arroz", brand: "Marca X", sizeValue: 1, sizeUnit: "kg" });
    const rice5kg = makeProductIdentity({ name: "Arroz", brand: "Marca X", sizeValue: 5, sizeUnit: "kg" });
    const rice1000g = makeProductIdentity({ name: "arroz", brand: "Marca X", sizeValue: 1000, sizeUnit: "g" });
    expect(rice1kg).not.toBe(rice5kg);
    expect(rice1kg).toBe(rice1000g);
    expect(makeProductIdentity({ name: "Arroz", brand: "Marca X" })).toBeNull();
  });

  it("excludes unpriced products from totals and counts them as missing", () => {
    expect(calculateSubtotal([
      { productId: "a", quantity: 2, priceCents: 599 },
      { productId: "b", quantity: 1, priceCents: null },
    ])).toEqual({ totalCents: 1198, pricedCount: 1, missingCount: 1 });
  });

  it("compares only recorded offers and prioritizes complete totals", () => {
    const comparisons = compareStores(
      [{ productId: "a", quantity: 1 }, { productId: "b", quantity: 2 }],
      [{ id: "one", name: "Loja 1" }, { id: "two", name: "Loja 2" }],
      new Map([
        ["one:a", { priceCents: 100, source: "user_manual" }],
        ["one:b", { priceCents: 200, source: "user_manual" }],
        ["two:a", { priceCents: 80, source: "user_manual" }],
        ["two:b", { priceCents: 1, source: "marketplace_reference" }],
      ]),
    );
    expect(comparisons).toEqual([
      { storeId: "one", storeName: "Loja 1", totalCents: 500, pricedCount: 2, missingCount: 0 },
      { storeId: "two", storeName: "Loja 2", totalCents: 80, pricedCount: 1, missingCount: 1 },
    ]);
    expect(recommendStore(comparisons, new Map(), "lowestPrice")?.storeId).toBe("one");
  });

  it("balances a small price premium against distance without hiding a large price gap", () => {
    const cheap = { storeId: "far-cheap", storeName: "Mais barata", totalCents: 10000, pricedCount: 2, missingCount: 0 };
    const nearSmallGap = { storeId: "near-small", storeName: "Mais perto", totalCents: 10400, pricedCount: 2, missingCount: 0 };
    const distances = new Map([["far-cheap", 8], ["near-small", 2]]);
    const smallGap = recommendStore([cheap, nearSmallGap], distances, "balanced");
    expect(smallGap?.storeId).toBe("near-small");
    expect(smallGap?.reason).toContain("inferior a 5%");

    const nearLargeGap = { ...nearSmallGap, storeId: "near-large", totalCents: 11000 };
    const largeGap = recommendStore([cheap, nearLargeGap], new Map([["far-cheap", 8], ["near-large", 2]]), "balanced");
    expect(largeGap?.storeId).toBe("far-cheap");
    expect(largeGap?.reason).toContain("Maior economia registrada");
  });

  it("computes real distances and flags observations older than 30 days", () => {
    expect(haversineKm({ latitude: -23.55, longitude: -46.63 }, { latitude: -23.56, longitude: -46.64 })).toBeGreaterThan(1);
    const now = Date.parse("2026-09-28T12:00:00Z");
    expect(isPriceStale("2026-09-01T12:00:00Z", now)).toBe(false);
    expect(isPriceStale("2026-08-01T12:00:00Z", now)).toBe(true);
  });
});

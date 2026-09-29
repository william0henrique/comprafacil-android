import { describe, expect, it } from "vitest";
import { aggregateProductPrices, trimmedMeanCents, type ProductPriceOffer } from "../lib/barcode/price-aggregator";

const expected = {
  id: "rice-1kg",
  barcode: "4006381333931",
  name: "Arroz Integral",
  brand: "Marca X",
  sizeValue: 1,
  sizeUnit: "kg" as const,
};

function offer(overrides: Partial<ProductPriceOffer> & Pick<ProductPriceOffer, "priceCents" | "sourceGroup">): ProductPriceOffer {
  return {
    productId: expected.id,
    matchMethod: "local-product-record",
    product: {
      barcode: expected.barcode,
      name: expected.name,
      brand: expected.brand,
      sizeValue: expected.sizeValue,
      sizeUnit: expected.sizeUnit,
    },
    sourceLabel: "Preço informado manualmente",
    observedAt: "2026-09-29T12:00:00.000Z",
    storeId: "store-1",
    storeName: "Mercado Local",
    ...overrides,
  };
}

describe("source-aware product price aggregation", () => {
  it("keeps manual and marketplace groups separate and applies the accepted 70/30 reference", () => {
    const offers = [
      offer({ priceCents: 1000, sourceGroup: "primary", storeId: "s1", storeName: "Loja A" }),
      offer({ priceCents: 2000, sourceGroup: "primary", storeId: "s2", storeName: "Loja B" }),
      offer({ priceCents: 3000, sourceGroup: "marketplace", matchMethod: "catalog-metadata", storeId: null, storeName: "Mercado Livre" }),
      offer({ priceCents: 4000, sourceGroup: "marketplace", matchMethod: "catalog-metadata", storeId: null, storeName: "Mercado Livre" }),
    ];
    const summary = aggregateProductPrices(expected, offers, "2026-09-29T12:01:00.000Z");
    expect(summary).toMatchObject({
      averagePriceCents: 2500,
      lowestPriceCents: 1000,
      highestPriceCents: 4000,
      sourceCount: 4,
      primaryCount: 2,
      marketplaceCount: 2,
      referencePriceCents: 2100,
    });
    expect(summary.offers.filter((item) => item.sourceGroup === "primary")).toHaveLength(2);
    expect(summary.offers.filter((item) => item.sourceGroup === "marketplace")).toHaveLength(2);
  });

  it("rejects incompatible catalog metadata even when a candidate has the same local product ID", () => {
    const wrongSize = offer({
      priceCents: 900,
      sourceGroup: "marketplace",
      matchMethod: "catalog-metadata",
      product: { barcode: expected.barcode, name: expected.name, brand: expected.brand, sizeValue: 5, sizeUnit: "kg" },
    });
    const summary = aggregateProductPrices(expected, [wrongSize]);
    expect(summary.sourceCount).toBe(0);
    expect(summary.referencePriceCents).toBeNull();
  });

  it("uses the primary-group mean when no marketplace source is authorized or available", () => {
    const summary = aggregateProductPrices(expected, [
      offer({ priceCents: 1200, sourceGroup: "primary" }),
      offer({ priceCents: 1400, sourceGroup: "primary", storeId: "s2" }),
    ]);
    expect(summary.referencePriceCents).toBe(1300);
    expect(summary.marketplaceCount).toBe(0);
  });

  it("trims tails for ten or more marketplace observations but does not trim small samples", () => {
    expect(trimmedMeanCents([100, 200, 300])).toBe(200);
    expect(trimmedMeanCents([1, 2, 3, 4, 5, 6, 7, 8, 9, 100])).toBe(6);
  });
});

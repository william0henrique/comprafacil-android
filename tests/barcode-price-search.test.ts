import type { SQLiteDatabase } from "expo-sqlite";
import { describe, expect, it, vi } from "vitest";
import type { Product } from "../lib/local-db";

const query = vi.hoisted(() => ({ getProductPriceRows: vi.fn() }));
vi.mock("../lib/local-db", () => ({ getProductPriceRows: query.getProductPriceRows }));
vi.mock("../lib/price-provider", () => ({ activePriceProviders: [] }));
vi.mock("../lib/marketplace-provider", () => ({ activeMarketplaceProviders: [] }));

import { searchProductPrices } from "../lib/barcode/price-search-service";

const product = {
  id: "local-product-1",
  name: "Feijão",
  brand: null,
  barcode: "4006381333931",
  sizeValue: null,
  sizeUnit: null,
} as Product;

describe("barcode-triggered price search", () => {
  it("reads only manually saved prices for the same local product and keeps missing data explicit", async () => {
    query.getProductPriceRows.mockResolvedValue([{
      storeId: "store-1",
      storeName: "Mercado Local",
      branchName: "Centro",
      priceCents: 1200,
      sourceLabel: "Informado manualmente pelo usuário",
      observedAt: "2026-09-29T12:00:00.000Z",
    }]);
    const result = await searchProductPrices({} as SQLiteDatabase, product);
    expect(query.getProductPriceRows).toHaveBeenCalledWith({}, product.id);
    expect(result.offers).toHaveLength(1);
    expect(result.offers[0]).toMatchObject({
      productId: product.id,
      matchMethod: "local-product-record",
      sourceGroup: "primary",
      storeName: "Mercado Local — Centro",
      priceCents: 1200,
    });
    expect(result.activeSupermarketProviderCount).toBe(0);
    expect(result.activeMarketplaceProviderCount).toBe(0);
  });
});

import type { SQLiteDatabase } from "expo-sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "../lib/local-db";

const cache = vi.hoisted(() => ({
  findCachedProduct: vi.fn(),
  isProductCacheFresh: vi.fn(),
  recordLocalLookup: vi.fn(),
}));

vi.mock("../lib/barcode/product-cache", () => ({
  findCachedProduct: cache.findCachedProduct,
  isProductCacheFresh: cache.isProductCacheFresh,
  recordLocalLookup: cache.recordLocalLookup,
}));

import { lookupProductByBarcode } from "../lib/barcode/product-lookup";
import { activeProductProviders } from "../lib/barcode/product-provider";

const db = {} as SQLiteDatabase;
const localProduct = {
  id: "rice-1kg",
  name: "Arroz Integral",
  brand: "Marca X",
  description: null,
  sizeValue: 1,
  sizeUnit: "kg",
  category: "Mercearia",
  barcode: "4006381333931",
  imageUrl: null,
  imageSource: null,
  imageRightsVerified: false,
  metadataSource: "manual-local",
  lastLookupAt: null,
  cacheExpiresAt: null,
  referencePriceCents: null,
  lowestPriceCents: null,
  highestPriceCents: null,
  priceSourceCount: 0,
  priceSearchedAt: null,
  isFavorite: false,
  createdAt: "2026-09-29T12:00:00.000Z",
} as Product;

describe("local barcode lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cache.findCachedProduct.mockResolvedValue(null);
    cache.isProductCacheFresh.mockReturnValue(false);
    cache.recordLocalLookup.mockResolvedValue(undefined);
  });

  it("rejects an invalid check digit without touching the database", async () => {
    await expect(lookupProductByBarcode(db, "4006381333932")).resolves.toMatchObject({ status: "invalid-code" });
    expect(cache.findCachedProduct).not.toHaveBeenCalled();
  });

  it("reuses the exact local barcode match and records the lookup timestamp", async () => {
    cache.findCachedProduct.mockResolvedValue(localProduct);
    cache.isProductCacheFresh.mockReturnValue(true);
    const result = await lookupProductByBarcode(db, "4006381333931", new Date("2026-09-29T12:30:00.000Z"));
    expect(result).toMatchObject({ status: "found", barcode: localProduct.barcode, cacheFresh: true, sourceLabel: "Catálogo local · cadastro manual" });
    expect(cache.recordLocalLookup).toHaveBeenCalledWith(db, localProduct.id, "2026-09-29T12:30:00.000Z");
  });

  it("fails closed for a valid code absent from local cache while no external providers are active", async () => {
    const result = await lookupProductByBarcode(db, "4006381333931");
    expect(result).toMatchObject({ status: "not-found", barcode: "4006381333931", externalLookupEnabled: false });
    expect(activeProductProviders).toEqual([]);
    expect(cache.findCachedProduct).toHaveBeenCalledOnce();
  });
});

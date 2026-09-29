import type { SQLiteDatabase } from "expo-sqlite";
import { getProductByBarcode, updateProductLookupAt, updateProductPriceCache, type Product } from "../local-db";
import type { ProductPriceSummary } from "./price-aggregator";

export async function findCachedProduct(db: SQLiteDatabase, barcode: string): Promise<Product | null> {
  return getProductByBarcode(db, barcode);
}

export function isProductCacheFresh(product: Product, now = Date.now()): boolean {
  if (!product.cacheExpiresAt) return true;
  const expiry = Date.parse(product.cacheExpiresAt);
  return Number.isFinite(expiry) && expiry > now;
}

export async function recordLocalLookup(db: SQLiteDatabase, productId: string, lookedUpAt: string): Promise<void> {
  await updateProductLookupAt(db, productId, lookedUpAt);
}

export async function cachePriceSummary(db: SQLiteDatabase, productId: string, summary: ProductPriceSummary): Promise<void> {
  await updateProductPriceCache(db, productId, {
    referencePriceCents: summary.referencePriceCents,
    lowestPriceCents: summary.lowestPriceCents,
    highestPriceCents: summary.highestPriceCents,
    sourceCount: summary.sourceCount,
    searchedAt: summary.searchedAt,
  });
}

import type { SQLiteDatabase } from "expo-sqlite";
import type { Product } from "../local-db";
import { normalizeGtin } from "./product-matcher";
import { findCachedProduct, isProductCacheFresh, recordLocalLookup } from "./product-cache";
import { activeProductProviders } from "./product-provider";

export type ProductLookupResult =
  | { status: "found"; barcode: string; product: Product; cacheFresh: boolean; lookedUpAt: string; sourceLabel: string }
  | { status: "not-found"; barcode: string; lookedUpAt: string; externalLookupEnabled: false }
  | { status: "invalid-code"; rawCode: string };

export async function lookupProductByBarcode(db: SQLiteDatabase, rawCode: string, now = new Date()): Promise<ProductLookupResult> {
  const barcode = normalizeGtin(rawCode);
  if (!barcode) return { status: "invalid-code", rawCode };

  const lookedUpAt = now.toISOString();
  const cached = await findCachedProduct(db, barcode);
  if (cached) {
    const cacheFresh = isProductCacheFresh(cached, now.getTime());
    await recordLocalLookup(db, cached.id, lookedUpAt);
    return {
      status: "found",
      barcode,
      product: { ...cached, lastLookupAt: lookedUpAt },
      cacheFresh,
      lookedUpAt,
      sourceLabel: cached.metadataSource === "manual-local" ? "Catálogo local · cadastro manual" : cached.metadataSource ?? "Cache local",
    };
  }

  // The provider array is empty until legal rights for query/cache/display are confirmed.
  // Keep this branch explicit so an unreviewed endpoint cannot silently become a fallback.
  if (activeProductProviders.length === 0) {
    return { status: "not-found", barcode, lookedUpAt, externalLookupEnabled: false };
  }

  // Provider adapters are deliberately not invoked from the Android client. They must be implemented
  // in the authorized integration layer after the provider's full rights and credential contract is reviewed.
  return { status: "not-found", barcode, lookedUpAt, externalLookupEnabled: false };
}

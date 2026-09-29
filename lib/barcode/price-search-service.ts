import type { SQLiteDatabase } from "expo-sqlite";
import type { Product } from "../local-db";
import { getProductPriceRows } from "../local-db";
import { activeMarketplaceProviders } from "../marketplace-provider";
import { activePriceProviders } from "../price-provider";
import type { ProductPriceOffer } from "./price-aggregator";

export type PriceSearchResult = {
  offers: ProductPriceOffer[];
  searchedAt: string;
  activeSupermarketProviderCount: number;
  activeMarketplaceProviderCount: number;
};

/** Reads only prices the person previously entered locally. No external provider is currently authorized. */
export async function searchProductPrices(db: SQLiteDatabase, product: Product): Promise<PriceSearchResult> {
  const searchedAt = new Date().toISOString();
  const rows = await getProductPriceRows(db, product.id);
  const descriptor = {
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    sizeValue: product.sizeValue,
    sizeUnit: product.sizeUnit,
  };
  const offers: ProductPriceOffer[] = rows.map((row) => ({
    productId: product.id,
    matchMethod: "local-product-record",
    product: descriptor,
    priceCents: row.priceCents,
    sourceGroup: "primary" as const,
    sourceLabel: row.sourceLabel,
    observedAt: row.observedAt,
    storeId: row.storeId,
    storeName: row.branchName ? `${row.storeName} — ${row.branchName}` : row.storeName,
  }));

  // These gates are intentionally empty until rights for lookup/cache/display are documented.
  return {
    offers,
    searchedAt,
    activeSupermarketProviderCount: activePriceProviders.length,
    activeMarketplaceProviderCount: activeMarketplaceProviders.length,
  };
}

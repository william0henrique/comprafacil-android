import { isEligiblePriceMatch, type ProductDescriptor } from "./product-matcher";

export type PriceSourceGroup = "primary" | "marketplace";

export type ProductPriceOffer = {
  productId: string;
  matchMethod: "local-product-record" | "catalog-metadata";
  product: ProductDescriptor;
  priceCents: number;
  sourceGroup: PriceSourceGroup;
  sourceLabel: string;
  observedAt: string;
  storeId: string | null;
  storeName: string | null;
};

export type ProductPriceSummary = {
  averagePriceCents: number | null;
  lowestPriceCents: number | null;
  highestPriceCents: number | null;
  sourceCount: number;
  primaryCount: number;
  marketplaceCount: number;
  referencePriceCents: number | null;
  searchedAt: string;
  offers: ProductPriceOffer[];
};

function meanCents(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** A 10% two-tail trim; datasets smaller than ten retain all observations. */
export function trimmedMeanCents(values: number[], trimFraction = 0.1): number | null {
  if (!values.length || trimFraction < 0 || trimFraction >= 0.5) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const trimCount = ordered.length >= 10 ? Math.floor(ordered.length * trimFraction) : 0;
  return meanCents(ordered.slice(trimCount, ordered.length - trimCount));
}

export function aggregateProductPrices(
  expectedProduct: ProductDescriptor & { id?: string },
  rawOffers: ProductPriceOffer[],
  searchedAt = new Date().toISOString(),
): ProductPriceSummary {
  const offers = rawOffers.filter((offer) =>
    Number.isInteger(offer.priceCents) && offer.priceCents > 0 &&
    (offer.matchMethod === "local-product-record" && Boolean(expectedProduct.id && offer.productId === expectedProduct.id)) ||
    (offer.matchMethod === "catalog-metadata" && isEligiblePriceMatch(expectedProduct, offer.product)),
  );
  const prices = offers.map((offer) => offer.priceCents);
  const primary = offers.filter((offer) => offer.sourceGroup === "primary").map((offer) => offer.priceCents);
  const marketplace = offers.filter((offer) => offer.sourceGroup === "marketplace").map((offer) => offer.priceCents);
  const primaryAverage = meanCents(primary);
  const marketplaceTrimmedAverage = trimmedMeanCents(marketplace);

  let referencePriceCents: number | null = null;
  if (primaryAverage != null && marketplaceTrimmedAverage != null) {
    referencePriceCents = Math.round(primaryAverage * 0.7 + marketplaceTrimmedAverage * 0.3);
  } else {
    // When only one authorized source group exists, use that group's own summary without fabricating a missing group.
    referencePriceCents = primaryAverage ?? marketplaceTrimmedAverage;
  }

  return {
    averagePriceCents: meanCents(prices),
    lowestPriceCents: prices.length ? Math.min(...prices) : null,
    highestPriceCents: prices.length ? Math.max(...prices) : null,
    sourceCount: offers.length,
    primaryCount: primary.length,
    marketplaceCount: marketplace.length,
    referencePriceCents,
    searchedAt,
    offers,
  };
}

export const REQUIRED_PRODUCT_PROVIDER_OPERATIONS = [
  "barcode_lookup",
  "metadata_cache",
  "metadata_display",
] as const;

export type ProductProviderOperation = typeof REQUIRED_PRODUCT_PROVIDER_OPERATIONS[number] | "product_image_display";

export type ProductProviderAuthorization = {
  evidenceUrl: string;
  reviewedAt: string;
  permittedOperations: readonly ProductProviderOperation[];
  cacheTtlDays: number;
  attribution?: string;
  imageRightsConfirmed: boolean;
};

export type ProductLookupRecord = {
  barcode: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  category?: string | null;
  sizeValue?: number | null;
  sizeUnit?: "kg" | "g" | "l" | "ml" | "un" | null;
  imageUrl?: string | null;
  imageSourceUrl?: string | null;
};

export type AuthorizedProductProvider = {
  providerId: string;
  authorization: ProductProviderAuthorization;
  lookupByBarcode: (barcode: string) => Promise<ProductLookupRecord | null>;
};

const MAX_PRODUCT_CACHE_TTL_DAYS = 90;

/** HTTPS evidence, all required rights, bounded cache lifetime and a real lookup method are mandatory. */
export function hasValidProductProviderAuthorization(provider: AuthorizedProductProvider): boolean {
  const evidence = provider.authorization;
  let url: URL;
  try {
    url = new URL(evidence.evidenceUrl);
  } catch {
    return false;
  }
  const reviewedAt = Date.parse(evidence.reviewedAt);
  const permitted = new Set(evidence.permittedOperations);
  return Boolean(
    provider.providerId.trim() &&
      url.protocol === "https:" &&
      Number.isFinite(reviewedAt) &&
      reviewedAt <= Date.now() &&
      Number.isFinite(evidence.cacheTtlDays) && evidence.cacheTtlDays > 0 && evidence.cacheTtlDays <= MAX_PRODUCT_CACHE_TTL_DAYS &&
      REQUIRED_PRODUCT_PROVIDER_OPERATIONS.every((operation) => permitted.has(operation)) &&
      permitted.size === evidence.permittedOperations.length &&
      (!permitted.has("product_image_display") || evidence.imageRightsConfirmed),
  );
}

/** No catalog source currently has confirmed rights for this app; do not make network lookups. */
const productProviderCandidates: readonly AuthorizedProductProvider[] = [];
export const activeProductProviders: readonly AuthorizedProductProvider[] = Object.freeze(
  productProviderCandidates.filter(hasValidProductProviderAuthorization),
);

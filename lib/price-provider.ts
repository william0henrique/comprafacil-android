import type { MeasurementUnit } from "@/lib/domain";

export type PriceProviderOperation = "branches" | "categories" | "catalog" | "prices";

/** Documentary evidence is mandatory before any provider can be activated. */
export type ProviderAuthorizationEvidence = {
  kind: "official_api_documentation" | "written_permission";
  evidenceUrl: string;
  reviewedAt: string;
  permittedOperations: readonly PriceProviderOperation[];
  minimumRefreshMinutes: number;
};

export type ProviderBranch = {
  providerBranchId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
};

export type ProviderProduct = {
  providerProductId: string;
  barcode?: string | null;
  name: string;
  brand?: string | null;
  sizeValue: number;
  sizeUnit: MeasurementUnit;
  category?: string | null;
};

export type ProviderOffer = {
  providerBranchId: string;
  providerProductId: string;
  priceCents: number;
  currency: "BRL";
  availability: "available" | "unavailable" | "unknown";
  sourceUrl: string;
  observedAt: string;
};

/** Internal extension point only; it does not describe or call any SuperLuna endpoint. */
export type AuthorizedPriceProvider = {
  providerId: string;
  authorization: ProviderAuthorizationEvidence;
  listBranches?: () => Promise<ProviderBranch[]>;
  fetchCategories?: (providerBranchId: string) => Promise<string[]>;
  fetchCatalog?: (providerBranchId: string) => Promise<ProviderProduct[]>;
  fetchPrices?: (providerBranchId: string) => Promise<ProviderOffer[]>;
};

const supportedOperations: readonly PriceProviderOperation[] = ["branches", "categories", "catalog", "prices"];

/** Fail closed unless HTTPS evidence, an allowed operation, and a bounded refresh cadence exist. */
export function hasValidProviderAuthorization(provider: AuthorizedPriceProvider): boolean {
  const evidence = provider.authorization;
  let evidenceUrl: URL;
  try {
    evidenceUrl = new URL(evidence.evidenceUrl);
  } catch {
    return false;
  }
  const reviewedAt = Date.parse(evidence.reviewedAt);
  const operations: PriceProviderOperation[] = [
    ...(provider.listBranches ? ["branches" as const] : []),
    ...(provider.fetchCategories ? ["categories" as const] : []),
    ...(provider.fetchCatalog ? ["catalog" as const] : []),
    ...(provider.fetchPrices ? ["prices" as const] : []),
  ];
  return Boolean(
    provider.providerId.trim() &&
    evidenceUrl.protocol === "https:" &&
    Number.isFinite(reviewedAt) &&
    evidence.permittedOperations.length > 0 &&
    evidence.permittedOperations.every((operation) => supportedOperations.includes(operation)) &&
    operations.length > 0 &&
    operations.every((operation) => evidence.permittedOperations.includes(operation)) &&
    Number.isFinite(evidence.minimumRefreshMinutes) &&
    evidence.minimumRefreshMinutes > 0,
  );
}

/** Intentionally empty until provider terms/documentation or explicit permission are verified. */
export const activePriceProviders: readonly AuthorizedPriceProvider[] = Object.freeze([]);

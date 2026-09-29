export const REQUIRED_MARKETPLACE_OPERATIONS = [
  "automated-search",
  "local-cache",
  "consumer-display",
  "derived-statistics",
  "daily-refresh",
] as const;

export type MarketplaceOperation = (typeof REQUIRED_MARKETPLACE_OPERATIONS)[number];

export type MarketplaceAuthorizationEvidence = {
  /** This value is a reviewed assertion that permission comes from the platform, not GeckoAPI. */
  issuer: "mercado_livre";
  evidenceUrl: string;
  reviewedAt: string;
  permittedOperations: readonly MarketplaceOperation[];
  /** Minimum interval permitted by the source, in minutes. */
  minimumRefreshMinutes: number;
} & (
  | { kind: "official_platform_api" }
  | { kind: "written_platform_permission"; permissionReference: string }
);

export type AuthorizedMarketplaceProvider = {
  providerId: string;
  authorization: MarketplaceAuthorizationEvidence;
};

const MERCADO_LIVRE_HOSTS = ["mercadolivre.com.br", "mercadolibre.com.br", "mercadolibre.com"];
export const MAX_APP_REFRESHES_PER_PRODUCT_PER_DAY_MINUTES = 24 * 60;

export const MARKETPLACE_REFERENCE_DISABLED_MESSAGE =
  "A referência do Mercado Livre via GeckoAPI está desativada. Não foi confirmada autorização para consulta automatizada, cache local, exibição de anúncios, estatísticas derivadas e atualização diária. Nenhuma consulta foi feita.";

function isMercadoLivreHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return MERCADO_LIVRE_HOSTS.some((host) => normalized === host || normalized.endsWith(`.${host}`));
}

/**
 * Fail closed unless reviewed evidence from the platform covers every operation
 * the feature needs. GeckoAPI's technical docs alone are not platform permission.
 */
export function hasValidMarketplaceAuthorization(provider: AuthorizedMarketplaceProvider): boolean {
  const evidence = provider.authorization;
  let evidenceUrl: URL;
  try {
    evidenceUrl = new URL(evidence.evidenceUrl);
  } catch {
    return false;
  }

  const reviewedAt = Date.parse(evidence.reviewedAt);
  const permitted = new Set(evidence.permittedOperations);
  const permissionReferencePresent = evidence.kind !== "written_platform_permission" ||
    (typeof evidence.permissionReference === "string" && evidence.permissionReference.trim().length > 0);
  const validEvidenceOrigin = evidence.kind === "written_platform_permission"
    ? evidenceUrl.protocol === "https:"
    : evidenceUrl.protocol === "https:" && isMercadoLivreHost(evidenceUrl.hostname);

  return Boolean(
    provider.providerId.trim() &&
      evidence.issuer === "mercado_livre" &&
      permissionReferencePresent &&
      validEvidenceOrigin &&
      Number.isFinite(reviewedAt) &&
      Number.isFinite(evidence.minimumRefreshMinutes) &&
      evidence.minimumRefreshMinutes > 0 &&
      permitted.size === evidence.permittedOperations.length &&
      REQUIRED_MARKETPLACE_OPERATIONS.every((operation) => permitted.has(operation)),
  );
}

/** Candidate providers are empty; any future candidate is filtered through the reviewed-rights gate. */
const marketplaceProviderCandidates: readonly AuthorizedMarketplaceProvider[] = [];
export const activeMarketplaceProviders: readonly AuthorizedMarketplaceProvider[] = Object.freeze(
  marketplaceProviderCandidates.filter(hasValidMarketplaceAuthorization),
);

/** Apply both the platform's minimum interval and the app's once-per-day ceiling. */
export function getSafeMarketplaceRefreshIntervalMinutes(provider: AuthorizedMarketplaceProvider): number | null {
  if (!hasValidMarketplaceAuthorization(provider)) return null;
  return Math.max(provider.authorization.minimumRefreshMinutes, MAX_APP_REFRESHES_PER_PRODUCT_PER_DAY_MINUTES);
}

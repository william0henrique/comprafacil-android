import { describe, expect, it } from "vitest";
import {
  activeMarketplaceProviders,
  getSafeMarketplaceRefreshIntervalMinutes,
  hasValidMarketplaceAuthorization,
  REQUIRED_MARKETPLACE_OPERATIONS,
  type AuthorizedMarketplaceProvider,
} from "../lib/marketplace-provider";

const candidate = (overrides: Partial<AuthorizedMarketplaceProvider> = {}): AuthorizedMarketplaceProvider => ({
  providerId: "mercado-livre",
  authorization: {
    kind: "written_platform_permission",
    issuer: "mercado_livre",
    evidenceUrl: "https://authority.example/permission.pdf",
    permissionReference: "ML-authorization-reference",
    reviewedAt: "2026-09-29T00:00:00.000Z",
    permittedOperations: [...REQUIRED_MARKETPLACE_OPERATIONS],
    minimumRefreshMinutes: 60,
  },
  ...overrides,
});

describe("marketplace authorization gate", () => {
  it("keeps every marketplace provider inactive until reviewed rights are added", () => {
    expect(activeMarketplaceProviders).toEqual([]);
  });

  it("does not treat GeckoAPI technical documentation as Mercado Livre permission", () => {
    expect(hasValidMarketplaceAuthorization(candidate({
      authorization: {
        kind: "official_platform_api",
        issuer: "mercado_livre",
        evidenceUrl: "https://geckoapi.com.br/docs/mercadolivre-com-br-plp/",
        reviewedAt: "2026-09-29T00:00:00.000Z",
        permittedOperations: [...REQUIRED_MARKETPLACE_OPERATIONS],
        minimumRefreshMinutes: 60,
      },
    }))).toBe(false);
  });

  it("rejects official API evidence hosted outside Mercado Livre domains", () => {
    expect(hasValidMarketplaceAuthorization(candidate({
      authorization: {
        kind: "official_platform_api",
        issuer: "mercado_livre",
        evidenceUrl: "https://example.com/api-docs",
        reviewedAt: "2026-09-29T00:00:00.000Z",
        permittedOperations: [...REQUIRED_MARKETPLACE_OPERATIONS],
        minimumRefreshMinutes: 60,
      },
    }))).toBe(false);
  });

  it("rejects evidence that omits any operation needed by the feature", () => {
    expect(hasValidMarketplaceAuthorization(candidate({
      authorization: {
        ...candidate().authorization,
        permittedOperations: ["automated-search", "consumer-display"],
      },
    }))).toBe(false);
  });

  it("rejects written permission evidence without a platform permission reference", () => {
    const evidence = { ...candidate().authorization } as Record<string, unknown>;
    delete evidence.permissionReference;
    expect(hasValidMarketplaceAuthorization(candidate({
      authorization: evidence as unknown as AuthorizedMarketplaceProvider["authorization"],
    }))).toBe(false);
  });

  it("rejects evidence attributed to the extraction provider instead of the platform", () => {
    const evidence = { ...candidate().authorization, issuer: "geckoapi" };
    expect(hasValidMarketplaceAuthorization(candidate({
      authorization: evidence as unknown as AuthorizedMarketplaceProvider["authorization"],
    }))).toBe(false);
  });

  it("caps refreshes at one per product per day even if the source allows more frequent calls", () => {
    const provider = candidate();
    expect(hasValidMarketplaceAuthorization(provider)).toBe(true);
    expect(getSafeMarketplaceRefreshIntervalMinutes(provider)).toBe(24 * 60);
  });

  it("returns no refresh interval when authorization is incomplete", () => {
    const provider = candidate({
      authorization: {
        ...candidate().authorization,
        permittedOperations: ["automated-search"],
      },
    });
    expect(getSafeMarketplaceRefreshIntervalMinutes(provider)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { activePriceProviders, hasValidProviderAuthorization, type AuthorizedPriceProvider } from "../lib/price-provider";

const candidate = (overrides: Partial<AuthorizedPriceProvider> = {}): AuthorizedPriceProvider => ({
  providerId: "candidate",
  authorization: {
    kind: "official_api_documentation",
    evidenceUrl: "http://unverified.invalid/policy",
    reviewedAt: "2026-09-28T00:00:00.000Z",
    permittedOperations: ["prices"],
    minimumRefreshMinutes: 60,
  },
  fetchPrices: async () => [],
  ...overrides,
});

describe("authorized price provider extension point", () => {
  it("has no active source until authorization is documented", () => {
    expect(activePriceProviders).toEqual([]);
  });

  it("rejects non-HTTPS evidence before a provider can be enabled", () => {
    expect(hasValidProviderAuthorization(candidate())).toBe(false);
  });

  it("rejects a provider whose declared operations exceed its evidence scope", () => {
    const provider = candidate({
      authorization: {
        kind: "written_permission",
        evidenceUrl: "https://permission.invalid/document",
        reviewedAt: "2026-09-28T00:00:00.000Z",
        permittedOperations: ["branches"],
        minimumRefreshMinutes: 60,
      },
      fetchPrices: async () => [],
    });
    expect(hasValidProviderAuthorization(provider)).toBe(false);
  });
});

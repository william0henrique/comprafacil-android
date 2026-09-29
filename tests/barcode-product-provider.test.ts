import { describe, expect, it } from "vitest";
import {
  activeProductProviders,
  hasValidProductProviderAuthorization,
  REQUIRED_PRODUCT_PROVIDER_OPERATIONS,
  type AuthorizedProductProvider,
} from "../lib/barcode/product-provider";

function provider(overrides: Partial<AuthorizedProductProvider["authorization"]> = {}): AuthorizedProductProvider {
  return {
    providerId: "catalog-test",
    authorization: {
      evidenceUrl: "https://provider.example/terms",
      reviewedAt: new Date(Date.now() - 60_000).toISOString(),
      permittedOperations: [...REQUIRED_PRODUCT_PROVIDER_OPERATIONS],
      cacheTtlDays: 30,
      imageRightsConfirmed: false,
      ...overrides,
    },
    lookupByBarcode: async () => null,
  };
}

describe("product provider authorization gate", () => {
  it("accepts documented HTTPS metadata rights with a bounded cache and no image display", () => {
    expect(hasValidProductProviderAuthorization(provider())).toBe(true);
  });

  it("rejects missing operations, HTTP evidence and unbounded cache durations", () => {
    expect(hasValidProductProviderAuthorization(provider({ permittedOperations: ["barcode_lookup"] }))).toBe(false);
    expect(hasValidProductProviderAuthorization(provider({ evidenceUrl: "http://provider.example/terms" }))).toBe(false);
    expect(hasValidProductProviderAuthorization(provider({ cacheTtlDays: 0 }))).toBe(false);
    expect(hasValidProductProviderAuthorization(provider({ cacheTtlDays: 91 }))).toBe(false);
  });

  it("requires separate confirmed rights before enabling product-image display", () => {
    expect(hasValidProductProviderAuthorization(provider({ permittedOperations: [...REQUIRED_PRODUCT_PROVIDER_OPERATIONS, "product_image_display"] }))).toBe(false);
    expect(hasValidProductProviderAuthorization(provider({ permittedOperations: [...REQUIRED_PRODUCT_PROVIDER_OPERATIONS, "product_image_display"], imageRightsConfirmed: true }))).toBe(true);
  });

  it("has no active provider configured in this release", () => {
    expect(activeProductProviders).toEqual([]);
  });
});

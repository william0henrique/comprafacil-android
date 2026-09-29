import { describe, expect, it } from "vitest";
import { isProductCacheFresh } from "../lib/barcode/product-cache";
import type { Product } from "../lib/local-db";

function product(cacheExpiresAt: string | null): Product {
  return { id: "p1", cacheExpiresAt } as Product;
}

describe("product barcode cache freshness", () => {
  const now = Date.parse("2026-09-29T12:00:00.000Z");

  it("keeps locally entered product records without remote expiry usable", () => {
    expect(isProductCacheFresh(product(null), now)).toBe(true);
  });

  it("reuses only unexpired provider cache and treats malformed/expired timestamps as stale", () => {
    expect(isProductCacheFresh(product("2026-09-30T12:00:00.000Z"), now)).toBe(true);
    expect(isProductCacheFresh(product("2026-09-28T12:00:00.000Z"), now)).toBe(false);
    expect(isProductCacheFresh(product("not-a-date"), now)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { isEligiblePriceMatch, isSameBarcodeProduct, normalizeGtin } from "../lib/barcode/product-matcher";

const barcode = "4006381333931";
const exactProduct = {
  barcode,
  name: "Arroz Integral",
  brand: "Marca X",
  sizeValue: 1,
  sizeUnit: "kg" as const,
};

describe("barcode product identity", () => {
  it("normalizes spacing and validates supported EAN/GTIN check digits", () => {
    expect(normalizeGtin(" 400638-1333931 ")).toBe(barcode);
    expect(normalizeGtin("4006381333932")).toBeNull();
    expect(normalizeGtin("12345")).toBeNull();
    expect(normalizeGtin("EAN-ABC")).toBeNull();
  });

  it("keeps package variants separate and accepts equivalent kg/g units", () => {
    expect(isSameBarcodeProduct(exactProduct, { ...exactProduct, sizeValue: 1000, sizeUnit: "g" })).toBe(true);
    expect(isSameBarcodeProduct(exactProduct, { ...exactProduct, sizeValue: 5, sizeUnit: "kg" })).toBe(false);
    expect(isEligiblePriceMatch(exactProduct, { ...exactProduct, sizeValue: 5, sizeUnit: "kg" })).toBe(false);
  });

  it("rejects conflicting names, brands and barcodes but permits absent optional metadata only for identity", () => {
    expect(isSameBarcodeProduct(exactProduct, { ...exactProduct, name: "Arroz Parboilizado" })).toBe(false);
    expect(isSameBarcodeProduct(exactProduct, { ...exactProduct, brand: "Outra Marca" })).toBe(false);
    expect(isSameBarcodeProduct(exactProduct, { ...exactProduct, barcode: "036000291452" })).toBe(false);
    const sparse = { barcode, name: "Arroz Integral", brand: null, sizeValue: null, sizeUnit: null };
    expect(isSameBarcodeProduct(exactProduct, sparse)).toBe(true);
    expect(isEligiblePriceMatch(exactProduct, sparse)).toBe(false);
  });
});

import { normalizeText, type MeasurementUnit } from "../domain";

export type ProductDescriptor = {
  barcode: string | null;
  name: string;
  brand: string | null;
  sizeValue: number | null;
  sizeUnit: MeasurementUnit | null;
};

const VALID_LENGTHS = new Set([8, 12, 13, 14]);

/** Normalize and verify a UPC/EAN/GTIN check digit. Invalid codes never enter the cache. */
export function normalizeGtin(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const compact = raw.trim().replace(/[\s-]/g, "");
  if (!/^\d+$/.test(compact) || !VALID_LENGTHS.has(compact.length)) return null;

  const digits = compact.slice(0, -1);
  let weight = 3;
  let sum = 0;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    sum += Number(digits[index]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(compact.at(-1)) ? compact : null;
}

function canonicalPackage(value: number, unit: MeasurementUnit): { value: number; unit: string } {
  if (unit === "kg") return { value: Number((value * 1000).toFixed(3)), unit: "g" };
  if (unit === "g") return { value: Number(value.toFixed(3)), unit: "g" };
  if (unit === "l") return { value: Number((value * 1000).toFixed(3)), unit: "ml" };
  if (unit === "ml") return { value: Number(value.toFixed(3)), unit: "ml" };
  return { value: Number(value.toFixed(3)), unit: "un" };
}

/** Exact barcode plus conflict checks; missing optional metadata is not a conflict. */
export function isSameBarcodeProduct(expected: ProductDescriptor, candidate: ProductDescriptor): boolean {
  const expectedCode = normalizeGtin(expected.barcode);
  const candidateCode = normalizeGtin(candidate.barcode);
  if (!expectedCode || expectedCode !== candidateCode) return false;

  const expectedName = normalizeText(expected.name);
  const candidateName = normalizeText(candidate.name);
  if (expectedName && candidateName && expectedName !== candidateName) return false;

  const expectedBrand = normalizeText(expected.brand);
  const candidateBrand = normalizeText(candidate.brand);
  if (expectedBrand && candidateBrand && expectedBrand !== candidateBrand) return false;

  if (expected.sizeValue != null && expected.sizeUnit && candidate.sizeValue != null && candidate.sizeUnit) {
    const left = canonicalPackage(expected.sizeValue, expected.sizeUnit);
    const right = canonicalPackage(candidate.sizeValue, candidate.sizeUnit);
    if (left.unit !== right.unit || Math.abs(left.value - right.value) > 0.001) return false;
  }
  return true;
}

/** Price eligibility is stricter than barcode identity: name, brand and package must be known and match. */
export function isEligiblePriceMatch(expected: ProductDescriptor, candidate: ProductDescriptor): boolean {
  if (!isSameBarcodeProduct(expected, candidate)) return false;
  if (!normalizeText(expected.name) || normalizeText(expected.name) !== normalizeText(candidate.name)) return false;
  if (!normalizeText(expected.brand) || normalizeText(expected.brand) !== normalizeText(candidate.brand)) return false;
  if (expected.sizeValue == null || !expected.sizeUnit || candidate.sizeValue == null || !candidate.sizeUnit) return false;
  const left = canonicalPackage(expected.sizeValue, expected.sizeUnit);
  const right = canonicalPackage(candidate.sizeValue, candidate.sizeUnit);
  return left.unit === right.unit && Math.abs(left.value - right.value) <= 0.001;
}

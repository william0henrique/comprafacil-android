export type MeasurementUnit = "kg" | "g" | "l" | "ml" | "un";
export type RecommendationPreference = "lowestPrice" | "closest" | "balanced";

export type ProductIdentityInput = {
  name: string;
  brand?: string | null;
  sizeValue?: number | null;
  sizeUnit?: MeasurementUnit | null;
};

export type ListAmount = {
  productId: string;
  quantity: number;
  priceCents: number | null;
};

export type StoreForComparison = {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type StoreComparison = {
  storeId: string;
  storeName: string;
  totalCents: number;
  pricedCount: number;
  missingCount: number;
};

export const MANUAL_STORE_PRICE_SOURCE = "user_manual" as const;
export type StorePrice = { priceCents: number; source: string };
export type PriceMap = ReadonlyMap<string, StorePrice>;

export function isComparableStorePriceSource(source: string): boolean {
  return source === MANUAL_STORE_PRICE_SOURCE;
}

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizedMeasure(value: number, unit: MeasurementUnit): string {
  if (unit === "g") return `${roundMeasure(value / 1000)}kg`;
  if (unit === "kg") return `${roundMeasure(value)}kg`;
  if (unit === "ml") return `${roundMeasure(value / 1000)}l`;
  if (unit === "l") return `${roundMeasure(value)}l`;
  return `${roundMeasure(value)}un`;
}

function roundMeasure(value: number): string {
  return Number(value.toFixed(3)).toString();
}

/** Return null when package size is incomplete; the caller must not auto-merge such products. */
export function makeProductIdentity(input: ProductIdentityInput): string | null {
  const name = normalizeText(input.name);
  if (!name || input.sizeValue == null || !input.sizeUnit || !Number.isFinite(input.sizeValue) || input.sizeValue <= 0) {
    return null;
  }
  return [name, normalizeText(input.brand), normalizedMeasure(input.sizeValue, input.sizeUnit)].join("|");
}

export function makeProductKey(input: ProductIdentityInput, localId: string): string {
  return makeProductIdentity(input) ?? `${normalizeText(input.name)}|${normalizeText(input.brand)}|unknown:${localId}`;
}

/** Parse Brazilian currency input to integer centavos; invalid or non-positive values return null. */
export function parseBRLToCents(raw: string): number | null {
  let value = raw.trim().replace(/[^\d,.-]/g, "");
  if (!value || value.includes("-") || value === "." || value === ",") return null;
  if (value.includes(",") && value.includes(".")) {
    value = value.replace(/\./g, "").replace(",", ".");
  } else if (value.includes(",")) {
    value = value.replace(",", ".");
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

export function crossesPriceThreshold(previousCents: number | null, currentCents: number, thresholdCents: number | null, enabled: boolean): boolean {
  if (!enabled || thresholdCents == null || currentCents > thresholdCents) return false;
  return previousCents == null || previousCents > thresholdCents;
}

export function formatBRL(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function calculateSubtotal(items: ListAmount[]): { totalCents: number; pricedCount: number; missingCount: number } {
  let totalCents = 0;
  let pricedCount = 0;
  let missingCount = 0;
  for (const item of items) {
    if (item.priceCents == null || !Number.isFinite(item.priceCents)) {
      missingCount += 1;
      continue;
    }
    totalCents += Math.round(item.priceCents * item.quantity);
    pricedCount += 1;
  }
  return { totalCents, pricedCount, missingCount };
}

export function compareStores(
  items: Array<{ productId: string; quantity: number }>,
  stores: StoreForComparison[],
  prices: PriceMap,
): StoreComparison[] {
  return stores.map((store) => {
    let totalCents = 0;
    let pricedCount = 0;
    for (const item of items) {
      const observation = prices.get(`${store.id}:${item.productId}`);
      if (!observation || !isComparableStorePriceSource(observation.source)) continue;
      totalCents += Math.round(observation.priceCents * item.quantity);
      pricedCount += 1;
    }
    return {
      storeId: store.id,
      storeName: store.name,
      totalCents,
      pricedCount,
      missingCount: Math.max(0, items.length - pricedCount),
    };
  });
}

export function haversineKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const rad = (degree: number) => (degree * Math.PI) / 180;
  const latitudeDelta = rad(to.latitude - from.latitude);
  const longitudeDelta = rad(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isPriceStale(observedAt: string, now = Date.now(), maxAgeDays = 30): boolean {
  const time = Date.parse(observedAt);
  return !Number.isFinite(time) || now - time > maxAgeDays * 24 * 60 * 60 * 1000;
}

export function recommendStore(
  comparisons: StoreComparison[],
  distancesKm: ReadonlyMap<string, number>,
  preference: RecommendationPreference,
): { storeId: string; reason: string } | null {
  const withPrices = comparisons.filter((row) => row.pricedCount > 0);
  if (!withPrices.length) return null;
  const complete = withPrices.filter((row) => row.missingCount === 0);
  const candidates = complete.length ? complete : withPrices;
  const leastMissing = Math.min(...candidates.map((row) => row.missingCount));
  const comparable = candidates.filter((row) => row.missingCount === leastMissing);
  const cheapest = [...comparable].sort((a, b) => a.totalCents - b.totalCents)[0];
  const withDistance = comparable
    .filter((row) => distancesKm.has(row.storeId))
    .sort((a, b) => (distancesKm.get(a.storeId) ?? Infinity) - (distancesKm.get(b.storeId) ?? Infinity));
  const closest = withDistance[0];

  if (preference === "closest" && closest) {
    return { storeId: closest.storeId, reason: `Mais próxima: ${(distancesKm.get(closest.storeId) ?? 0).toFixed(1)} km; preços parciais disponíveis.` };
  }
  if (preference === "lowestPrice" || !closest) {
    return {
      storeId: cheapest.storeId,
      reason: `${complete.length ? "Menor total registrado" : "Menor subtotal parcial"}; faltam ${cheapest.missingCount} ${cheapest.missingCount === 1 ? "item" : "itens"}.`,
    };
  }

  const pricePremiumCents = Math.max(0, closest.totalCents - cheapest.totalCents);
  const premiumVsCheapest = cheapest.totalCents > 0 ? pricePremiumCents / cheapest.totalCents : 0;
  const distanceDelta = (distancesKm.get(cheapest.storeId) ?? Infinity) - (distancesKm.get(closest.storeId) ?? 0);
  if (cheapest.storeId !== closest.storeId && distanceDelta > 3 && premiumVsCheapest < 0.05) {
    return {
      storeId: closest.storeId,
      reason: `Diferença de preço inferior a 5%; a loja mais próxima fica ${(distanceDelta).toFixed(1)} km mais perto.`,
    };
  }
  return {
    storeId: cheapest.storeId,
    reason: cheapest.storeId === closest.storeId
      ? "Combina o menor total registrado e a menor distância conhecida."
      : "Maior economia registrada; confira a distância antes de decidir.",
  };
}

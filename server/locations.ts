import { normalizeNearbySearchResponse, type NearbySearchResult } from "@/server/maps";

export async function searchNearbyMarkets(input: {
  latitude: number;
  longitude: number;
  radius: number;
}): Promise<NearbySearchResult> {
  const baseUrl = process.env.MANUS_API_URL?.replace(/\/$/, "") ?? "";
  const apiKey = process.env.MANUS_API_KEY ?? "";
  if (!baseUrl || !apiKey) {
    return {
      available: false,
      status: "UNAVAILABLE",
      message: "A busca de locais não está configurada neste ambiente. Você ainda pode escolher supermercados manualmente.",
      places: [],
    };
  }

  const url = new URL(`${baseUrl}/v1/maps/proxy/maps/api/place/nearbysearch/json`);
  url.searchParams.set("location", `${input.latitude},${input.longitude}`);
  url.searchParams.set("radius", String(Math.min(Math.max(input.radius, 500), 5000)));
  url.searchParams.set("type", "supermarket");
  url.searchParams.set("keyword", "supermercado");
  url.searchParams.set("key", apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        available: false,
        status: "ERROR",
        message: "A busca de locais está temporariamente indisponível. Sua localização não foi salva.",
        places: [],
      };
    }
    const body = await response.json() as Parameters<typeof normalizeNearbySearchResponse>[0];
    return normalizeNearbySearchResponse(body);
  } catch {
    return {
      available: false,
      status: "ERROR",
      message: "Não foi possível consultar os locais. Sua localização não foi salva; tente novamente mais tarde.",
      places: [],
    };
  } finally {
    clearTimeout(timeout);
  }
}

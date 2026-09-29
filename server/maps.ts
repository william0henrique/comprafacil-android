export type NearbyMarket = {
  placeId: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  rating: number | null;
  userRatingsTotal: number | null;
};

export type NearbySearchResult =
  | { available: true; status: "OK" | "ZERO_RESULTS"; places: NearbyMarket[] }
  | { available: false; status: "UNAVAILABLE" | "REQUEST_DENIED" | "ERROR"; message: string; places: [] };

type GooglePlaceResponse = {
  status?: string;
  error_message?: string;
  results?: Array<{
    place_id?: string;
    name?: string;
    vicinity?: string;
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    rating?: number;
    user_ratings_total?: number;
  }>;
};

export function normalizeNearbySearchResponse(body: GooglePlaceResponse): NearbySearchResult {
  const status = body.status ?? "ERROR";
  if (status === "ZERO_RESULTS") return { available: true, status, places: [] };
  if (status !== "OK") {
    return {
      available: false,
      status: status === "REQUEST_DENIED" ? "REQUEST_DENIED" : "ERROR",
      message: status === "REQUEST_DENIED"
        ? "O serviço de locais recusou a solicitação. A lista local continua disponível."
        : "Não foi possível consultar os locais agora. Tente novamente mais tarde.",
      places: [],
    };
  }
  const places = (body.results ?? []).flatMap((place): NearbyMarket[] => {
    const location = place.geometry?.location;
    if (!place.place_id || !place.name || !Number.isFinite(location?.lat) || !Number.isFinite(location?.lng)) return [];
    return [{
      placeId: place.place_id,
      name: place.name,
      address: place.vicinity ?? place.formatted_address ?? null,
      latitude: location!.lat!,
      longitude: location!.lng!,
      rating: Number.isFinite(place.rating) ? place.rating! : null,
      userRatingsTotal: Number.isFinite(place.user_ratings_total) ? place.user_ratings_total! : null,
    }];
  });
  return { available: true, status: places.length ? "OK" : "ZERO_RESULTS", places };
}

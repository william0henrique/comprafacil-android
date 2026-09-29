import { describe, expect, it } from "vitest";
import { normalizeNearbySearchResponse } from "../server/maps";

describe("nearby Maps response normalization", () => {
  it("returns only public places with an ID and valid coordinates", () => {
    const result = normalizeNearbySearchResponse({
      status: "OK",
      results: [
        { place_id: "p1", name: "Mercado A", vicinity: "Rua 1", geometry: { location: { lat: -19.9, lng: -44.0 } }, rating: 4.2, user_ratings_total: 18 },
        { name: "Incomplete", geometry: { location: { lat: -19.9, lng: -44.0 } } },
      ],
    });
    expect(result).toMatchObject({ available: true, status: "OK", places: [{ placeId: "p1", name: "Mercado A", address: "Rua 1", latitude: -19.9, longitude: -44, rating: 4.2 }] });
  });

  it("distinguishes no results from an unavailable or denied service", () => {
    expect(normalizeNearbySearchResponse({ status: "ZERO_RESULTS" })).toEqual({ available: true, status: "ZERO_RESULTS", places: [] });
    expect(normalizeNearbySearchResponse({ status: "REQUEST_DENIED", error_message: "key missing" })).toMatchObject({ available: false, status: "REQUEST_DENIED", places: [] });
    expect(normalizeNearbySearchResponse({ status: "OVER_QUERY_LIMIT" })).toMatchObject({ available: false, status: "ERROR", places: [] });
  });
});

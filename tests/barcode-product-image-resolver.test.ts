import { describe, expect, it } from "vitest";
import { resolveProductImage } from "../lib/barcode/product-image-resolver";

describe("product image rights guard", () => {
  it("returns only the real HTTPS image URL after image rights are confirmed", () => {
    expect(resolveProductImage({
      imageUrl: "https://images.example.test/rice.jpg",
      imageSource: "https://catalog.example.test/product/1",
      imageRightsVerified: true,
    })).toBe("https://images.example.test/rice.jpg");
  });

  it("never returns a made-up, HTTP, or unlicensed image URL", () => {
    expect(resolveProductImage({ imageUrl: "https://images.example.test/rice.jpg", imageSource: null, imageRightsVerified: false })).toBeNull();
    expect(resolveProductImage({ imageUrl: "http://images.example.test/rice.jpg", imageSource: "https://catalog.example.test", imageRightsVerified: true })).toBeNull();
    expect(resolveProductImage({ imageUrl: "https://images.example.test/rice.jpg", imageSource: "http://catalog.example.test", imageRightsVerified: true })).toBeNull();
    expect(resolveProductImage({ imageUrl: null, imageSource: null, imageRightsVerified: true })).toBeNull();
  });
});

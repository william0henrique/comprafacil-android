export type ProductImageCandidate = {
  imageUrl: string | null;
  imageSource: string | null;
  imageRightsVerified: boolean;
};

/** Return no image unless it is HTTPS and the provider's image-display rights were verified. */
export function resolveProductImage(candidate: ProductImageCandidate): string | null {
  if (!candidate.imageRightsVerified || !candidate.imageUrl) return null;
  try {
    const imageUrl = new URL(candidate.imageUrl);
    const sourceUrl = candidate.imageSource ? new URL(candidate.imageSource) : null;
    if (imageUrl.protocol !== "https:" || (sourceUrl && sourceUrl.protocol !== "https:")) return null;
    return imageUrl.toString();
  } catch {
    return null;
  }
}

const PEXELS_API_URL = "https://api.pexels.com/v1/search";

interface PexelsPhoto {
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    landscape: string;
  };
  photographer: string;
  alt: string;
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
  total_results: number;
}

export interface ImageSearchResult {
  url: string;
  thumbnailUrl: string;
  photographer: string;
  alt: string;
}

export async function searchPexelsImages(
  query: string,
  options: {
    perPage?: number;
    size?: "large2x" | "large" | "medium" | "landscape";
  } = {}
): Promise<ImageSearchResult[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn("PEXELS_API_KEY not set — skipping image search");
    return [];
  }

  const { perPage = 1, size = "landscape" } = options;
  const url = `${PEXELS_API_URL}?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: apiKey },
    });

    if (!response.ok) {
      console.error(`Pexels API error: ${response.status}`);
      return [];
    }

    const data: PexelsSearchResponse = await response.json();

    return data.photos.map((photo) => ({
      url: photo.src[size],
      thumbnailUrl: photo.src.medium,
      photographer: photo.photographer,
      alt: photo.alt,
    }));
  } catch (err) {
    console.error("Pexels search failed:", err);
    return [];
  }
}

/**
 * Returns a single image URL for the given query, or null if nothing found.
 * Uses "landscape" size by default (~1200px wide) — good for slide backgrounds.
 */
export async function searchSingleImage(
  query: string,
  size: "large2x" | "large" | "medium" | "landscape" = "landscape"
): Promise<string | null> {
  const results = await searchPexelsImages(query, { perPage: 1, size });
  return results[0]?.url ?? null;
}

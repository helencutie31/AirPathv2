import rawPlaces from "../assets/address/hanoi-gym-overview.json";

export function cleanAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  
  let cleaned = address
    .replace(/Vietnam/ig, "")
    .replace(/,\s*\d{4,6}\b/g, "")
    // Remove any leftover non-Vietnamese place text from imported address data.
    .replace(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, "")
    .trim();

  const parts = cleaned.split(",").map(p => p.trim()).filter(Boolean);
  
  const hnIndex = parts.findIndex(p => p.toLowerCase().includes("hà nội") || p.toLowerCase().includes("hanoi"));
  if (hnIndex !== -1) {
    return parts.slice(0, hnIndex).concat("TP Hà Nội").join(", ");
  }

  return parts.join(", ");
}

type AssetPlaceRecord = {
  place_id: string;
  name: string;
  description: string | null;
  reviews: number | null;
  rating: number | null;
  website: string | null;
  phone: string | null;
  featured_image: string | null;
  main_category: string | null;
  categories: string | null;
  workday_timing: string | null;
  address: string | null;
  link: string | null;
  query: string | null;
};

export type PlaceCatalogItem = {
  type?: string;
  image_url?: import("react/jsx-runtime").JSX.Element;
  distance_km?: any;
  aqi_level?: any;
  amenities?: boolean | any;
  filter_type?: "park" | "gym" | "sports";
  id: string;
  name: string;
  location_type: string;
  address: string | null;
  city: string | null;
  district: string | null;
  lat: number;
  lng: number;
  rating?: number | null;
  reviews?: number | null;
  categories?: string | null;
  workday_timing?: string | null;
  website?: string | null;
  phone?: string | null;
  featured_image?: string | null;
  description?: string | null;
  source?: "backend" | "asset";
  created_at?: string;
};

const assetPlaces = (rawPlaces as AssetPlaceRecord[])
  .map(normalizeAssetPlace)
  .filter((item): item is PlaceCatalogItem => item !== null)
  .sort((left, right) => {
    const ratingDelta = (right.rating ?? 0) - (left.rating ?? 0);
    if (ratingDelta !== 0) return ratingDelta;
    const reviewDelta = (right.reviews ?? 0) - (left.reviews ?? 0);
    if (reviewDelta !== 0) return reviewDelta;
    return left.name.localeCompare(right.name);
  });

export const featuredExercisePlaces = assetPlaces.slice(0, 6);

export function mergeExercisePlaces(basePlaces: PlaceCatalogItem[]) {
  const mergedByKey = new Map<string, PlaceCatalogItem>();

  for (const assetPlace of assetPlaces) {
    mergedByKey.set(createKey(assetPlace), assetPlace);
  }

  for (const place of basePlaces) {
    const key = createKey(place);
    const existing = mergedByKey.get(key);
    mergedByKey.set(
      key,
      existing
        ? {
            ...existing,
            ...place,
            rating: (place.rating !== null && place.rating !== undefined && Number(place.rating) > 0) ? Number(place.rating) : existing.rating,
            reviews: (place.reviews !== null && place.reviews !== undefined && Number(place.reviews) > 0) ? Number(place.reviews) : existing.reviews,
            filter_type:
              existing.filter_type ??
              place.filter_type ??
              inferFilterType(place.name, place.location_type, place.categories, place.description),
          }
        : {
            ...place,
            rating: (place.rating !== null && place.rating !== undefined) ? Number(place.rating) : null,
            reviews: (place.reviews !== null && place.reviews !== undefined) ? Number(place.reviews) : null,
            filter_type: place.filter_type ?? inferFilterType(place.name, place.location_type, place.categories, place.description),
          },
    );
  }

  return Array.from(mergedByKey.values()).map(place => ({
    ...place,
    address: cleanAddress(place.address)
  })).sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (aTime !== bTime) {
      return bTime - aTime;
    }
    return 0;
  });
}

function normalizeAssetPlace(record: AssetPlaceRecord): PlaceCatalogItem | null {
  const coordinates = extractCoordinates(record.link, record.query);
  if (!coordinates) {
    return null;
  }

  const addressParts = (record.address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    id: record.place_id,
    name: record.name,
    location_type: record.main_category ?? record.categories ?? "Exercise",
    address: cleanAddress(record.address),
    city: pickCity(addressParts),
    district: pickDistrict(addressParts),
    lat: coordinates.lat,
    lng: coordinates.lng,
    rating: record.rating,
    reviews: record.reviews,
    categories: record.categories,
    workday_timing: record.workday_timing,
    website: record.website,
    phone: record.phone,
    featured_image: record.featured_image,
    description: record.description,
    filter_type: inferFilterType(record.name, record.main_category, record.categories, record.description),
    source: "asset",
  };
}

function inferFilterType(
  name: string,
  locationType: string | null | undefined,
  categories: string | null | undefined,
  description: string | null | undefined,
): "park" | "gym" | "sports" {
  const haystack = normalizeText([name, locationType ?? "", categories ?? "", description ?? ""].join(" "));

  if (/(cong vien|park|garden|outdoor)/.test(haystack)) {
    return "park";
  }

  if (/(stadium|court|track|arena|sports complex|sport|gymnastics|boxing|martial arts|badminton|tennis|basketball|football|futsal|swimming|pool)/.test(haystack)) {
    return "sports";
  }

  return "gym";
}

function extractCoordinates(link: string | null, query: string | null) {
  const sources = [link, query].filter((value): value is string => Boolean(value));

  for (const source of sources) {
    const googleMatch = source.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (googleMatch) {
      return {
        lat: Number(googleMatch[1]),
        lng: Number(googleMatch[2]),
      };
    }

    const queryMatch = source.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (queryMatch) {
      return {
        lat: Number(queryMatch[1]),
        lng: Number(queryMatch[2]),
      };
    }
  }

  return null;
}

function pickDistrict(parts: string[]) {
  if (parts.length >= 3) {
    return parts[1] ?? null;
  }

  if (parts.length >= 2) {
    return parts[0] ?? null;
  }

  return null;
}

function pickCity(parts: string[]) {
  const city = parts.find((part) => /ha noi/i.test(part));
  return city ?? parts[parts.length - 1] ?? null;
}

function createKey(place: PlaceCatalogItem) {
  return normalizeText(place.name);
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

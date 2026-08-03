import type {
  DashboardResponse,
  GpsAqiMeasurement,
  LocationReview,
  LookupItem,
  NotificationItem,
  PlannedRoutesResponse,
  PlaceSuggestion,
  ProfileResponse,
  RouteOption,
  User,
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;
const REQUEST_TIMEOUT_MS = 20000;
const IQAIR_CACHE_TTL_MS = 10 * 60 * 1000;
const IQAIR_CACHE_STORAGE_PREFIX = "airparth:iqair:";

const iqAirAqiCache = new Map<
  string,
  {
    expiresAt: number;
    promise?: Promise<{ ok: true; measurement: GpsAqiMeasurement }>;
    measurement?: GpsAqiMeasurement;
  }
>();

function getIqAirCacheKey(lat: number, lng: number) {
  return `${lat.toFixed(4)}|${lng.toFixed(4)}`;
}

function getIqAirStorageKey(cacheKey: string) {
  return `${IQAIR_CACHE_STORAGE_PREFIX}${cacheKey}`;
}

function readCachedIqAirMeasurement(cacheKey: string): GpsAqiMeasurement | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getIqAirStorageKey(cacheKey));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as {
      expiresAt?: number;
      measurement?: GpsAqiMeasurement;
    };

    if (!parsed.measurement || typeof parsed.expiresAt !== "number" || parsed.expiresAt <= Date.now()) {
      return null;
    }

    return parsed.measurement;
  } catch {
    return null;
  }
}

function storeCachedIqAirMeasurement(cacheKey: string, measurement: GpsAqiMeasurement) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getIqAirStorageKey(cacheKey),
      JSON.stringify({
        expiresAt: Date.now() + IQAIR_CACHE_TTL_MS,
        measurement,
      }),
    );
  } catch {
    // Ignore storage failures.
  }
}

export function translateError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  
  if (lower.includes("failed to fetch") || lower.includes("network error")) return "Không thể kết nối với máy chủ. Vui lòng kiểm tra mạng.";
  if (lower.includes("timeout") || lower.includes("aborted")) return "Yêu cầu đã hết thời gian chờ.";
  if (lower.includes("invalid email or password") || lower.includes("invalid admin credentials") || lower.includes("401")) return "Tên đăng nhập hoặc mật khẩu không đúng.";
  if (lower.includes("email is required") || lower.includes("password is required") || lower.includes("missing required fields")) return "Vui lòng nhập đầy đủ thông tin.";
  if (lower.includes("admin account cannot log in from the user login screen")) return "Tài khoản quản trị không thể đăng nhập từ màn hình dành cho người dùng. Hãy dùng màn hình đăng nhập quản trị.";
  if (lower.includes("user account cannot log in from the admin login screen")) return "Tài khoản người dùng không thể đăng nhập từ màn hình quản trị. Hãy dùng màn hình đăng nhập người dùng.";
  if (lower.includes("account with this email already exists")) return "Email này đã được đăng ký.";
  if (lower.includes("user denied geolocation")) return "Không thể lấy vị trí GPS. Hãy bật quyền vị trí.";
  if (lower.includes("routing service failed") || lower.includes("did not return a valid route")) return "Không thể tạo lộ trình. Vui lòng thử điểm khác.";
  if (lower.includes("request failed") || lower.includes("internal server error")) return "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.";
  
  return msg;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const externalSignal = options.signal;
  const onAbort = () => controller.abort();

  if (externalSignal) {
    if (externalSignal.aborted) {
      window.clearTimeout(timeoutId);
      throw new Error(translateError("The operation was aborted."));
    }

    externalSignal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const { headers, signal: _ignoredSignal, ...restOptions } = options;
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...restOptions,
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok || data.ok === false) {
      throw new Error(translateError(data.error || `Request failed: ${response.status}`));
    }

    return data as T;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(translateError("Yêu cầu đã hết thời gian chờ."));
    }

    throw new Error(translateError(error));
  } finally {
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onAbort);
    }

    window.clearTimeout(timeoutId);
  }
}

export async function fetchBootstrapData() {
  return request<{
    ok: true;
    activities: LookupItem[];
    healthConditions: LookupItem[];
    aqiSnapshot: GpsAqiMeasurement | null;
  }>("/api/bootstrap");
}

export async function login(email: string, password: string) {
  return request<{ ok: true; user: User & { role?: "user" | "admin" } }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password, expectedRole: "user" }),
    },
  );
}

export async function loginAdmin(email: string, password: string) {
  return request<{ ok: true; user: User & { role?: "user" | "admin" } }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password, expectedRole: "admin" }),
    },
  );
}

export async function forgotPassword(email: string) {
  return request<{ ok: true; reset: boolean; emailSent: boolean; message: string }>(
    "/api/auth/forgot-password",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
}

export async function register(
  fullName: string,
  email: string,
  password: string,
) {
  return request<{ ok: true; user: User }>("/api/users/register", {
    method: "POST",
    body: JSON.stringify({ fullName, email, password }),
  });
}

export async function fetchDashboard(userId: string) {
  return request<{ ok: true } & DashboardResponse>(
    `/api/users/${userId}/dashboard`,
  );
}

export async function fetchAdminDashboard() {
  return request<{
    ok: true;
    overview: {
      systemAqi: number;
      activeUsers: number;
      totalLocations: number;
      pendingModeration: number;
    };
  }>(`/api/admin/dashboard`);
}

export async function fetchProfile(userId: string) {
  return request<{ ok: true } & ProfileResponse>(
    `/api/users/${userId}/profile`,
  );
}

export async function updateProfile(
  userId: string,
  payload: Record<string, unknown>,
) {
  return request<{ ok: true } & ProfileResponse>(
    `/api/users/${userId}/profile`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchNotifications(userId: string) {
  return request<{ ok: true; notifications: NotificationItem[] }>(
    `/api/users/${userId}/notifications`,
  );
}

export async function updateNotificationPreferences(
  userId: string,
  payload: Record<string, unknown>,
) {
  return request<{ ok: true; notificationPreferences: Record<string, unknown> }>(
    `/api/users/${userId}/notification-preferences`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function markNotificationRead(notificationId: string) {
  return request<{ ok: true; notification: NotificationItem }>(
    `/api/notifications/${notificationId}/read`,
    { method: "PATCH" },
  );
}

export async function previewAdvice(userId: string) {
  return request<{
    ok: true;
    advice: { severity: string; title: string; body: string };
    location: { name: string; aqi: number | null } | null;
  }>("/api/advice/preview", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function fetchLocations() {
  return request<{
    ok: true;
    locations: Array<{
      id: string;
      name: string;
      location_type: string;
      address: string | null;
      city: string | null;
      district: string | null;
      lat: number;
      lng: number;
      metadata?: {
        description?: string | null;
        amenities?: string[];
      };
      aqi_level?: number | null;
    }>;
  }>("/api/locations", { cache: "no-store" });
}

export async function createLocation(payload: {
  name: string;
  locationType: string;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  lat: number;
  lng: number;
  description?: string | null;
  amenities?: string[];
}) {
  return request<{ ok: true; location: Record<string, unknown> }>(
    "/api/locations",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateLocation(
  locationId: string,
  payload: {
    name: string;
    locationType: string;
    city?: string | null;
    district?: string | null;
    address?: string | null;
    lat: number;
    lng: number;
    description?: string | null;
    amenities?: string[];
  },
) {
  return request<{ ok: true; location: Record<string, unknown> }>(
    `/api/locations/${locationId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteLocation(locationId: string) {
  return request<{ ok: true; location: Record<string, unknown> }>(
    `/api/locations/${locationId}`,
    {
      method: "DELETE",
    },
  );
}

export async function fetchLocationReviews(locationId: string) {
  return request<{ ok: true; reviews: LocationReview[] }>(
    `/api/locations/${locationId}/reviews`,
  );
}

export async function createLocationReview(
  locationId: string,
  payload: {
    userId: string;
    rating: number;
    content: string;
    metadata?: Record<string, unknown>;
  },
) {
  return request<{ ok: true; review: LocationReview }>(
    `/api/locations/${locationId}/reviews`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchAdminHiddenReviews() {
  return request<{ ok: true; reviews: LocationReview[] }>(`/api/admin/reviews`);
}

export async function updateReview(
  reviewId: string,
  payload: { is_hidden?: boolean },
) {
  return request<{ ok: true; review: LocationReview }>(
    `/api/reviews/${reviewId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteReview(reviewId: string) {
  return request<{ ok: true }>(`/api/reviews/${reviewId}`, {
    method: "DELETE",
  });
}

export async function createRouteRequest(payload: {
  userId: string;
  originLabel: string;
  originLat: number;
  originLng: number;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  maxRatio: number;
  shortestDistanceM: number;
  shortestDurationS: number;
  options: RouteOption[];
}) {
  return request<{
    ok: true;
    request: Record<string, unknown>;
    options: Array<Record<string, unknown>>;
  }>("/api/route-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchRouteHistory(userId: string) {
  return request<{ ok: true; routeRequests: Array<Record<string, unknown>> }>(
    `/api/users/${userId}/route-requests`,
  );
}

export async function fetchIqAirAqiByCoordinates(
  lat: number,
  lng: number,
  options?: RequestInit,
) {
  const cacheKey = getIqAirCacheKey(lat, lng);
  const now = Date.now();

  const cached = iqAirAqiCache.get(cacheKey);
  if (cached?.measurement && cached.expiresAt > now) {
    return Promise.resolve({ ok: true as const, measurement: cached.measurement });
  }

  if (cached?.promise && cached.expiresAt > now) {
    return options?.signal ? raceWithAbortSignal(cached.promise, options.signal) : cached.promise;
  }

  const persistedMeasurement = readCachedIqAirMeasurement(cacheKey);
  if (persistedMeasurement) {
    iqAirAqiCache.set(cacheKey, {
      expiresAt: now + IQAIR_CACHE_TTL_MS,
      promise: Promise.resolve({ ok: true as const, measurement: persistedMeasurement }),
      measurement: persistedMeasurement,
    });
    return Promise.resolve({ ok: true as const, measurement: persistedMeasurement });
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });

  const basePromise = request<{ ok: true; measurement: GpsAqiMeasurement }>(
    `/api/aqi/iqair?${params.toString()}`,
    options,
  );

  const wrappedPromise = basePromise.then((data) => {
    storeCachedIqAirMeasurement(cacheKey, data.measurement);
    iqAirAqiCache.set(cacheKey, {
      expiresAt: Date.now() + IQAIR_CACHE_TTL_MS,
      promise: Promise.resolve(data),
      measurement: data.measurement,
    });
    return data;
  });

  iqAirAqiCache.set(cacheKey, {
    expiresAt: now + IQAIR_CACHE_TTL_MS,
    promise: wrappedPromise,
  });

  wrappedPromise.catch(() => {
    const current = iqAirAqiCache.get(cacheKey);
    if (current?.promise === wrappedPromise) {
      iqAirAqiCache.delete(cacheKey);
    }
  });

  return options?.signal
    ? raceWithAbortSignal(wrappedPromise, options.signal)
    : wrappedPromise;
}

export async function fetchAqicnAqi(lat: number, lng: number, options?: RequestInit): Promise<{ ok: true; measurement: GpsAqiMeasurement }> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  return request<{ ok: true; measurement: GpsAqiMeasurement }>(`/api/aqi/aqicn?${params.toString()}`, options);
}

export async function fetchGpsAqiWithFallback(
  lat: number,
  lng: number,
  options?: RequestInit,
) {
  try {
    return await fetchIqAirAqiByCoordinates(lat, lng, options);
  } catch (error) {
    if (
      options?.signal?.aborted ||
      (error instanceof Error && error.name === "AbortError") ||
      (typeof error === "object" && error !== null && "name" in error && (error as any).name === "AbortError")
    ) {
      throw error;
    }
    console.warn("IQAir fetch failed, falling back to AQICN", error);
    return await fetchAqicnAqi(lat, lng, options);
  }
}

function raceWithAbortSignal<T>(promise: Promise<T>, signal: AbortSignal) {
  if (signal.aborted) {
    return Promise.reject(
      new DOMException("The operation was aborted.", "AbortError"),
    );
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    };

    signal.addEventListener("abort", onAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

export async function searchPlaces(query: string, limit = 6) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });

  return request<{ ok: true; places: PlaceSuggestion[] }>(
    `/api/maps/search?${params.toString()}`,
  );
}

export async function reverseGeocode(lat: number, lng: number) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });

  return request<{ ok: true; address: string | null; lat: number; lng: number }>(
    `/api/maps/reverse?${params.toString()}`,
  );
}

export async function planRoutes(payload: {
  origin: {
    label: string;
    lat: number;
    lng: number;
  };
  destination: {
    label: string;
    lat: number;
    lng: number;
  };
  maxRatio: number;
}) {
  return request<{ ok: true } & PlannedRoutesResponse>(
    "/api/maps/plan-routes",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function translateReviewContent(
  text: string,
  targetLang: "JA",
): Promise<{
  translated: string;
  sourceLang: string | null;
  cached: boolean;
  error: string | null;
}> {
  return request<{
    ok: true;
    translated: string;
    sourceLang: string | null;
    cached: boolean;
    error: string | null;
  }>("/api/translate", {
    method: "POST",
    body: JSON.stringify({ text, targetLang }),
  });
}

export async function dispatchAqiAlert(
  userId: string,
  alert: {
    title: string;
    body: string;
    aqi?: number | null;
    aqiLabel?: string;
    location?: string;
  },
): Promise<{
  ok: true;
  dbSaved: boolean;
  pushSent: boolean;
  emailSent: boolean;
}> {
  return request<{
    ok: true;
    dbSaved: boolean;
    pushSent: boolean;
    emailSent: boolean;
  }>(`/api/users/${userId}/aqi-alert`, {
    method: "POST",
    body: JSON.stringify(alert),
  });
}

export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionJSON,
): Promise<{ ok: true; saved: boolean; error?: string }> {
  return request<{ ok: true; saved: boolean; error?: string }>(
    `/api/users/${userId}/push-subscription`,
    {
      method: "POST",
      body: JSON.stringify({ subscription }),
    },
  );
}

export async function fetchVapidPublicKey(): Promise<{
  ok: true;
  publicKey: string | null;
}> {
  return request<{ ok: true; publicKey: string | null }>(
    "/api/push/vapid-public-key",
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createRouteRequest,
  createLocationReview,
  fetchBootstrapData,
  fetchDashboard,
  fetchGpsAqiWithFallback,
  fetchLocationReviews,
  fetchLocations,
  fetchNotifications,
  fetchProfile,
  fetchRouteHistory,
  forgotPassword,
  login,
  loginAdmin,
  markNotificationRead,
  previewAdvice,
  register,
  updateProfile,
  dispatchAqiAlert,
  updateNotificationPreferences,
} from "./lib/api";
import type {
  DashboardResponse,
  LookupItem,
  NotificationItem,
  LocationReview,
  ProfileResponse,
  RouteOption,
  User,
  GpsAqiMeasurement,
} from "./lib/types";
import type { PlaceCatalogItem } from "./lib/guest-exercise-places";
import { mergeExercisePlaces } from "./lib/guest-exercise-places";
import { LoginScreenDemo } from "./components/LoginScreenDemo";
import { RegisterScreenDemo } from "./components/RegisterScreenDemo";
import { ShellDemo, type View as ShellView } from "./components/ShellDemo";
import { HomeViewDemo } from "./components/HomeViewDemo";
import { SearchLocationsView } from "./components/SearchLocationsView";
import { LocationDetailView } from "./components/LocationDetailView";
import { ReviewsListView } from "./components/ReviewsListView";
import { getBlockedCommentLanguages } from "./lib/comment-blocklist";
import {
  defaultAvatarSelection,
  loadAvatarSelection,
  saveAvatarSelection,
  type AvatarSelection,
} from "./lib/avatar-presets";
import { RoutePlannerView } from "./components/RoutePlannerView";
import { AqiAlertScreen } from "./components/AqiAlertScreen";
import { ProfileViewDemo } from "./components/ProfileViewDemo";
import { AdminWorkspace } from "./components/AdminWorkspace";
import { GuestRoutePreview } from "./components/GuestRoutePreview";

type Role = "guest" | "user" | "admin";
type View = ShellView;

type AqiTone = "good" | "moderate" | "sensitive" | "bad" | "very-bad" | "unknown";

type AqiAlertItem = {
  id: string;
  title: string;
  body: string;
  tone: AqiTone;
  toneLabel: string;
  aqi: number | null;
  location: string;
  createdAt: string;
  deltaText: string | null;
};

const demoLocationPrompts = [
  "Xem danh sách phòng tập nổi bật gần bạn và chọn địa điểm phù hợp hôm nay.",
  "Mở tab tìm kiếm để xem thêm các địa điểm được gợi ý gần bạn.",
  "Mở từng địa điểm để so sánh đánh giá, giờ hoạt động và khoảng cách.",
  "Nếu muốn vận động ngay, hãy ưu tiên kiểm tra các địa điểm được đánh giá cao.",
];

type LocationItem = PlaceCatalogItem;

function normalizeLocationKey(location: Pick<LocationItem, "name" | "address">) {
  return `${normalizeText(location.name)}|${normalizeText(location.address ?? "")}`;
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getAqiTone(value: number | null): { tone: AqiTone; label: string; advice: string } {
  if (value === null) {
    return {
      tone: "unknown",
      label: "Chưa có dữ liệu",
      advice: "Không thể lấy AQI mới nhất. Hãy bật GPS hoặc thử lại sau.",
    };
  }

  if (value <= 50) {
    return {
      tone: "good",
      label: "Tốt",
      advice: "Không khí tốt. Bạn có thể ra ngoài hoặc vận động nhẹ như bình thường.",
    };
  }

  if (value <= 100) {
    return {
      tone: "moderate",
      label: "Trung bình",
      advice: "Không khí ở mức chấp nhận được. Người nhạy cảm nên kiểm tra tình hình trước khi vận động lâu ngoài trời.",
    };
  }

  if (value <= 150) {
    return {
      tone: "sensitive",
      label: "Không tốt cho người nhạy cảm",
      advice: "Hạn chế vận động mạnh ngoài trời. Nếu cần ra ngoài, hãy dùng khẩu trang lọc tốt và rút ngắn thời gian ở ngoài.",
    };
  }

  if (value <= 200) {
    return {
      tone: "bad",
      label: "Xấu",
      advice: "Giảm tối đa hoạt động ngoài trời và chuyển sang vận động trong nhà. Đóng cửa sổ khi không cần thông gió.",
    };
  }

  return {
    tone: "very-bad",
    label: "Rất xấu",
    advice: "Rất xấu。、。",
  };
}

function getAqiRangeTone(value: number | null): AqiTone {
  if (value === null) {
    return "unknown";
  }

  if (value <= 50) return "good";
  if (value <= 100) return "moderate";
  if (value <= 150) return "sensitive";
  if (value <= 200) return "bad";
  return "very-bad";
}

function formatAqiDelta(previousAqi: number | null, nextAqi: number | null) {
  if (previousAqi === null || nextAqi === null || previousAqi === nextAqi) {
    return null;
  }

  const delta = nextAqi - previousAqi;
  const direction = delta > 0 ? "tăng" : "giảm";
  return `AQI đã ${direction} ${Math.abs(delta)} điểm so với lần trước.`;
}

function buildAqiAlert(measurement: GpsAqiMeasurement, previousAqi: number | null): AqiAlertItem | null {
  const aqiValue = measurement.aqi;

  if (aqiValue === null) {
    return null;
  }

  const toneInfo = getAqiTone(aqiValue);
  const deltaText = formatAqiDelta(previousAqi, aqiValue);

  return {
    id: `${measurement.location_name}-${measurement.measured_at ?? Date.now()}-${aqiValue}`,
    title:
      deltaText && previousAqi !== null
      ? `AQI đã ${aqiValue > previousAqi ? "tăng" : "giảm"} lên ${aqiValue}.`
        : `AQI hiện tại: ${aqiValue}`,
    body: `${toneInfo.advice}${measurement.location_name ? ` Vị trí đo: ${measurement.location_name}.` : ""}`,
    tone: toneInfo.tone,
    toneLabel: toneInfo.label,
    aqi: aqiValue,
    location: measurement.location_name || "Vị trí hiện tại",
    createdAt: measurement.measured_at ?? new Date().toISOString(),
    deltaText,
  };
}

function buildThresholdAqiAlert(
  measurement: GpsAqiMeasurement,
  threshold: number,
  isUnsafe: boolean,
): AqiAlertItem | null {
  const aqiValue = measurement.aqi;

  if (aqiValue === null) {
    return null;
  }

  return {
    id: `threshold-${measurement.location_name}-${measurement.measured_at ?? Date.now()}-${aqiValue}-${threshold}`,
    title: isUnsafe ? "AQI đã vượt ngưỡng cảnh báo" : "AQI đang an toàn với bạn",
    body: isUnsafe
      ? `AQI hiện tại là ${aqiValue}, cao hơn ngưỡng ${threshold}. Hãy giảm vận động ngoài trời hoặc chuyển vào trong nhà.`
      : `AQI hiện tại là ${aqiValue}, thấp hơn ngưỡng ${threshold}. Bạn có thể tiếp tục hoạt động an toàn.`,
    tone: isUnsafe ? "bad" : "good",
    toneLabel: isUnsafe ? "Vượt ngưỡng" : "An toàn",
    aqi: aqiValue,
    location: measurement.location_name || "Vị trí hiện tại",
    createdAt: measurement.measured_at ?? new Date().toISOString(),
    deltaText: null,
  };
}

function buildDemoWelcomeAlert(userName: string): AqiAlertItem {
  return {
    id: `demo-welcome-${Date.now()}`,
    title: `Chào mừng trở lại, ${userName}!`,
    body: "Bạn đã sẵn sàng vận động chưa? Hãy kiểm tra cảnh báo AQI mới nhất để chọn thời gian và địa điểm phù hợp.",
    tone: "moderate",
    toneLabel: "",
    aqi: null,
      location: "AirPath",
    createdAt: new Date().toISOString(),
    deltaText: null,
  };
}

function buildDemoExploreAlert(stepIndex: number): AqiAlertItem {
  const prompt = demoLocationPrompts[stepIndex % demoLocationPrompts.length];

  return {
    id: `demo-explore-${stepIndex}-${Date.now()}`,
    title: "Gợi ý khám phá địa điểm",
    body: prompt,
    tone: "good",
    toneLabel: "Khám phá",
    aqi: null,
    location: "Danh sách địa điểm",
    createdAt: new Date().toISOString(),
    deltaText: null,
  };
}

function buildFlaggedCommentAlert(userName: string, content: string): AqiAlertItem {
  return {
    id: `flagged-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "Bình luận có khả năng vi phạm quy định",
    body: `Vui lòng chờ quản trị viên kiểm tra. Bình luận bạn đã đăng: "${content}"`,
    tone: "bad",
    toneLabel: "Kiểm tra nội dung",
    aqi: null,
    location: userName,
    createdAt: new Date().toISOString(),
    deltaText: null,
  };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("user");
  const [view, setView] = useState<View>("home");
  const [redirectAfterLogin, setRedirectAfterLogin] = useState<View | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [bootstrap, setBootstrap] = useState<{
    activities: LookupItem[];
    healthConditions: LookupItem[];
    aqiSnapshot: GpsAqiMeasurement | null;
  }>({ activities: [], healthConditions: [], aqiSnapshot: null });
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [advice, setAdvice] = useState<{ severity: string; title: string; body: string } | null>(
    null,
  );
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [routeHistory, setRouteHistory] = useState<Array<Record<string, unknown>>>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [selectedLocationAqi, setSelectedLocationAqi] = useState<GpsAqiMeasurement | null>(null);
  const [selectedLocationAqiLoading, setSelectedLocationAqiLoading] = useState(false);
  const [selectedLocationAqiError, setSelectedLocationAqiError] = useState<string | null>(null);
  const [selectedLocationReviews, setSelectedLocationReviews] = useState<LocationReview[]>([]);
  const [selectedLocationReviewsLoading, setSelectedLocationReviewsLoading] = useState(false);
  const [selectedLocationReviewsError, setSelectedLocationReviewsError] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [maxRatio, setMaxRatio] = useState(1.5);
  const [routeSubmitting, setRouteSubmitting] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [gpsAqi, setGpsAqi] = useState<GpsAqiMeasurement | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [aqiAlerts, setAqiAlerts] = useState<AqiAlertItem[]>([]);
  const [aqiUnreadCount, setAqiUnreadCount] = useState(0);
  const [avatarSelection, setAvatarSelection] = useState<AvatarSelection>(defaultAvatarSelection);
  const demoAlertStepRef = useRef(0);
  const hasAutoLoadedGpsAqiRef = useRef(false);
  const lastStoredAqiRef = useRef<number | null>(null);
  const lastStoredToneRef = useRef<AqiTone>("unknown");
  const lastThresholdAlertStateRef = useRef<"safe" | "unsafe" | null>(null);
  const lastAlertedThresholdRef = useRef<number | null>(null);
  const selectedLocationAqiAbortRef = useRef<AbortController | null>(null);

  function applyBootstrapAqiSnapshot(snapshot: GpsAqiMeasurement | null) {
    if (!snapshot) {
      return;
    }

    setGpsAqi(snapshot);
    setGpsCoords({ lat: snapshot.lat, lng: snapshot.lng });
  }

  const loadSelectedLocationAqi = useCallback(async (location: LocationItem) => {
    selectedLocationAqiAbortRef.current?.abort();
    const controller = new AbortController();
    selectedLocationAqiAbortRef.current = controller;

    setSelectedLocationAqiLoading(true);
    setSelectedLocationAqiError(null);

    try {
      const response = await fetchGpsAqiWithFallback(location.lat, location.lng, {
        signal: controller.signal,
      });

      if (!controller.signal.aborted) {
        setSelectedLocationAqi(response.measurement);
      }
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof Error && error.name === "AbortError") ||
        (typeof error === "object" && error !== null && "name" in error && (error as any).name === "AbortError")
      ) {
        return;
      }

      setSelectedLocationAqi(null);
      setSelectedLocationAqiError(error instanceof Error ? error.message : "Không thể lấy AQI.");
    } finally {
      if (!controller.signal.aborted) {
        setSelectedLocationAqiLoading(false);
      }
    }
  }, []);

  const guestUser = useMemo<User>(
    () => ({
      id: "guest-preview",
      email: "guest@airparth.local",
      full_name: "Khách xem trước",
      birth_year: null,
      home_lat: null,
      home_lng: null,
    }),
    [],
  );

  const reloadLocations = useCallback(async () => {
    const data = await fetchLocations();
    setLocations(data.locations);
  }, []);

  useEffect(() => {
    fetchBootstrapData()
      .then((data) => {
        setBootstrap({
          activities: data.activities,
          healthConditions: data.healthConditions,
          aqiSnapshot: data.aqiSnapshot,
        });
        applyBootstrapAqiSnapshot(data.aqiSnapshot);
      })
      .catch((error) => setGlobalError(error.message));

    void reloadLocations().catch((error) => setGlobalError(error.message));
  }, [reloadLocations]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedAqi = window.localStorage.getItem("airparth:lastAqiValue");
    if (savedAqi !== null) {
      const parsed = Number(savedAqi);
      lastStoredAqiRef.current = Number.isFinite(parsed) ? parsed : null;
    }

    const savedTone = window.localStorage.getItem("airparth:lastAqiTone");
    if (savedTone === "good" || savedTone === "moderate" || savedTone === "sensitive" || savedTone === "bad" || savedTone === "very-bad") {
      lastStoredToneRef.current = savedTone;
    }
  }, []);

  useEffect(() => {
    if (!user?.id || role === "guest") {
      setAvatarSelection(defaultAvatarSelection);
      return;
    }

    setAvatarSelection(loadAvatarSelection(user.id));
  }, [role, user?.id]);

  useEffect(() => {
    if (!user || role === "guest" || role === "admin") return;

    seedDemoAlerts(user.full_name ?? user.email);

    const demoTimer = window.setInterval(() => {
      pushDemoExploreAlert();
    }, 1800000);

    Promise.all([
      fetchDashboard(user.id),
      fetchProfile(user.id),
      fetchNotifications(user.id),
      previewAdvice(user.id).catch(() => null),
      fetchRouteHistory(user.id),
    ])
      .then(([dashboardData, profileData, notificationData, adviceData, routeHistoryData]) => {
        setDashboard(dashboardData);
        setProfile(profileData);
        setNotifications(notificationData.notifications);
        setRouteHistory(routeHistoryData.routeRequests);
        setAdvice(adviceData?.advice ?? null);
        setMaxRatio(Number(profileData.profile?.default_max_route_ratio ?? 1.5));
      })
      .catch((error) => setGlobalError(error.message));

    return () => window.clearInterval(demoTimer);
  }, [role, user]);

  async function handleUserLogin(email: string, password: string) {
    setLoadingAuth(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const response = await login(email, password);
      if (response.user.role === "admin") {
        throw new Error("Admin account cannot log in from the user login screen.");
      }
      await reloadLocations().catch((error) => setGlobalError(error.message));
      setUser(response.user);
      setRole(response.user.role === "admin" ? "admin" : "user");
      setView(response.user.role === "admin" ? "dashboard" : (redirectAfterLogin || "home"));
      setRedirectAfterLogin(null);
      applyBootstrapAqiSnapshot(bootstrap.aqiSnapshot);
      hasAutoLoadedGpsAqiRef.current = false;
    } catch (error) {
      let msg = error instanceof Error ? error.message : "Đăng nhập thất bại.";
      if (/admin account cannot log in from the user login screen/i.test(msg)) {
        msg = "Tài khoản quản trị không thể đăng nhập từ màn hình dành cho người dùng. Hãy dùng màn hình đăng nhập quản trị.";
      } else if (/invalid email or password/i.test(msg) || /invalid admin credentials/i.test(msg) || /401/.test(msg)) {
        msg = "Tên đăng nhập hoặc mật khẩu không đúng.";
      } else if (/email is required/i.test(msg) || /password is required/i.test(msg)) {
        msg = "Vui lòng nhập đầy đủ thông tin.";
      }
      setAuthError(msg);
    } finally {
      setLoadingAuth(false);
    }
  }

  async function handleAdminLogin(email: string, password: string) {
    setLoadingAuth(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const response = await loginAdmin(email, password);
      if (response.user.role !== "admin") {
        throw new Error("User account cannot log in from the admin login screen.");
      }
      setUser(response.user);
      setRole(response.user.role === "admin" ? "admin" : "user");
      setView(response.user.role === "admin" ? "dashboard" : (redirectAfterLogin || "home"));
      setRedirectAfterLogin(null);
      applyBootstrapAqiSnapshot(bootstrap.aqiSnapshot);
      hasAutoLoadedGpsAqiRef.current = false;
    } catch (error) {
      let msg = error instanceof Error ? error.message : "Đăng nhập thất bại.";
      if (/user account cannot log in from the admin login screen/i.test(msg)) {
        msg = "Tài khoản người dùng không thể đăng nhập từ màn hình quản trị. Hãy dùng màn hình đăng nhập người dùng.";
      } else if (/invalid admin credentials/i.test(msg) || /401/.test(msg) || /invalid email or password/i.test(msg)) {
        msg = "Tên đăng nhập hoặc mật khẩu không đúng.";
      } else if (/email is required/i.test(msg) || /password is required/i.test(msg)) {
        msg = "Vui lòng nhập đầy đủ thông tin.";
      }
      setAuthError(msg);
    } finally {
      setLoadingAuth(false);
    }
  }

  async function handleRegister(fullName: string, email: string, password: string) {
    setLoadingAuth(true);
    setAuthError(null);
    try {
      await register(fullName, email, password);
      setShowRegister(false);
      setAuthSuccess("Đăng ký đã hoàn tất. Hãy đăng nhập để trải nghiệm AirPath.");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Đăng ký thất bại.");
    } finally {
      setLoadingAuth(false);
    }
  }

  async function handleForgotPassword(email: string) {
    setLoadingAuth(true);
    setAuthError(null);
    try {
      const response = await forgotPassword(email);
      return response.message;
    } finally {
      setLoadingAuth(false);
    }
  }

  function handleGuestContinue() {
    setUser(guestUser);
    setRole("guest");
    setView("home");
    setRedirectAfterLogin(null);
    setAuthError(null);
    setGlobalError(null);
    hasAutoLoadedGpsAqiRef.current = false;
    demoAlertStepRef.current = 0;
    lastThresholdAlertStateRef.current = null;
    lastAlertedThresholdRef.current = null;
    // Guests should not receive demo notifications or unread counts
    setAqiAlerts([]);
    setAqiUnreadCount(0);
    applyBootstrapAqiSnapshot(bootstrap.aqiSnapshot);
  }

  async function handleMarkRead(notificationId: string) {
    await markNotificationRead(notificationId);
    if (!user) return;
    const data = await fetchNotifications(user.id);
    setNotifications(data.notifications);
    const dashboardData = await fetchDashboard(user.id);
    setDashboard(dashboardData);
  }

  function handleAqiBellClick() {
    setAqiUnreadCount(0);
  }

  function seedDemoAlerts(displayName: string) {
    demoAlertStepRef.current = 0;
    setAqiAlerts([buildDemoWelcomeAlert(displayName)]);
    setAqiUnreadCount(1);
  }

  function pushDemoExploreAlert() {
    demoAlertStepRef.current += 1;
    setAqiAlerts((current) => [buildDemoExploreAlert(demoAlertStepRef.current), ...current].slice(0, 5));
    setAqiUnreadCount((current) => current + 1);
  }

  async function handleSaveProfile(payload: Record<string, unknown>) {
    if (!user) return;
    setProfileSaving(true);
    try {
      const updatedProfile = await updateProfile(user.id, payload);
      setProfile(updatedProfile);
      const updatedDashboard = await fetchDashboard(user.id);
      setDashboard(updatedDashboard);
      const updatedAdvice = await previewAdvice(user.id).catch(() => null);
      setAdvice(updatedAdvice?.advice ?? null);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSaveProfileField(field: string, value: string) {
    if (!user) return;
    
    // Pass existing profile fields to prevent the backend from resetting them to default values (e.g. alertThreshold -> 140)
    const payload: Record<string, unknown> = {
      alertThreshold: profile?.profile?.alert_threshold ?? 140,
      defaultMaxRouteRatio: profile?.profile?.default_max_route_ratio ?? 1.5,
      phone: profile?.profile?.phone,
      primaryActivityId: profile?.profile?.primary_activity_id,
      maskPreference: profile?.profile?.mask_preference,
    };

    if (field === "name") {
      payload.fullName = value;
    } else if (field === "phone") {
      payload.phone = value;
    } else if (field === "password") {
      payload.password = value;
    } else {
      payload[field] = value;
    }

    await handleSaveProfile(payload);
  }

  async function handleUpdateNotificationPref(field: string, value: boolean) {
    if (!user) return;
    setProfileSaving(true);
    try {
      const updatedPrefs = await updateNotificationPreferences(user.id, {
        [field]: value,
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              notificationPreferences: updatedPrefs.notificationPreferences,
            }
          : prev,
      );
    } catch (err) {
      console.error("Failed to update preferences:", err);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleCreateRoute(payload: {
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
    if (!user) return;
    setRouteSubmitting(true);
    try {
      await createRouteRequest({
        userId: user.id,
        ...payload,
      });
      const [dashboardData, routeHistoryData, notificationData] = await Promise.all([
        fetchDashboard(user.id),
        fetchRouteHistory(user.id),
        fetchNotifications(user.id),
      ]);
      setDashboard(dashboardData);
      setRouteHistory(routeHistoryData.routeRequests);
      setNotifications(notificationData.notifications);
    } finally {
      setRouteSubmitting(false);
    }
  }

  const handleRefreshGpsAqi = useCallback(async () => {
    if (!navigator.geolocation) {
      // No geolocation support — silently use B1 fallback
      setGpsCoords({ lat: 21.0041, lng: 105.8428 });
      try {
        const data = await fetchGpsAqiWithFallback(21.0041, 105.8428);
        setGpsAqi(data.measurement);
      } catch { /* ignore */ }
      return;
    }

    try {
      const permission = await navigator.permissions?.query?.({ name: "geolocation" as PermissionName });
      if (permission?.state === "denied") {
        // Permission denied — silently fall back to B1
        setGpsCoords({ lat: 21.0041, lng: 105.8428 });
        try {
          const data = await fetchGpsAqiWithFallback(21.0041, 105.8428);
          setGpsAqi(data.measurement);
        } catch { /* ignore */ }
        return;
      }
    } catch {
      // ignore unsupported permissions API
    }

    setGpsLoading(true);
    setGpsError(null);

    const getPosition = (options: PositionOptions) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

    const resolvePosition = async () => {
      try {
        return await getPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
      } catch (geolocationError) {
        const errorValue = geolocationError as GeolocationPositionError;
        if (errorValue.code === 3) {
          return await getPosition({ enableHighAccuracy: false, timeout: 18000, maximumAge: 0 });
        }
        throw geolocationError;
      }
    };

    try {
      const position = await resolvePosition();
      const { latitude, longitude } = position.coords;
      setGpsCoords({ lat: latitude, lng: longitude });
      setGpsAqi(null);

      try {
        const data = await fetchGpsAqiWithFallback(latitude, longitude);
        setGpsAqi(data.measurement);

        const nextAqi = data.measurement.aqi;
        const nextTone = getAqiRangeTone(nextAqi);
        const previousAqi = lastStoredAqiRef.current;
        const previousTone = lastStoredToneRef.current;

        if (nextAqi !== null && nextTone !== previousTone) {
          const alertItem = buildAqiAlert(data.measurement, previousAqi);
          if (alertItem) {
            setAqiAlerts((current) => [alertItem, ...current].slice(0, 5));
            setAqiUnreadCount((current) => current + 1);
          }
        }

        lastStoredAqiRef.current = nextAqi;
        lastStoredToneRef.current = nextTone;

        if (typeof window !== "undefined") {
          window.localStorage.setItem("airparth:lastAqiValue", nextAqi === null ? "" : String(nextAqi));
          window.localStorage.setItem("airparth:lastAqiTone", nextTone);
        }
      } catch {
        // AQI fetch failed — silently ignore, gpsAqi stays null
      }
    } catch (error) {
      console.warn("Lỗi lấy GPS. Dùng vị trí dự phòng tòa B1:", error);
      
      // Fallback coordinates: B1 Building, Hanoi University of Science and Technology
      const fallbackLat = 21.0041;
      const fallbackLng = 105.8428;
      
      setGpsCoords({ lat: fallbackLat, lng: fallbackLng });
      
      try {
        const data = await fetchGpsAqiWithFallback(fallbackLat, fallbackLng);
        setGpsAqi(data.measurement);
      } catch { /* ignore */ }
    } finally {
      setGpsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || role === "guest" || role === "admin") {
      lastThresholdAlertStateRef.current = null;
      return;
    }

    const currentGpsAqi = gpsAqi;
    if (!currentGpsAqi || currentGpsAqi.aqi === null || currentGpsAqi.aqi === undefined) {
      return;
    }

    const threshold = profile?.profile?.alert_threshold ?? 140;
    const isUnsafe = currentGpsAqi.aqi >= threshold;
    const isStateChanged = lastThresholdAlertStateRef.current !== (isUnsafe ? "unsafe" : "safe");
    const isThresholdChanged = lastAlertedThresholdRef.current !== threshold;

    if (isUnsafe && (isStateChanged || isThresholdChanged)) {
      const isPushEnabled = profile?.notificationPreferences?.push_enabled !== false;
      const isEmailEnabled = profile?.notificationPreferences?.email_enabled === true;
      const alertItem = buildThresholdAqiAlert(currentGpsAqi, threshold, true);
      
      if (alertItem) {
        setAqiAlerts((current) => [alertItem, ...current].slice(0, 5));
        setAqiUnreadCount((current) => current + 1);

        if (isPushEnabled || isEmailEnabled) {
          // Dispatch real push notification + email via backend
          void dispatchAqiAlert(user.id, {
            title: alertItem.title,
            body: alertItem.body,
            aqi: alertItem.aqi,
            aqiLabel: alertItem.toneLabel,
            location: alertItem.location,
          }).catch((err) => {
            // Non-fatal — in-app alert already shown
            console.warn("[AQI Dispatch] Failed to send push/email:", err?.message);
          });
        }
      }

      lastAlertedThresholdRef.current = threshold;
    }

    lastThresholdAlertStateRef.current = isUnsafe ? "unsafe" : "safe";
  }, [gpsAqi, profile?.profile?.alert_threshold, role, user]);

  useEffect(() => {
    if (!user || view !== "home" || gpsAqi || gpsLoading || hasAutoLoadedGpsAqiRef.current) {
      return;
    }

    hasAutoLoadedGpsAqiRef.current = true;
    void handleRefreshGpsAqi();
  }, [gpsAqi, gpsLoading, handleRefreshGpsAqi, user, view]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
  );

  const mergedLocations = useMemo(() => mergeExercisePlaces(locations), [locations]);

  const resolveBackendLocation = useCallback(
    (location: LocationItem | null) => {
      if (!location) {
        return null;
      }

      const key = normalizeLocationKey(location);
      const matched = locations.find((item) => normalizeLocationKey(item) === key);
      return matched ? { ...location, ...matched } : location;
    },
    [locations],
  );

  const selectedBackendLocation = useMemo(
    () => resolveBackendLocation(selectedLocation),
    [resolveBackendLocation, selectedLocation],
  );

  const loadSelectedLocationReviews = useCallback(async (locationId: string) => {
    if (!isUuid(locationId)) {
      setSelectedLocationReviews([]);
      setSelectedLocationReviewsError(null);
      setSelectedLocationReviewsLoading(false);
      return;
    }

    setSelectedLocationReviewsLoading(true);
    setSelectedLocationReviewsError(null);

    try {
      const response = await fetchLocationReviews(locationId);
      setSelectedLocationReviews(response.reviews);
    } catch (error) {
      setSelectedLocationReviewsError(error instanceof Error ? error.message : "Không thể tải đánh giá.");
    } finally {
      setSelectedLocationReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedBackendLocation || (view !== "spot-detail" && view !== "reviews")) {
      setSelectedLocationReviews([]);
      setSelectedLocationReviewsError(null);
      setSelectedLocationReviewsLoading(false);
      return;
    }

    void loadSelectedLocationReviews(selectedBackendLocation.id);
  }, [loadSelectedLocationReviews, selectedBackendLocation, view]);

  useEffect(() => {
    if (!selectedLocation || view !== "spot-detail") {
      selectedLocationAqiAbortRef.current?.abort();
      setSelectedLocationAqiLoading(false);
      setSelectedLocationAqiError(null);
      return;
    }

    void loadSelectedLocationAqi(selectedLocation);

    return () => {
      selectedLocationAqiAbortRef.current?.abort();
    };
  }, [loadSelectedLocationAqi, selectedLocation, view]);


  const handleSubmitLocationReview = useCallback(
    async ({ rating, content }: { rating: number; content: string }) => {
      if (!selectedBackendLocation || !user) {
        throw new Error("Không tìm thấy địa điểm hoặc người dùng đã chọn.");
      }

      if (!isUuid(selectedBackendLocation.id)) {
        throw new Error("Địa điểm này chưa hỗ trợ tính năng đánh giá.");
      }

      const blockedLanguages = getBlockedCommentLanguages(content);
      const isFlagged = blockedLanguages.length > 0;

      const response = await createLocationReview(selectedBackendLocation.id, {
        userId: user.id,
        rating,
        content,
        is_hidden: isFlagged,
        metadata: isFlagged ? { moderation: { blocked_languages: blockedLanguages } } : undefined,
      } as any);

      // If flagged, don't show it in public review list. Instead refresh notifications and moderation.
      if (response.review.is_hidden) {
        setAqiAlerts((current) => [buildFlaggedCommentAlert(user.full_name ?? user.email, content), ...current].slice(0, 5));
        setAqiUnreadCount((current) => current + 1);

        // refresh notifications so bell shows the new flagged notice
        try {
          const data = await fetchNotifications(user.id);
          setNotifications(data.notifications);
        } catch (err) {
          // ignore
        }
      } else {
        setSelectedLocationReviews((current) => [response.review, ...current]);
      }
      void reloadLocations().catch(() => {});
    },
    [selectedBackendLocation, user, view, reloadLocations],
  );

  const handleUpdateAvatarSelection = useCallback(
    (selection: AvatarSelection) => {
      if (!user?.id) {
        return;
      }

      saveAvatarSelection(user.id, selection);
      setAvatarSelection(selection);
    },
    [user?.id],
  );

  if (!user) {
    return showRegister ? (
      <RegisterScreenDemo
        onRegister={handleRegister}
        onLoginClick={() => {
          setAuthError(null);
          setAuthSuccess(null);
          setShowRegister(false);
        }}
        isLoading={loadingAuth}
        error={authError ?? undefined}
      />
    ) : (
      <LoginScreenDemo
        onUserLogin={handleUserLogin}
        onAdminLogin={handleAdminLogin}
        onRegisterClick={() => {
          setAuthError(null);
          setAuthSuccess(null);
          setShowRegister(true);
        }}
        onGuestContinue={handleGuestContinue}
        onForgotPassword={handleForgotPassword}
        isLoading={loadingAuth}
        error={authError ?? undefined}
        success={authSuccess ?? undefined}
      />
    );
  }

  if (role === "admin") {
    return <AdminWorkspace userId={user.id} userName={user.full_name || user.email} userEmail={user.email} onLocationsChanged={reloadLocations} onLogout={() => {
      setUser(null);
      setRole("user");
      setView("home");
      setDashboard(null);
      setProfile(null);
      setNotifications([]);
      setAdvice(null);
      setRouteHistory([]);
      setSelectedLocation(null);
      applyBootstrapAqiSnapshot(bootstrap.aqiSnapshot);
      setGpsError(null);
    }} bootstrapAqiSnapshot={bootstrap.aqiSnapshot} />;
  }

  return (
      <ShellDemo
        role={role}
        view={view}
        setView={setView}
        userName={user.full_name || user.email}
        avatarSelection={avatarSelection}
        onRequireLogin={() => {
          setGlobalError("Vui lòng đăng nhập để sử dụng tính năng này.");
          setView("home");
        }}
      onShowLogin={() => {
        // Navigate to login screen by clearing current user (will render LoginScreenDemo)
        setRedirectAfterLogin(view);
        setUser(null);
        setGlobalError(null);
      }}
      aqiAlerts={aqiAlerts}
      aqiUnreadCount={aqiUnreadCount}
      onAqiBellClick={handleAqiBellClick}
      onLogout={() => {
        setUser(null);
        setDashboard(null);
        setProfile(null);
        setNotifications([]);
        setAdvice(null);
        setRouteHistory([]);
        setSelectedLocation(null);
        applyBootstrapAqiSnapshot(bootstrap.aqiSnapshot);
        setGpsError(null);
        setAqiAlerts([]);
        setAqiUnreadCount(0);
        lastThresholdAlertStateRef.current = null;
        lastAlertedThresholdRef.current = null;
        setRole("user");
        setView("home");
      }}
    >
      {globalError && (
        <div className="mb-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
          {globalError}
        </div>
      )}

      {view === "home" && (
        <HomeViewDemo
          dashboard={dashboard}
          advice={advice}
          gpsAqi={gpsAqi}
          gpsCoords={gpsCoords}
          gpsLoading={gpsLoading}
          onOpenAqiAlert={() => setView("alert")}
          onRefreshGpsAqi={handleRefreshGpsAqi}
          gpsError={gpsError}
        />
      )}

      {view === "alert" && (
        <AqiAlertScreen
          gpsAqi={gpsAqi}
          gpsCoords={gpsCoords}
          locations={mergedLocations}
          onBack={() => setView("home")}
          onOpenSuggestion={(location) => {
            const backendLocation = resolveBackendLocation(location);
            setSelectedLocation(backendLocation);
            setSelectedLocationAqi(null);
            setSelectedLocationAqiError(null);
            setSelectedLocationAqiLoading(true);
            setView("spot-detail");
          }}
        />
      )}

      {view === "search" && (
      <SearchLocationsView
        locations={mergedLocations}
        currentPosition={gpsCoords}
        onSelectLocation={(location) => {
            const backendLocation = resolveBackendLocation(location);
            setSelectedLocation(backendLocation);
            setSelectedLocationAqi(null);
            setSelectedLocationAqiError(null);
            setSelectedLocationAqiLoading(true);
            setView("spot-detail");
          }}
          onRequireLogin={() => {
            setGlobalError("Vui lòng đăng nhập để xem chi tiết địa điểm.");
          }}
        />
      )}

      {view === "spot-detail" && (
        <LocationDetailView
          location={selectedLocation}
          aqiMeasurement={selectedLocationAqi}
          aqiLoading={selectedLocationAqiLoading}
          aqiError={selectedLocationAqiError}
          isGuest={role === "guest"}
          reviews={selectedLocationReviews}
          reviewsLoading={selectedLocationReviewsLoading}
          reviewsError={selectedLocationReviewsError}
          currentUserId={user.id}
          currentUserAvatarSelection={avatarSelection}
          onRequireLogin={() => {
            setGlobalError("Vui lòng đăng nhập để viết đánh giá hoặc xem chi tiết.");
          }}
            onShowLogin={() => {
              setRedirectAfterLogin("spot-detail");
              setUser(null);
              setGlobalError(null);
            }}
          onOpenReviews={() => setView("reviews")}
          onOpenRoute={() => setView("route")}
          onBack={() => setView("search")}
          onSubmitReview={handleSubmitLocationReview}
        />
      )}

      {view === "reviews" && (
        <ReviewsListView
          locationName={selectedBackendLocation?.name ?? selectedLocation?.name ?? "Địa điểm"}
          reviews={selectedLocationReviews}
          reviewsLoading={selectedLocationReviewsLoading}
          reviewsError={selectedLocationReviewsError}
          currentUserId={user.id}
          currentUserAvatarSelection={avatarSelection}
          onBack={() => setView("spot-detail")}
        />
      )}

      {view === "route" && role === "guest" && (
        <GuestRoutePreview
          locations={mergedLocations}
          onShowLogin={() => {
            setRedirectAfterLogin("route");
            setUser(null);
            setGlobalError(null);
          }}
          onBack={() => setView(selectedLocation ? "spot-detail" : "home")}
        />
      )}

      {view === "route" && role !== "guest" && (
        <RoutePlannerView
          origin={gpsCoords ? { label: "Vị trí hiện tại", lat: gpsCoords.lat, lng: gpsCoords.lng } : null}
          destination={selectedLocation}
          locations={mergedLocations.map((location) => ({
            id: location.id,
            name: location.name,
            lat: location.lat,
            lng: location.lng,
            address: location.address ?? undefined,
            city: location.city ?? undefined,
            district: location.district,
          }))}
          maxRatio={maxRatio}
          setMaxRatio={setMaxRatio}
          onSubmit={handleCreateRoute}
          routeHistory={routeHistory}
          loading={routeSubmitting}
          onBack={() => setView(selectedLocation ? "spot-detail" : "home")}
        />
      )}

      {view === "profile" && (
        <ProfileViewDemo
          user={{
            id: user.id,
            name: profile?.user.full_name ?? user.full_name ?? user.email,
            email: user.email,
            phone: profile?.profile?.phone ?? "",
            joinDate: profile?.user.created_at ?? new Date().toISOString(),
          }}
          aqiThreshold={profile?.profile?.alert_threshold ?? 140}
          onUpdateProfile={handleSaveProfileField}
          avatarSelection={avatarSelection}
          onUpdateAvatarSelection={handleUpdateAvatarSelection}
          onLogout={() => {
            setUser(null);
            setDashboard(null);
            setProfile(null);
            setNotifications([]);
            setAdvice(null);
            setRouteHistory([]);
            setSelectedLocation(null);
            applyBootstrapAqiSnapshot(bootstrap.aqiSnapshot);
            setGpsError(null);
            setAqiAlerts([]);
            setAqiUnreadCount(0);
            lastThresholdAlertStateRef.current = null;
            lastAlertedThresholdRef.current = null;
            setAvatarSelection(defaultAvatarSelection);
            setRole("user");
            setView("home");
          }}
          isLoading={profileSaving}
          pushEnabled={profile?.notificationPreferences?.push_enabled !== false}
          emailEnabled={profile?.notificationPreferences?.email_enabled === true}
          onUpdatePushNotification={(enabled) => handleUpdateNotificationPref("pushEnabled", enabled)}
          onUpdateEmailNotification={(enabled) => handleUpdateNotificationPref("emailEnabled", enabled)}
        />
      )}
    </ShellDemo>
  );
}

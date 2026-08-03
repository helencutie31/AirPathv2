import { useEffect, useRef, useState } from "react";
import { ArrowLeft, LocateFixed, Navigation } from "lucide-react";
import { planRoutes } from "@/lib/api";
import { RouteMapCanvas } from "./RouteMapCanvas";
import type { PlannedRoutesResponse, RouteOption } from "@/lib/types";

type LocationItem = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string | null;
  city?: string | null;
  district: string | null;
};

type RouteCoords = {
  label: string;
  lat: number;
  lng: number;
  heading?: number | null;
};

type Props = {
  locations: LocationItem[];
  origin?: RouteCoords | null;
  destination?: LocationItem | null;
  maxRatio: number;
  setMaxRatio: (value: number) => void;
  onSubmit: (payload: {
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
  }) => Promise<void>;
  routeHistory: Array<Record<string, unknown>>;
  loading: boolean;
  onBack?: () => void;
};

export function RoutePlannerView({ locations, origin, destination, maxRatio, setMaxRatio, onSubmit, routeHistory, loading, onBack }: Props) {
  const selectedRouteKind = "green";
  const [submitting, setSubmitting] = useState(false);
  const [planResult, setPlanResult] = useState<PlannedRoutesResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [originPosition, setOriginPosition] = useState<RouteCoords | null>(null);
  const [currentPosition, setCurrentPosition] = useState<RouteCoords | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [centerRequestId, setCenterRequestId] = useState(0);
  const [navigationStarted, setNavigationStarted] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [rerouteMessage, setRerouteMessage] = useState<string | null>(null);
  const [lastRerouteAt, setLastRerouteAt] = useState<number>(0);
  const planRequestIdRef = useRef(0);

  const routeDestination = destination ?? locations[0] ?? null;

  useEffect(() => {
    const loadOriginPosition = async () => {
      if (!navigator?.geolocation) {
        setPlanError("Trình duyệt không hỗ trợ định vị GPS.");
        return;
      }

      setGeoLoading(true);
      setPlanError(null);
      let hasPosition = false;
      let bestAccuracy = Number.POSITIVE_INFINITY;

      const getPosition = (options: PositionOptions) =>
        new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });

      const applyPosition = (position: GeolocationPosition) => {
        if (hasPosition && position.coords.accuracy >= bestAccuracy) {
          return;
        }

        hasPosition = true;
        bestAccuracy = position.coords.accuracy;
        const nextPosition = {
          label: "Vị trí hiện tại",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading ?? null,
        };
        setOriginPosition(nextPosition);
        setCurrentPosition(nextPosition);
      };

      try {
        // A cached browser GPS fix makes the first route appear quickly.
        try {
          applyPosition(await getPosition({ enableHighAccuracy: false, timeout: 2500, maximumAge: 60000 }));
        } catch {
          // Continue to the fresh high-accuracy fix below.
        }

        applyPosition(await getPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }));
      } catch (error) {
        if (!hasPosition) {
          setPlanError("Không thể lấy vị trí GPS. Hãy bật quyền vị trí và thử lại.");
        }
      } finally {
        setGeoLoading(false);
      }
    };

    void loadOriginPosition();
  }, []);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!originPosition || !routeDestination) return;

      const requestId = ++planRequestIdRef.current;
      setPlanLoading(true);
      setPlanError(null);
      try {
        const plan = await planRoutes({
          origin: originPosition,
          destination: {
            label: routeDestination.name,
            lat: routeDestination.lat,
            lng: routeDestination.lng,
          },
          maxRatio,
        });
        if (requestId === planRequestIdRef.current) {
          setPlanResult(plan);
        }
      } catch (error) {
        if (requestId === planRequestIdRef.current) {
          let msg = error instanceof Error ? error.message : "Lộ trình。";
          if (/failed to fetch/i.test(msg) || /network error/i.test(msg)) {
            msg = "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.";
          } else if (/timeout/i.test(msg) || /aborted/i.test(msg)) {
            msg = "Yêu cầu đã hết thời gian chờ.";
          } else if (/request failed/i.test(msg) || /internal server error/i.test(msg)) {
            msg = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.";
          } else if (/user denied geolocation/i.test(msg)) {
            msg = "Không thể lấy vị trí GPS. Vui lòng bật quyền vị trí.";
          }
          setPlanError(msg);
          setPlanResult(null);
        }
      } finally {
        if (requestId === planRequestIdRef.current) {
          setPlanLoading(false);
        }
      }
    };

    void fetchPlan();
  }, [originPosition, routeDestination, maxRatio]);

  useEffect(() => {
    let watchId: number | null = null;

    if (!navigationStarted) {
      return;
    }

    if (!navigator?.geolocation) {
      setTrackingError("Trình duyệt không hỗ trợ theo dõi vị trí thời gian thực.");
      return;
    }

    setTrackingError(null);
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentPosition({
          label: "Vị trí hiện tại",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading ?? null,
        });
      },
      (error) => {
        setTrackingError("Không thể theo dõi vị trí. Hãy bật quyền GPS và thử lại.");
        console.error("GPS watchPosition error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000,
      },
    );

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [navigationStarted]);

  const selectedRoute = planResult?.recommendations.find((route) => route.kind === selectedRouteKind) ??
    planResult?.recommendations[0] ?? null;
  const mapPlanResult = planResult ?? (
    originPosition && routeDestination
      ? {
          origin: originPosition,
          destination: {
            label: routeDestination.name,
            lat: routeDestination.lat,
            lng: routeDestination.lng,
          },
          maxRatio,
          recommendations: [],
        }
      : null
  );

  useEffect(() => {
    if (
      !navigationStarted ||
      !currentPosition ||
      !selectedRoute ||
      !routeDestination ||
      !selectedRoute.route.geometry?.coordinates?.length
    ) {
      return;
    }

    const deviationMeters = calculateRouteDeviationMeters(
      currentPosition,
      selectedRoute.route.geometry.coordinates,
    );

    if (deviationMeters > 40 && Date.now() - lastRerouteAt > 15000) {
      setRerouteMessage(`Lộ trình ${Math.round(deviationMeters)}m 。...`);
      setOriginPosition({
        label: "Vị trí hiện tại",
        lat: currentPosition.lat,
        lng: currentPosition.lng,
        heading: currentPosition.heading ?? null,
      });
      setLastRerouteAt(Date.now());
    } else if (deviationMeters > 25) {
      setRerouteMessage(`Lộ trình ${Math.round(deviationMeters)}m 。。`);
    } else {
      setRerouteMessage(null);
    }
  }, [currentPosition, navigationStarted, selectedRoute, routeDestination, lastRerouteAt]);

  const routeData = selectedRoute
    ? {
        title: selectedRoute.title,
        distanceKm: selectedRoute.route.distanceM / 1000,
        durationMinutes: Math.round(selectedRoute.route.durationS / 60),
        averageAqi: selectedRoute.route.avgAqi,
        exposure: selectedRoute.route.exposure,
      }
    : {
        title: "Lộ trìnhĐang tải",
        distanceKm: 0,
        durationMinutes: 0,
        averageAqi: 0,
        exposure: "low" as const,
      };

  const currentStep = selectedRoute?.route.steps?.[0] ?? null;
  const currentInstruction = planError
    ? planError
    : navigationStarted
    ? (currentStep
        ? `Lộ trình (${Math.round(currentStep.distanceM)} m)`
        : "Bạn đang đến gần điểm đến.")
    : (selectedRoute
        ? "Điều hướng đã sẵn sàng. Bắt đầu để xem hướng dẫn tiếp theo."
        : "Lộ trình。");
  const routeAqiLabel = planError ? "Lỗi" : routeData.averageAqi > 0 ? `${Math.round(routeData.averageAqi)}` : "Đang tải";

  async function startRealTimeNavigation() {
    if (!planResult || !selectedRoute || !originPosition || !routeDestination) {
      return;
    }

    setNavigationStarted(true);
    setCurrentPosition(originPosition);
    setTrackingError(null);
    setSubmitting(true);
    try {
      const options: RouteOption[] = planResult.recommendations.map((recommendation) => ({
        routeName: recommendation.title,
        distanceM: recommendation.route.distanceM,
        durationS: recommendation.route.durationS,
        avgAqi: recommendation.route.avgAqi,
        exposureScore: recommendation.route.exposureScore,
        exposure: recommendation.route.exposure,
        isRecommended: recommendation.kind === selectedRouteKind,
        isWithinRatio: recommendation.route.isWithinRatio,
        aqiSavingPercent: null,
        polyline: recommendation.route.polyline ?? "",
      }));

      await onSubmit({
        originLabel: originPosition.label,
        originLat: originPosition.lat,
        originLng: originPosition.lng,
        destinationLabel: routeDestination.name,
        destinationLat: routeDestination.lat,
        destinationLng: routeDestination.lng,
        maxRatio,
        shortestDistanceM: selectedRoute.route.distanceM,
        shortestDurationS: selectedRoute.route.durationS,
        options,
      });
    } catch (error) {
      console.error(error);
      alert("Không thể bắt đầu điều hướng. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function centerMapToUserLocation() {
    const position = currentPosition ?? originPosition;
    if (position) {
      setCenterRequestId((current) => current + 1);
    }

    if (!navigator?.geolocation) return;

    try {
      const freshPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 5000,
        });
      });
      setCurrentPosition({
        label: "Vị trí hiện tại",
        lat: freshPosition.coords.latitude,
        lng: freshPosition.coords.longitude,
        heading: freshPosition.coords.heading ?? null,
      });
      setCenterRequestId((current) => current + 1);
    } catch {
      // Keep the latest known position centered if a fresh GPS fix is unavailable.
    }
  }

  function getDistanceKm(a: RouteCoords, b: { lat: number; lng: number }) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const c = 2 * Math.atan2(
      Math.sqrt(sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng),
      Math.sqrt(1 - (sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng)),
    );
    return R * c;
  }

  function calculateRouteDeviationMeters(current: RouteCoords, geometry: number[][]) {
    const latAvg = (current.lat * Math.PI) / 180;
    const cosLat = Math.cos(latAvg);

    const pointToXY = (lat: number, lng: number) => ({
      x: lng * cosLat * 111320,
      y: lat * 110574,
    });

    const p = pointToXY(current.lat, current.lng);
    let best = Number.POSITIVE_INFINITY;

    for (let i = 0; i + 1 < geometry.length; i += 1) {
      const [lng1, lat1] = geometry[i];
      const [lng2, lat2] = geometry[i + 1];
      const a = pointToXY(lat1, lng1);
      const b = pointToXY(lat2, lng2);
      const dx = b.x - a.x;
      const dy = b.y - a.y;

      if (dx === 0 && dy === 0) {
        best = Math.min(best, Math.hypot(p.x - a.x, p.y - a.y));
        continue;
      }

      const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
      const projection = t < 0 ? a : t > 1 ? b : { x: a.x + t * dx, y: a.y + t * dy };
      best = Math.min(best, Math.hypot(p.x - projection.x, p.y - projection.y));
    }

    return best;
  }

  const distanceToDestinationKm = currentPosition && routeDestination
    ? Math.max(0, getDistanceKm(currentPosition, { lat: routeDestination.lat, lng: routeDestination.lng }))
    : 0;

  const routeStatus = navigationStarted ? "Đang điều hướng" : "Lộ trìnhĐánh giá";
  function handleBackToPreview() {
    if (!navigationStarted) {
      // In preview mode: call onBack to exit the route view
      if (onBack) {
        onBack();
        return;
      }
      setNavigationStarted(false);
      setTrackingError(null);
      setRerouteMessage(null);
      if (originPosition) {
        setCurrentPosition(originPosition);
      }
      return;
    }

    // When navigation is active, stop navigation and keep in route view
    setNavigationStarted(false);
    setTrackingError(null);
    setRerouteMessage(null);
    if (originPosition) {
      setCurrentPosition(originPosition);
    }
  }

  return (
    <div className="route-page absolute inset-0 isolate overflow-hidden bg-slate-950 text-slate-900">
      <div className="absolute inset-0 z-0">
        <div className="h-full w-full overflow-hidden">
          <div className="route-map-layer relative z-0 h-full w-full">
            <RouteMapCanvas
              planResult={mapPlanResult}
              routes={planResult?.recommendations.map((recommendation) => ({
                ...recommendation,
                color:
                  recommendation.kind === "green"
                    ? "#10b981"
                    : recommendation.kind === "shortest"
                    ? "#2563eb"
                    : "#f59e0b",
              })) ?? []}
              selectedKind={selectedRouteKind}
              currentPosition={currentPosition}
              tracking={navigationStarted}
              centerRequestId={centerRequestId}
              heightClassName="h-full"
            />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 top-0 z-40 px-4 pt-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-[2rem] border border-white/10 bg-slate-950/85 px-4 py-3 shadow-2xl shadow-slate-950/40 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToPreview}
              className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-900/90 text-white ring-1 ring-white/10 transition hover:bg-slate-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">AirPath Navigation</div>
              <h1 className="text-sm sm:text-xl font-semibold text-white truncate max-w-[140px] sm:max-w-none">Chế độ điều hướng</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={centerMapToUserLocation}
            className="whitespace-nowrap inline-flex items-center gap-2 rounded-3xl bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm shadow-slate-950/10"
          >
            <LocateFixed className="h-4 w-4" />
            Vị trí hiện tại
          </button>
        </div>
      </div>
      {navigationStarted ? (
        <div className="absolute inset-x-0 top-[104px] sm:top-24 z-50 px-4">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.5rem] bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80 backdrop-blur-sm">
            <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{routeStatus}</div>
                <div className={`mt-1 text-sm font-semibold ${planError ? "text-red-600" : "text-slate-950 truncate"}`}>{currentInstruction}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <div>Khoảng cách</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">{routeData.distanceKm.toFixed(1)} km</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <div>Thời gian</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">{routeData.durationMinutes} phút</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <div>AQI</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">{routeAqiLabel}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-16 z-50 px-4 pb-4 sm:bottom-20 sm:pb-5">
          <div className="mx-auto max-w-6xl overflow-y-auto max-h-[50vh] rounded-[2rem] bg-white/95 shadow-[0_40px_100px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80 backdrop-blur-sm">
            <div className="px-4 py-4 sm:px-5 sm:py-4">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{routeStatus}</div>
                  <div className={`mt-1.5 text-base font-semibold ${planError ? "text-red-600" : "text-slate-950"}`}>{currentInstruction}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-2.5">
                <div className="rounded-2xl sm:rounded-3xl bg-slate-50 p-2 sm:p-3.5">
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-slate-500">Khoảng cách</div>
                  <div className="mt-1 sm:mt-1.5 text-sm sm:text-xl font-semibold text-slate-950">{routeData.distanceKm.toFixed(1)} km</div>
                </div>
                <div className="rounded-2xl sm:rounded-3xl bg-slate-50 p-2 sm:p-3.5">
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-slate-500">Thời gian</div>
                  <div className="mt-1 sm:mt-1.5 text-sm sm:text-xl font-semibold text-slate-950">{routeData.durationMinutes} phút</div>
                </div>
                <div className="rounded-2xl sm:rounded-3xl bg-slate-50 p-2 sm:p-3.5">
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-slate-500">Điểm đến</div>
                  <div className="mt-1 sm:mt-1.5 text-xs sm:text-xl font-semibold text-slate-950 truncate">{routeDestination?.name}</div>
                </div>
              </div>

              <div className="mt-2.5 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-2.5">
                <div className="rounded-2xl sm:rounded-3xl bg-slate-50 p-2 sm:p-3.5">
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-slate-500">Lộ trình AQI</div>
                  <div className="mt-1 sm:mt-1.5 text-sm sm:text-base font-semibold text-slate-950">{routeAqiLabel}</div>
                </div>
                <div className="rounded-2xl sm:rounded-3xl bg-slate-50 p-2 sm:p-3.5">
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-slate-500">Thông báo</div>
                  <div className="mt-1 sm:mt-1.5 text-xs sm:text-base font-semibold text-slate-950 truncate">{rerouteMessage ?? "Lộ trình"}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={submitting || loading}
                  onClick={startRealTimeNavigation}
                  className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-3xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Navigation className="h-4 w-4" />
                  {submitting || loading ? "Đang bắt đầu..." : "Bắt đầu điều hướng"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

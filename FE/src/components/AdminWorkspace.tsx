import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import L from "leaflet";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  CircleAlert,
  Edit3,
  MapPin,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  fetchAdminDashboard,
  fetchAdminHiddenReviews,
  fetchGpsAqiWithFallback,
  reverseGeocode,
  updateReview,
  deleteReview,
} from "@/lib/api";
import { Shell, type View } from "./Shell";
import {
  avatarFrames,
  avatarPresets,
  getAvatarSelectionStyle,
  type AvatarSelection,
  loadAvatarSelection,
  saveAvatarSelection,
} from "@/lib/avatar-presets";
import "../styles/demo-profile.css";
import {
  createLocation,
  deleteLocation,
  fetchLocations,
  updateLocation,
} from "@/lib/api";
import { cleanAddress } from "@/lib/guest-exercise-places";
import type { GpsAqiMeasurement, LocationRecord } from "@/lib/types";
import {
  getBlockedCommentLanguages,
  type BlockedCommentLanguage,
} from "@/lib/comment-blocklist";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

type Props = {
  userId: string;
  userName: string;
  userEmail: string;
  bootstrapAqiSnapshot: GpsAqiMeasurement | null;
  onLocationsChanged?: () => void | Promise<void>;
  onLogout: () => void;
};

type AdminOverview = {
  systemAqi: number;
  activeUsers: number;
  totalLocations: number;
  pendingModeration: number;
};

type LocationFormState = {
  name: string;
  locationType: string;
  city: string;
  district: string;
  address: string;
  lat: string;
  lng: string;
  description: string;
};

type MapPoint = {
  x: number;
  y: number;
};

type ModerationStatus = "unprocessed" | "deleted";
type ModerationStatusFilter = "all" | ModerationStatus;
type ModerationLanguageFilter = "all" | BlockedCommentLanguage;

type ModerationItem = {
  id: string;
  locationId: string;
  locationName: string;
  userId: string;
  author: string;
  violationCount: number;
  content: string;
  timestamp: string;
  blockedLanguages: BlockedCommentLanguage[];
  status: ModerationStatus;
};

const emptyForm: LocationFormState = {
  name: "",
  locationType: "indoor_place",
  city: "",
  district: "",
  address: "",
  lat: "",
  lng: "",
  description: "",
};

const locationTypeOptions = [
  { value: "indoor_place", label: "Cơ sở" },
  { value: "poi", label: "Địa điểm" },
  { value: "station", label: "ー" },
  { value: "district", label: "" },
  { value: "road_point", label: "" },
];

const hanoiMapBounds = {
  latMin: 20.96,
  latMax: 21.08,
  lngMin: 105.72,
  lngMax: 105.89,
};

const hanoiCenter = {
  lat: 21.0285,
  lng: 105.8542,
};

function mapPointToLatLng(point: MapPoint) {
  const lat =
    hanoiMapBounds.latMax -
    (point.y / 100) * (hanoiMapBounds.latMax - hanoiMapBounds.latMin);
  const lng =
    hanoiMapBounds.lngMin +
    (point.x / 100) * (hanoiMapBounds.lngMax - hanoiMapBounds.lngMin);

  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
}

function latLngToMapPoint(lat: number, lng: number) {
  const x =
    ((lng - hanoiMapBounds.lngMin) /
      (hanoiMapBounds.lngMax - hanoiMapBounds.lngMin)) *
    100;
  const y =
    ((hanoiMapBounds.latMax - lat) /
      (hanoiMapBounds.latMax - hanoiMapBounds.latMin)) *
    100;

  return { x, y };
}

function extractBlockedCommentLanguages(review: any) {
  const metadataLanguages = review?.metadata?.moderation?.blocked_languages;

  if (Array.isArray(metadataLanguages)) {
    const allowedLanguages = metadataLanguages.filter(
      (language): language is BlockedCommentLanguage =>
        language === "vi" || language === "ja",
    );
    if (allowedLanguages.length) {
      return allowedLanguages;
    }
  }

  return getBlockedCommentLanguages(String(review?.content ?? ""));
}

type AdminProfileDraft = {
  name: string;
  email: string;
  password: string;
};

function getAdminProfileStorageKey(userId: string) {
  return `airparth-admin-profile:${userId}`;
}

function loadAdminProfileDraft(
  userId: string,
  fallback: AdminProfileDraft,
): AdminProfileDraft {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(getAdminProfileStorageKey(userId));
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<AdminProfileDraft>;
    return {
      name:
        typeof parsed.name === "string" && parsed.name.trim()
          ? parsed.name
          : fallback.name,
      email:
        typeof parsed.email === "string" && parsed.email.trim()
          ? parsed.email
          : fallback.email,
      password:
        typeof parsed.password === "string" && parsed.password.trim()
          ? parsed.password
          : typeof (parsed as { phone?: string }).phone === "string" &&
            ((parsed as { phone: string }).phone).trim()
              ? (parsed as { phone: string }).phone
              : fallback.password,
    };
  } catch {
    return fallback;
  }
}

function saveAdminProfileDraft(userId: string, draft: AdminProfileDraft) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getAdminProfileStorageKey(userId),
      JSON.stringify(draft),
    );
  } catch {
    // Ignore storage failures and keep the in-memory state.
  }
}

function HanoiFacilityPickerMap({
  mapPoint,
  setMapPoint,
  setFormState,
}: {
  mapPoint: MapPoint;
  setMapPoint: (point: MapPoint) => void;
  setFormState: Dispatch<SetStateAction<LocationFormState>>;
}) {
  const markerLatLng = useMemo<[number, number]>(() => {
    return [
      hanoiMapBounds.latMax -
        (mapPoint.y / 100) * (hanoiMapBounds.latMax - hanoiMapBounds.latMin),
      hanoiMapBounds.lngMin +
        (mapPoint.x / 100) * (hanoiMapBounds.lngMax - hanoiMapBounds.lngMin),
    ];
  }, [mapPoint]);

  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng;
      const nextPoint = latLngToMapPoint(lat, lng);
      setMapPoint(nextPoint);
      const latStr = String(Number(lat.toFixed(6)));
      const lngStr = String(Number(lng.toFixed(6)));
      setFormState((current) => ({
        ...current,
        lat: latStr,
        lng: lngStr,
      }));
      reverseGeocode(lat, lng).then((res) => {
        if (res.address) {
          setFormState((current) => ({ ...current, address: cleanAddress(res.address) || "" }));
        }
      });
    },
  });

  return (
    <Marker
      position={markerLatLng}
      icon={facilityPickerIcon}
      draggable
      eventHandlers={{
        dragend: (event) => {
          const latLng = event.target.getLatLng();
          const { lat, lng } = latLng;
          const nextPoint = latLngToMapPoint(lat, lng);
          setMapPoint(nextPoint);
          const latStr = String(Number(lat.toFixed(6)));
          const lngStr = String(Number(lng.toFixed(6)));
          setFormState((current) => ({
            ...current,
            lat: latStr,
            lng: lngStr,
          }));
          reverseGeocode(lat, lng).then((res) => {
            if (res.address) {
              setFormState((current) => ({ ...current, address: cleanAddress(res.address) || "" }));
            }
          });
        },
      }}
    />
  );
}

function HanoiMapZoomSync({
  zoom,
  onZoomChange,
}: {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (map.getZoom() !== zoom) {
      map.setZoom(zoom, { animate: true });
    }
  }, [map, zoom]);

  useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
    },
  });

  return null;
}

function HanoiMapPositionSync({
  mapPoint,
  zoom,
}: {
  mapPoint: MapPoint;
  zoom: number;
}) {
  const map = useMap();
  const position = useMemo(() => mapPointToLatLng(mapPoint), [mapPoint]);

  useEffect(() => {
    map.invalidateSize({ animate: false });
    map.setView([position.lat, position.lng], zoom, { animate: true });
  }, [map, position.lat, position.lng, zoom]);

  return null;
}

const hanoiMapTileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const facilityPickerIcon = L.divIcon({
  className: "",
  html: `
    <div style="width: 34px; height: 34px; border-radius: 9999px; background: white; display: grid; place-items: center; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18); border: 1px solid rgba(226, 232, 240, 1);">
      <div style="width: 18px; height: 18px; border-radius: 9999px; background: #059669;"></div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

// moderation items will be loaded from backend hidden reviews

function getAqiTone(value: number) {
  if (value <= 50)
    return { label: "Tốt", badgeClass: "bg-emerald-100 text-emerald-700" };
  if (value <= 100)
    return { label: "Trung bình", badgeClass: "bg-amber-100 text-amber-700" };
  if (value <= 150)
    return { label: "Xấu", badgeClass: "bg-orange-100 text-orange-700" };
  return { label: "Xấu", badgeClass: "bg-rose-100 text-rose-700" };
}

export function AdminWorkspace({
  userId,
  userName,
  userEmail,
  bootstrapAqiSnapshot,
  onLocationsChanged,
  onLogout,
}: Props) {
  const [view, setView] = useState<View>("dashboard");
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [systemAqi, setSystemAqi] = useState<GpsAqiMeasurement | null>(null);
  const [systemAqiLoading, setSystemAqiLoading] = useState(false);
  const [systemAqiError, setSystemAqiError] = useState<string | null>(null);
  const [demoActiveUsers] = useState(() => 10);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(
    null,
  );
  const [formState, setFormState] = useState<LocationFormState>(emptyForm);
  const [mapPoint, setMapPoint] = useState<MapPoint>(() =>
    latLngToMapPoint(hanoiCenter.lat, hanoiCenter.lng),
  );
  const [mapZoom, setMapZoom] = useState(14);
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);
  const [mapInteractive, setMapInteractive] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const facilityPositionRequestId = useRef(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [adminAvatarSelection, setAdminAvatarSelection] =
    useState<AvatarSelection>(() => loadAvatarSelection(`admin_${userId}`));
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [pendingAvatarSelection, setPendingAvatarSelection] =
    useState<AvatarSelection>(adminAvatarSelection);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [adminName, setAdminName] = useState(
    () =>
      loadAdminProfileDraft(userId, {
        name: userName,
        email: userEmail,
        password: "adminsmhn",
      }).name,
  );
  const [adminEmail, setAdminEmail] = useState(
    () =>
      loadAdminProfileDraft(userId, {
        name: userName,
        email: userEmail,
        password: "adminsmhn",
      }).email,
  );
  const [adminPassword, setAdminPassword] = useState(
    () =>
      loadAdminProfileDraft(userId, {
        name: userName,
        email: userEmail,
        password: "adminsmhn",
      }).password,
  );

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;
    
    const removeDiacritics = (str: string) => {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
    };

    const query = removeDiacritics(searchQuery.toLowerCase().trim());
    
    return locations.filter((loc) => {
      const name = removeDiacritics(loc.name.toLowerCase());
      const address = removeDiacritics((loc.address || "").toLowerCase());
      return name.includes(query) || address.includes(query);
    });
  }, [locations, searchQuery]);
  const [editingAdminField, setEditingAdminField] = useState<string | null>(
    null,
  );
  const [adminEditValue, setAdminEditValue] = useState("");
  const [savingAdminField, setSavingAdminField] = useState<string | null>(null);
  const [moderationLocation, setModerationLocation] = useState("all");
  const [moderationLocationMenuOpen, setModerationLocationMenuOpen] =
    useState(false);
  const [moderationStatusFilter, setModerationStatusFilter] =
    useState<ModerationStatusFilter>("all");
  const [moderationStatusMenuOpen, setModerationStatusMenuOpen] =
    useState(false);
  const [moderationLanguageFilter, setModerationLanguageFilter] =
    useState<ModerationLanguageFilter>("all");
  const [moderationLanguageMenuOpen, setModerationLanguageMenuOpen] =
    useState(false);
  const [moderationStatusById, setModerationStatusById] = useState<
    Record<string, ModerationStatus>
  >({});
  const [moderationItemsList, setModerationItemsList] = useState<
    ModerationItem[]
  >([]);
  const [moderationUpdatingById, setModerationUpdatingById] = useState<
    Record<string, boolean>
  >({});
  const adminAvatarPreset =
    avatarPresets.find(
      (preset) => preset.id === adminAvatarSelection.avatarId,
    ) ?? avatarPresets[0];

  const loadModerationItems = async () => {
    try {
      const resp = await fetchAdminHiddenReviews();
      const items: ModerationItem[] = (resp.reviews || []).map((r: any) => ({
        id: String(r.id),
        locationId: String(r.location_id || ""),
        locationName: r.location_name || r.location_id || "",
        userId: String(r.user_id || ""),
        author: String(r.author || r.full_name || r.user_id || "Ẩn danh"),
        violationCount: 1,
        content: String(r.content || ""),
        timestamp: r.created_at ? new Date(r.created_at).toLocaleString() : "",
        blockedLanguages: extractBlockedCommentLanguages(r),
        status:
          r.metadata &&
          r.metadata.moderation &&
          r.metadata.moderation.status === "deleted"
            ? "deleted"
            : "unprocessed",
      }));
      setModerationItemsList(items);
      // Initialize statuses only for items we just loaded, but preserve existing manual overrides
      setModerationStatusById((current) => {
        const next = { ...current } as Record<string, ModerationStatus>;
        for (const it of items) {
          if (!(it.id in next)) next[it.id] = it.status;
        }
        return next;
      });
    } catch (err) {
      // ignore
    }
  };

  const loadOverview = async () => {
    try {
      const response = await fetchAdminDashboard();
      setOverview(response.overview);
    } catch (error) {
      setOverview(null);
    }
  };

  const handleRefreshSystemAqi = async () => {
    if (!navigator.geolocation) {
      setSystemAqiError("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }

    try {
      const permission = await navigator.permissions?.query?.({
        name: "geolocation" as PermissionName,
      });
      if (permission?.state === "denied") {
        setSystemAqiError(
          " GPS 。。",
        );
        return;
      }
    } catch {
      // ignore unsupported permissions API
    }

    setSystemAqiLoading(true);
    setSystemAqiError(null);

    const getPosition = (options: PositionOptions) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

    try {
      const position = await getPosition({
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }).catch(async (error) => {
        const errorValue = error as GeolocationPositionError;
        if (errorValue.code === 3) {
          return await getPosition({
            enableHighAccuracy: false,
            timeout: 18000,
            maximumAge: 0,
          });
        }
        throw error;
      });

      const { latitude, longitude } = position.coords;
      const data = await fetchGpsAqiWithFallback(latitude, longitude);
      setSystemAqi(data.measurement);
    } catch (error) {
      setSystemAqi(null);
      setSystemAqiError(
        error instanceof Error
          ? error.message
          : "IQAir  Không thể lấy AQI.",
      );
    } finally {
      setSystemAqiLoading(false);
    }
  };

  const refreshLocations = async () => {
    setLoadingLocations(true);
    setLocationsError(null);

    try {
      const response = await fetchLocations();
      setLocations(response.locations as LocationRecord[]);
    } catch (error) {
      setLocationsError(
        error instanceof Error
          ? error.message
          : "Cơ sở。",
      );
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    void refreshLocations();
    void loadOverview();
    setAdminAvatarSelection(loadAvatarSelection(`admin_${userId}`));
    setSystemAqi(bootstrapAqiSnapshot);
    setSystemAqiError(null);
    setSystemAqiLoading(false);
  }, [bootstrapAqiSnapshot, userId]);

  useEffect(() => {
    setPendingAvatarSelection(adminAvatarSelection);
  }, [adminAvatarSelection]);

  useEffect(() => {
    const draft = loadAdminProfileDraft(userId, {
      name: userName,
      email: userEmail,
      password: "adminsmhn",
    });
    setAdminName(draft.name);
    setAdminEmail(draft.email);
    setAdminPassword(draft.password);
  }, [userId, userName, userEmail]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        setMapInteractive(true);
      } else {
        setMapInteractive(false);
      }
    };

    const handleTouchEnd = () => {
      setMapInteractive(true);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  const moderationLocations = useMemo(() => {
    const entries = new Map<string, string>();
    for (const item of moderationItemsList) {
      if (!entries.has(item.locationId)) {
        entries.set(
          item.locationId,
          item.locationName.trim() || "Cơ sở",
        );
      }
    }

    return [
      { id: "all", label: "Tất cả" },
      ...Array.from(entries.entries()).map(([id, label]) => ({ id, label })),
    ];
  }, [moderationItemsList]);

  const moderationItems = useMemo(() => {
    return moderationItemsList.filter((item) => {
      const status = moderationStatusById[item.id] ?? item.status;
      const locationMatch =
        moderationLocation === "all"
          ? true
          : item.locationId === moderationLocation;
      const statusMatch =
        moderationStatusFilter === "all" || status === moderationStatusFilter;
      const languageMatch =
        moderationLanguageFilter === "all" ||
        item.blockedLanguages.includes(moderationLanguageFilter);

      return locationMatch && statusMatch && languageMatch;
    });
  }, [
    moderationLanguageFilter,
    moderationLocation,
    moderationStatusFilter,
    moderationStatusById,
    moderationItemsList,
  ]);

  const moderationLocationLabels = useMemo<Record<string, string>>(() => {
    return Object.fromEntries(
      moderationItemsList.map((item) => [item.locationId, item.locationName]),
    );
  }, [moderationItemsList]);

  const moderationLocationLabel =
    moderationLocations.find((location) => location.id === moderationLocation)
      ?.label ?? "Tất cả";
  const moderationStatusOptions: Array<{
    id: ModerationStatusFilter;
    label: string;
  }> = [
    { id: "all", label: "Tất cả" },
    { id: "unprocessed", label: "Chưa xử lý" },
    { id: "deleted", label: "Đã xóa" },
  ];
  const moderationLanguageOptions: Array<{
    id: ModerationLanguageFilter;
    label: string;
  }> = [
    { id: "all", label: "Tất cả" },
    { id: "vi", label: "" },
    { id: "ja", label: "" },
  ];
  const moderationStatusFilterLabel =
    moderationStatusOptions.find(
      (option) => option.id === moderationStatusFilter,
    )?.label ?? "Tất cả";
  const moderationLanguageFilterLabel =
    moderationLanguageOptions.find(
      (option) => option.id === moderationLanguageFilter,
    )?.label ?? "Tất cả";

  async function handleAdminAvatarSave() {
    setAdminAvatarSelection(pendingAvatarSelection);
    saveAvatarSelection(`admin_${userId}`, pendingAvatarSelection);
    setAvatarModalOpen(false);
  }

  function startAdminEdit(field: string, value: string) {
    setEditingAdminField(field);
    setAdminEditValue(value);
  }

  async function saveAdminEdit(field: string) {
    const nextValue = adminEditValue.trim();

    if (!nextValue) {
      setEditingAdminField(null);
      return;
    }

    setSavingAdminField(field);
    setEditingAdminField(null);

    try {
      const nextDraft: AdminProfileDraft = {
        name: field === "name" ? nextValue : adminName,
        email: field === "email" ? nextValue : adminEmail,
        password: field === "password" ? nextValue : adminPassword,
      };

      if (field === "name") setAdminName(nextValue);
      if (field === "email") setAdminEmail(nextValue);
      if (field === "password") setAdminPassword(nextValue);

      saveAdminProfileDraft(userId, nextDraft);
    } catch (error) {
      console.error("Failed to update admin profile:", error);
      setEditingAdminField(field);
      setAdminEditValue(nextValue);
    } finally {
      setSavingAdminField((current) => (current === field ? null : current));
    }
  }

  function getModerationLocationImage(locationId: string) {
    const normalized = locationId.toLowerCase();

    if (/(bachthao|ba^ch th?o|bach thao|bach_thao)/.test(normalized)) {
      return "https://images.unsplash.com/photo-1542272201-b1ca555f8505?auto=format&fit=crop&w=400&q=80";
    }

    if (/(hoankiem|hoan kiem)/.test(normalized)) {
      return "https://images.unsplash.com/photo-1559592413-7cea4ee303e1?auto=format&fit=crop&w=400&q=80";
    }

    if (/(tayho|tay ho)/.test(normalized)) {
      return "https://static.vinwonders.com/production/cong-vien-1.jpg";
    }

    return "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=400&q=80";
  }

  function getModerationAvatarLabel(item: ModerationItem) {
    const base =
      item.author.trim() ||
      item.userId.trim() ||
      item.locationName.trim() ||
      "A";
    const parts = base.split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : base.slice(0, 1);
    return initials.toUpperCase();
  }

  function startEdit(location: LocationRecord) {
    facilityPositionRequestId.current += 1;

    setEditingLocationId(location.id);
    setActionMessage(null);
    setFormError(null);
    setFormState({
      name: location.name,
      locationType: location.location_type,
      city: location.city ?? "",
      district: location.district ?? "",
      address: location.address ?? "",
      lat: String(location.lat),
      lng: String(location.lng),
      description: location.metadata?.description ?? "",
    });
    setMapPoint(latLngToMapPoint(location.lat, location.lng));
    setView("facility-add");
  }

  function resetForm() {
    facilityPositionRequestId.current += 1;
    setEditingLocationId(null);
    setFormState({
      ...emptyForm,
      lat: String(hanoiCenter.lat),
      lng: String(hanoiCenter.lng),
    });
    setMapPoint(latLngToMapPoint(hanoiCenter.lat, hanoiCenter.lng));
    setMapZoom(14);
    setFormError(null);
  }

  function openCreateLocationForm() {
    resetForm();
    setView("facility-add");

    if (!navigator.geolocation) {
      return;
    }

    const requestId = facilityPositionRequestId.current;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestId !== facilityPositionRequestId.current) {
          return;
        }

        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setFormState((current) => ({
          ...current,
          lat: String(lat),
          lng: String(lng),
        }));
        setMapPoint(latLngToMapPoint(lat, lng));
        setMapZoom(16);
      },
      () => {
        // Keep Hanoi center as the fallback when GPS permission is unavailable.
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  async function submitLocation() {
    if (!formState.name.trim()) {
      setFormError("Cơ sở。");
      return;
    }

    const payload = {
      name: formState.name.trim(),
      locationType: formState.locationType.trim(),
      city: formState.city.trim() || null,
      district: formState.district.trim() || null,
      address: formState.address.trim() || null,
      lat: Number(formState.lat),
      lng: Number(formState.lng),
      description: formState.description.trim() || null,
      amenities: editingLocationId
        ? (locations.find((location) => location.id === editingLocationId)
            ?.metadata?.amenities ?? [])
        : [],
    };

    if (Number.isNaN(payload.lat) || Number.isNaN(payload.lng)) {
      setFormError("。");
      return;
    }

    setSavingLocation(true);
    setFormError(null);
    setActionMessage(null);

    try {
      if (editingLocationId) {
        await updateLocation(editingLocationId, payload);
        setActionMessage("Cơ sở。");
      } else {
        await createLocation(payload);
        setActionMessage("Cơ sở。");
      }

      await refreshLocations();
      await onLocationsChanged?.();
      resetForm();
      setView("facilities");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Cơ sởLưu。",
      );
    } finally {
      setSavingLocation(false);
    }
  }

  async function handleDeleteConfirm(locationId: string) {
    setActionMessage(null);
    setDeletingLocationId(null);

    try {
      await deleteLocation(locationId);
      await refreshLocations();
      await onLocationsChanged?.();
      if (editingLocationId === locationId) {
        resetForm();
      }
      setActionMessage("Cơ sởXóa。");
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : "Cơ sởXóa。",
      );
    }
  }

  function setCommentStatus(commentId: string, status: ModerationStatus) {
    if (moderationUpdatingById[commentId]) {
      return;
    }

    // mark local state immediately
    setModerationStatusById((current) => ({ ...current, [commentId]: status }));

    setModerationUpdatingById((cur) => ({ ...cur, [commentId]: true }));

    if (status === "deleted") {
      deleteReview(commentId)
        .then(() => {
          // approved/deleted: remove from list
          setModerationItemsList((cur) =>
            cur.filter((it) => it.id !== commentId),
          );
          setModerationStatusById((cur) => {
            const next = { ...cur };
            delete next[commentId];
            return next;
          });
        })
        .catch((err) => {
          // revert status on error
          setModerationStatusById((cur) => ({
            ...cur,
            [commentId]: "unprocessed",
          }));
          window.alert(
            err instanceof Error
              ? err.message
              : "Xóa。",
          );
        })
        .finally(() => {
          setModerationUpdatingById((cur) => ({ ...cur, [commentId]: false }));
        });
    } else {
      const payload = {
        is_hidden: false,
        metadata: {
          moderation: {
            status: "approved",
            processed_by: "admin",
            processed_at: new Date().toISOString(),
          },
        },
      };
      updateReview(commentId, payload)
        .then(() => {
          // approved/unhidden: remove from hidden list
          setModerationItemsList((cur) =>
            cur.filter((it) => it.id !== commentId),
          );
          setModerationStatusById((cur) => {
            const next = { ...cur };
            delete next[commentId];
            return next;
          });
        })
        .catch((err) => {
          // revert status on error
          setModerationStatusById((cur) => ({
            ...cur,
            [commentId]: "deleted",
          }));
          window.alert(
            err instanceof Error
              ? err.message
              : "。",
          );
        })
        .finally(() => {
          setModerationUpdatingById((cur) => ({ ...cur, [commentId]: false }));
        });
    }
  }

  useEffect(() => {
    if (view === "moderation") {
      void loadModerationItems();
    }
  }, [view]);

  return (
    <Shell
      role="admin"
      view={view}
      setView={setView}
      userName={userName}
      avatarSelection={adminAvatarSelection}
      unreadCount={0}
      onRequireLogin={() => undefined}
      onLogout={onLogout}
    >
      {view === "dashboard" && (
        <div className="space-y-5">
          <section className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-slate-500">
                  、
                </div>
                <h2 className="mt-1 text-2xl text-slate-900">Tổng quan</h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200">
                Admin
              </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <article className="rounded-[1.7rem] bg-white p-5 ring-1 ring-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <CircleAlert className="h-4 w-4 text-emerald-600" />
                     AQI
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${getAqiTone(systemAqi?.aqi ?? overview?.systemAqi ?? 42).badgeClass}`}
                  >
                    {
                      getAqiTone(systemAqi?.aqi ?? overview?.systemAqi ?? 42)
                        .label
                    }
                  </span>
                </div>
                <div className="mt-4 flex items-end gap-2">
                  <div className="text-5xl font-semibold text-slate-900">
                    {systemAqiLoading
                      ? "--"
                      : (systemAqi?.aqi ?? overview?.systemAqi ?? 42)}
                  </div>
                  <div className="pb-1 text-sm text-slate-500">AQI</div>
                </div>
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {systemAqi?.source === "iqair"
                        ? ": IQAir"
                        : ":  / IQAir"}
                    </span>
                    <span>{systemAqi?.location_name ?? "Hà Nội"}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.min(((systemAqi?.aqi ?? overview?.systemAqi ?? 42) / 50) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  {systemAqiError && (
                    <div className="mt-2 text-xs text-rose-600">
                      {systemAqiError}
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-[1.7rem] bg-emerald-50 p-5 ring-1 ring-emerald-100">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Users className="h-4 w-4 text-emerald-600" />
                  
                </div>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-4xl font-semibold text-emerald-700">
                      {demoActiveUsers}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      7Người dùng đang hoạt động
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-50 bg-white text-[10px] text-slate-500">
                      A
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-50 bg-white text-[10px] text-slate-500">
                      B
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-50 bg-white text-[10px] text-slate-500">
                      C
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-50 bg-emerald-600 text-[10px] text-white">
                      +{demoActiveUsers - 3}
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="rounded-4xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-3 text-rose-600 ring-1 ring-rose-200">
                  <CircleAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    Vi phạm
                  </div>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600"></p>
                </div>
              </div>
              <button
                onClick={() => setView("moderation")}
                className="rounded-[1.25rem] bg-rose-600 px-4 py-3 text-sm text-white shadow-sm shadow-rose-600/15"
              >
                Vi phạm
              </button>
            </div>
          </section>
        </div>
      )}

      {view === "facilities" && (
        <div className="space-y-5">
          <section className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm text-slate-500">
                  Cơ sở
                </div>
                <h2 className="mt-1 text-2xl text-slate-900">Cơ sở</h2>
              </div>
              <button
                onClick={openCreateLocationForm}
                className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm text-white shadow-sm shadow-emerald-600/15"
              >
                <Plus className="mr-2 inline h-4 w-4" />
                Cơ sở
              </button>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="space-y-4 rounded-[1.7rem] bg-slate-50 p-4 ring-1 ring-slate-200 lg:sticky lg:top-4 lg:h-fit">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-emerald-700 ring-1 ring-emerald-100">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Cơ sởTổng quan
                    </div>
                    <div className="mt-1 text-lg text-slate-900">
                      Đã đăng kýCơ sở
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    
                  </div>
                  <div className="mt-2 text-2xl text-slate-900">
                    {locations.length}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Cơ sở
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-[1.7rem] bg-white px-5 py-3.5 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>


                {loadingLocations ? (
                  <div className="rounded-[1.7rem] bg-white p-5 text-sm text-slate-500 ring-1 ring-slate-200">
                    Cơ sởĐang tải...
                  </div>
                ) : locationsError ? (
                  <div className="rounded-[1.7rem] bg-rose-50 p-5 text-sm text-rose-700 ring-1 ring-rose-200">
                    {locationsError}
                  </div>
                ) : filteredLocations.length ? (
                  filteredLocations.map((location) => (
                    <article
                      key={location.id}
                      className="rounded-[1.7rem] bg-white p-4 ring-1 ring-slate-200"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="mt-2 text-lg text-slate-900">
                              {location.name}
                            </div>
                            <div className="mt-2 text-sm text-slate-600">
                              {location.address ?? "Địa chỉ"}
                            </div>
                           </div>
                          <MapPin className="h-5 w-5 shrink-0 text-emerald-600" />
                        </div>

                        <div className="flex flex-col items-start gap-3 border-t border-slate-100 pt-4">
                          <div className="flex gap-2">
                            {deletingLocationId !== location.id && (
                              <button
                                onClick={() => startEdit(location)}
                                className="whitespace-nowrap rounded-2xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200"
                              >
                                <Edit3 className="mr-2 inline h-4 w-4" />
                                
                              </button>
                            )}
                            {deletingLocationId === location.id ? (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => void handleDeleteConfirm(location.id)}
                                  className="whitespace-nowrap rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
                                >
                                  : Xóa
                                </button>
                                <button
                                  onClick={() => setDeletingLocationId(null)}
                                  className="whitespace-nowrap rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-200"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingLocationId(location.id)}
                                className="whitespace-nowrap rounded-2xl bg-rose-50 px-4 py-2 text-sm text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
                              >
                                <Trash2 className="mr-2 inline h-4 w-4" />
                                Xóa
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.7rem] bg-white p-5 text-sm text-slate-500 ring-1 ring-slate-200">
                    {searchQuery ? "Không tìm thấy địa điểm nào khớp với tìm kiếm." : "DB Cơ sở。"}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {view === "facility-add" && (
        <div className="space-y-5 pb-40 md:pb-48 lg:pb-56">
          <section className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="rounded-[1.7rem] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-emerald-700 ring-1 ring-emerald-100">
                    <Building2 className="h-3.5 w-3.5" />
                    {editingLocationId ? "Cơ sở" : "Cơ sở"}
                  </div>
                  <h2 className="mt-3 text-2xl text-slate-900">
                    {editingLocationId ? "Cơ sở" : "Cơ sở"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    {editingLocationId
                      ? "Cơ sở、Lưu。"
                      : "Cơ sở、LưuCơ sở。"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    resetForm();
                    setView("facilities");
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Cơ sởQuay lại
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.05fr]">
              <div className="overflow-hidden rounded-[1.7rem] bg-slate-50 ring-1 ring-slate-200 lg:sticky lg:top-4 lg:h-[calc(100vh-12rem)] lg:min-h-[620px]">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Hà Nội、。
                    </div>
                  </div>
                  <MapPin className="h-5 w-5 shrink-0 text-emerald-600" />
                </div>

                <div className="relative h-[540px] lg:h-[calc(100%-73px)]">
                  <MapContainer
                    center={[hanoiCenter.lat, hanoiCenter.lng]}
                    zoom={mapZoom}
                    minZoom={12}
                    maxZoom={17}
                    scrollWheelZoom={mapInteractive}
                    dragging={mapInteractive}
                    touchZoom={mapInteractive}
                    zoomControl={false}
                    className="h-full w-full z-0"
                    style={{ background: "#eef4ea" }}
                  >
                    <TileLayer
                      url={hanoiMapTileUrl}
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <HanoiMapZoomSync
                      zoom={mapZoom}
                      onZoomChange={setMapZoom}
                    />
                    <HanoiMapPositionSync mapPoint={mapPoint} zoom={mapZoom} />
                    <HanoiFacilityPickerMap
                      mapPoint={mapPoint}
                      setMapPoint={setMapPoint}
                      setFormState={setFormState}
                    />
                  </MapContainer>

                  <div className="pointer-events-none absolute bottom-5 left-5 rounded-2xl bg-slate-900/85 px-4 py-3 text-xs text-white shadow-lg shadow-slate-900/10 backdrop-blur">
                    <div className="font-medium"></div>
                    <div className="mt-1">
                      Lat {formState.lat || "--"} · Lng {formState.lng || "--"}
                    </div>
                  </div>

                  <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full bg-white/95 px-2 py-2 shadow-sm ring-1 ring-slate-200">
                    <button
                      type="button"
                      onClick={() =>
                        setMapZoom((current) => Math.max(12, current - 1))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
                    >
                      −
                    </button>
                    <div className="min-w-12 text-center text-xs font-medium text-slate-700">
                      Zoom {mapZoom}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setMapZoom((current) => Math.min(17, current + 1))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <main className="rounded-[1.7rem] bg-white p-5 ring-1 ring-slate-200">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
                      {editingLocationId ? "" : ""}
                    </div>
                    <div className="mt-3 text-lg text-slate-900">
                      {editingLocationId ? "Cơ sở" : "Cơ sở"}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Nhập thông tin cơ bản, trạng thái hiển thị và tiện ích.
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  <Field
                    label="Cơ sở"
                    value={formState.name}
                    onChange={(value) =>
                      setFormState((current) => ({ ...current, name: value }))
                    }
                  />
                  <Field
                    label="Địa chỉ"
                    value={formState.address}
                    onChange={(value) =>
                      setFormState((current) => ({
                        ...current,
                        address: value,
                      }))
                    }
                  />
                </div>

                {formError && (
                  <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
                    {formError}
                  </div>
                )}
                {actionMessage && (
                  <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
                    {actionMessage}
                  </div>
                )}

                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => void submitLocation()}
                    disabled={savingLocation}
                    className="flex-1 rounded-[1.2rem] bg-emerald-600 px-4 py-3 text-sm text-white disabled:opacity-60"
                  >
                    {savingLocation
                      ? "Đang lưu..."
                      : editingLocationId
                        ? ""
                        : "Lưu"}
                  </button>
                  <button
                    onClick={() => {
                      resetForm();
                      setView("facilities");
                    }}
                    className="flex-1 rounded-[1.2rem] bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200"
                  >
                    Hủy
                  </button>
                </div>
              </main>
            </div>
          </section>
        </div>
      )}

      {view === "moderation" && (
        <div className="space-y-5">
          <section className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="mt-1 text-2xl text-slate-900">
                  
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Vi phạm
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-medium text-slate-900">
                    Cơ sởー
                  </h4>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Cơ sở。
                  </p>
                </div>
              </div>
              <div className="relative mt-3 max-w-md">
                <button
                  type="button"
                  onClick={() => {
                    setModerationLocationMenuOpen((current) => !current);
                    setModerationStatusMenuOpen(false);
                    setModerationLanguageMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left text-sm text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="block text-xs uppercase tracking-[0.16em] text-slate-500">
                      Cơ sở
                    </span>
                    <span className="mt-1 block truncate font-medium text-slate-900">
                      {moderationLocationLabel}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition ${moderationLocationMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {moderationLocationMenuOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-72 overflow-auto rounded-2xl bg-white p-2 shadow-lg ring-1 ring-slate-200">
                    {moderationLocations.map((location) => {
                      const active = moderationLocation === location.id;

                      return (
                        <button
                          key={location.id}
                          type="button"
                          onClick={() => {
                            setModerationLocation(location.id);
                            setModerationLocationMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                            active
                              ? "bg-emerald-50 text-emerald-700"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate">{location.label}</span>
                          {active}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setModerationStatusMenuOpen((current) => !current);
                      setModerationLocationMenuOpen(false);
                      setModerationLanguageMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left text-sm text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs uppercase tracking-[0.16em] text-slate-500">
                        ー
                      </span>
                      <span className="mt-1 block truncate font-medium text-slate-900">
                        {moderationStatusFilterLabel}
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition ${moderationStatusMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {moderationStatusMenuOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-slate-200">
                      {moderationStatusOptions.map((option) => {
                        const active = moderationStatusFilter === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setModerationStatusFilter(option.id);
                              setModerationStatusMenuOpen(false);
                            }}
                            className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                              active
                                ? "bg-emerald-50 text-emerald-700"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setModerationLanguageMenuOpen((current) => !current);
                      setModerationLocationMenuOpen(false);
                      setModerationStatusMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left text-sm text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs uppercase tracking-[0.16em] text-slate-500">
                        Vi phạm
                      </span>
                      <span className="mt-1 block truncate font-medium text-slate-900">
                        {moderationLanguageFilterLabel}
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition ${moderationLanguageMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {moderationLanguageMenuOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-slate-200">
                      {moderationLanguageOptions.map((option) => {
                        const active = moderationLanguageFilter === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setModerationLanguageFilter(option.id);
                              setModerationLanguageMenuOpen(false);
                            }}
                            className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                              active
                                ? "bg-emerald-50 text-emerald-700"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {moderationItems.length ? (
                moderationItems.map((item) => {
                  const status = moderationStatusById[item.id] ?? item.status;

                  return (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-[1.2rem] bg-white shadow-sm ring-1 ring-slate-200"
                    >
                      <img
                        src={getModerationLocationImage(item.locationId)}
                        alt={item.locationName}
                        className="h-36 w-full object-cover"
                      />

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-1 items-start gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                              {getModerationAvatarLabel(item)}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                {item.author}
                              </div>
                              <div className="mt-1 text-base font-semibold text-slate-900">
                                {item.locationName}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${status === "unprocessed" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}
                          >
                            {status === "unprocessed"
                              ? `Vi phạm ${item.violationCount} lần`
                              : "Đã xóa"}
                          </span>
                        </div>

                        <p className="mt-3 rounded-[0.9rem] border-l-4 border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                          {item.content}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                          {item.blockedLanguages.includes("vi") && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200">
                              
                            </span>
                          )}
                          {item.blockedLanguages.includes("ja") && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 ring-1 ring-amber-200">
                              
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
                            {moderationLocationLabels[item.locationId] ??
                              item.locationId}
                          </span>
                          <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
                            {item.timestamp}
                          </span>
                        </div>

                        <div className="mt-4 flex gap-3">
                          <button
                            disabled={moderationUpdatingById[item.id]}
                            onClick={() => setCommentStatus(item.id, "deleted")}
                            className="flex-1 rounded-[0.9rem] bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-rose-600/10 disabled:opacity-50"
                          >
                            {moderationUpdatingById[item.id] ? "..." : "Xóa"}
                          </button>
                          <button
                            disabled={moderationUpdatingById[item.id]}
                            onClick={() =>
                              setCommentStatus(item.id, "unprocessed")
                            }
                            className="flex-1 rounded-[0.9rem] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 disabled:opacity-50"
                          >
                            Khôi phục
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-[1.2rem] bg-white p-5 text-sm text-slate-500 ring-1 ring-slate-200">
                  ー。
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {view === "admin-profile" && (
        <div className="mx-auto max-w-4xl space-y-5 pb-40 md:pb-48">
          <section className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="mt-1 text-2xl text-slate-900">
                  Hồ sơ
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[1.8rem] bg-[#1f2937] p-6 text-white shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative mx-auto">
                    <button
                      type="button"
                      title="Hồ sơ"
                      onClick={() => setView("admin-profile")}
                      className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-white/10 p-2 ring-1 ring-white/15 transition hover:scale-[1.02]"
                      style={getAvatarSelectionStyle(adminAvatarSelection)}
                    >
                      <img
                        src={adminAvatarPreset.src}
                        alt="ー"
                        className="h-full w-full rounded-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src =
                            adminAvatarPreset.fallbackSrc;
                        }}
                      />
                    </button>
                    <button
                      type="button"
                      title="ー"
                      onClick={() => setAvatarModalOpen(true)}
                      className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-slate-200"
                    >
                      <span className="text-base">📷</span>
                    </button>
                  </div>
                </div>

                <div className="mt-5 text-center">
                  <div className="text-2xl font-semibold">{adminName}</div>
                  <div className="mt-1 text-sm text-white/70">
                    Quản trị viên hệ thống
                  </div>
                </div>

                </div>

              <div className="rounded-[1.8rem] bg-slate-50 p-5 ring-1 ring-slate-200">
                <h3 className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                  Thông tin cá nhân
                </h3>
                <div className="mt-4 space-y-3 rounded-[1.4rem] bg-white p-4 ring-1 ring-slate-200">
                  <AdminProfileRow
                    label="Họ tên"
                    value={adminName}
                    field="name"
                    editingField={editingAdminField}
                    editValue={adminEditValue}
                    savingField={savingAdminField}
                    onEdit={(field, value) => startAdminEdit(field, value)}
                    onChange={setAdminEditValue}
                    onSave={saveAdminEdit}
                  />
                  <AdminProfileRow
                    label="Đăng nhập"
                    value={adminEmail}
                    field="email"
                    editingField={editingAdminField}
                    editValue={adminEditValue}
                    savingField={savingAdminField}
                    onEdit={(field, value) => startAdminEdit(field, value)}
                    onChange={setAdminEditValue}
                    onSave={saveAdminEdit}
                  />
                  <AdminProfileRow
                    label="ー"
                    value={adminPassword}
                    field="password"
                    editingField={editingAdminField}
                    editValue={adminEditValue}
                    savingField={savingAdminField}
                    noBorder
                    isPassword
                    onEdit={(field, value) => startAdminEdit(field, value)}
                    onChange={setAdminEditValue}
                    onSave={saveAdminEdit}
                  />
                </div>

                <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 ring-1 ring-emerald-200">
                  <div className="flex items-center gap-2 font-medium">
                    <span>✅</span>
                    Đã xác thực
                  </div>
                  <div className="mt-1 text-emerald-700/90">
                    、Tất cảー。
                  </div>
                </div>
              </div>
            </div>

            {avatarModalOpen && (
              <div
                className="avatar-modal-backdrop"
                onClick={() => setAvatarModalOpen(false)}
                role="presentation"
              >
                <div
                  className="avatar-modal-card"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="avatar-modal-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="avatar-modal-header">
                    <div>
                      <h3 id="avatar-modal-title">ー</h3>
                    </div>
                    <button
                      className="avatar-modal-close"
                      type="button"
                      onClick={() => setAvatarModalOpen(false)}
                      aria-label="ー"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="avatar-modal-section">
                    <div className="avatar-section-title">ー</div>
                    <div className="avatar-choice-grid">
                      {avatarFrames.map((frame) => (
                        <button
                          key={frame.id}
                          type="button"
                          className={`avatar-choice-chip ${pendingAvatarSelection.frameId === frame.id ? "is-selected" : ""}`}
                          onClick={() =>
                            setPendingAvatarSelection((current) => ({
                              ...current,
                              frameId: frame.id,
                            }))
                          }
                          aria-label={frame.label}
                          title={frame.label}
                        >
                          <span
                            className="avatar-choice-swatch"
                            style={{
                              background: frame.color,
                              boxShadow: `0 0 0 3px ${frame.color}`,
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="avatar-modal-section">
                    <div className="avatar-section-title">ー</div>
                    <div className="avatar-preset-grid">
                      {avatarPresets.map((preset) => {
                        const isSelected =
                          pendingAvatarSelection.avatarId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            className={`avatar-preset-card ${isSelected ? "is-selected" : ""}`}
                            onClick={() =>
                              setPendingAvatarSelection((current) => ({
                                ...current,
                                avatarId: preset.id,
                              }))
                            }
                            aria-label={preset.label}
                            title={preset.label}
                          >
                            <span className="avatar-preset-preview">
                              <img
                                src={preset.src}
                                alt={preset.label}
                                onError={(event) => {
                                  event.currentTarget.src = preset.fallbackSrc;
                                }}
                              />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="avatar-modal-actions">
                    <button
                      type="button"
                      className="avatar-modal-secondary"
                      onClick={() => setAvatarModalOpen(false)}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      className="avatar-modal-primary"
                      onClick={() => void handleAdminAvatarSave()}
                    >
                      Lưu avatar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-white shadow-sm"
              onClick={onLogout}
            >
              <span>↗</span>
              Đăng xuất
            </button>

            <div className="mt-4 text-center text-xs text-slate-400">
              ー 2.4.0 - AirPath 2026
            </div>
          </section>
        </div>
      )}
    </Shell>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      {onChange && !readOnly ? (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-2xl bg-white px-4 py-3 text-slate-900 ring-1 ring-slate-200 outline-none"
        />
      ) : (
        <div className="rounded-2xl bg-white px-4 py-3 text-slate-900 ring-1 ring-slate-200">
          {value || "-"}
        </div>
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl bg-white px-4 py-3 text-slate-900 ring-1 ring-slate-200 outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProfileRow({
  label,
  value,
  noBorder = false,
}: {
  label: string;
  value: string;
  noBorder?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-3 ${noBorder ? "" : "border-b border-slate-100"}`}
    >
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
          {label}
        </div>
        <div className="mt-1 text-sm text-slate-900">{value || "-"}</div>
      </div>
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-200"
      >
        <span className="text-sm">✎</span>
      </button>
    </div>
  );
}

function AdminProfileRow({
  label,
  value,
  field,
  editingField,
  editValue,
  savingField,
  noBorder = false,
  isPassword = false,
  onEdit,
  onChange,
  onSave,
}: {
  label: string;
  value: string;
  field: string;
  editingField: string | null;
  editValue: string;
  savingField: string | null;
  noBorder?: boolean;
  isPassword?: boolean;
  onEdit: (field: string, value: string) => void;
  onChange: (value: string) => void;
  onSave: (field: string) => Promise<void>;
}) {
  const isEditing = editingField === field;

  return (
    <div
      className={`flex items-center justify-between gap-3 py-3 ${noBorder ? "" : "border-b border-slate-100"}`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
          {label}
        </div>
        {isEditing ? (
          <input
            type={isPassword ? "password" : "text"}
            value={editValue}
            onChange={(event) => onChange(event.target.value)}
            className="mt-1 w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200"
            autoFocus
          />
        ) : (
          <div className="mt-1 text-sm text-slate-900">
            {isPassword && value ? "•".repeat(8) : (value || "-")}
          </div>
        )}
      </div>

      {isEditing ? (
        <button
          type="button"
          onClick={() => void onSave(field)}
          disabled={savingField === field}
          className="flex h-9 min-w-9 items-center justify-center rounded-full bg-emerald-600 px-3 text-white ring-1 ring-emerald-600 disabled:opacity-60"
          aria-label={`Lưu ${label}`}
        >
          {savingField === field ? "…" : "✓"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onEdit(field, value)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-200"
          aria-label={` ${label}`}
        >
          <span className="text-sm">✎</span>
        </button>
      )}
    </div>
  );
}

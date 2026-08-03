export type LookupItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  birth_year?: number | null;
  home_lat?: number | null;
  home_lng?: number | null;
  role?: "user" | "admin";
};

export type LocationRecord = {
  id: string;
  name: string;
  location_type: string;
  city: string | null;
  district: string | null;
  address: string | null;
  lat: number;
  lng: number;
  metadata?: {
    description?: string | null;
    amenities?: string[];
  };
  created_at?: string;
};

export type ProfileResponse = {
  user: User;
  profile: {
    alert_threshold: number;
    default_max_route_ratio: number;
    primary_activity_id: string | null;
    primary_activity_name?: string | null;
    mask_preference: string | null;
    phone?: string | null;
  } | null;
  conditions: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    severity: number | null;
  }>;
  activities: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    frequency_per_week: number | null;
    is_primary: boolean;
  }>;
  notificationPreferences: Record<string, unknown> | null;
};

export type DashboardResponse = {
  summary: {
    id: string;
    full_name: string | null;
    home_lat: number | null;
    home_lng: number | null;
    alert_threshold: number | null;
    default_max_route_ratio: number | null;
    mask_preference: string | null;
  };
  unreadNotifications: number;
  recentAdviceEvents: Array<{
    id: string;
    severity: "info" | "warn" | "critical";
    title: string;
    body: string;
    event_time: string;
    is_read: boolean;
  }>;
  recentRouteRequests: Array<{
    id: string;
    origin_label: string;
    destination_label: string;
    status: string;
    requested_at: string;
  }>;
  nearestAqi: {
    location_id: string;
    location_name: string;
    aqi: number;
    measured_at: string;
  } | null;
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  is_read: boolean;
  is_pinned: boolean;
  created_at: string;
};

export type RouteOption = {
  id?: string;
  routeName: string;
  distanceM: number;
  durationS: number;
  avgAqi: number;
  exposureScore: number;
  exposure: "low" | "medium" | "high";
  isRecommended: boolean;
  isWithinRatio?: boolean;
  aqiSavingPercent?: number | null;
  polyline: string;
};

export type PlaceSuggestion = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  source: "nominatim" | "local";
};

export type LocationReview = {
  id: string;
  location_id: string;
  user_id: string;
  author: string;
  rating: number;
  content: string;
  helpful_count: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
};

export type RouteStep = {
  stepIndex: number;
  distanceM: number;
  durationS: number;
  roadName: string | null;
  instruction: string;
};

export type PlannedRoute = {
  routeId: string;
  routeName: string;
  distanceM: number;
  durationS: number;
  avgAqi: number;
  exposureScore: number;
  exposure: "low" | "medium" | "high";
  isWithinRatio: boolean;
  aqiSource: string;
  polyline: string;
  geometry: {
    type: string;
    coordinates: number[][];
  } | null;
  steps: RouteStep[];
};

export type RouteRecommendation = {
  kind: "green" | "shortest" | "balanced";
  title: string;
  reason: string;
  route: PlannedRoute;
};

export type PlannedRoutesResponse = {
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
  recommendations: RouteRecommendation[];
};

export type GpsAqiMeasurement = {
  aqi: number | null;
  measured_at: string | null;
  source: string;
  location_name: string;
  lat: number;
  lng: number;
  main_pollutant?: string | null;
  aqicn?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  wind_speed?: number | null;
};



export type View = 
  | "home" 
  | "search" 
  | "spot-detail" 
  | "reviews" 
  | "route" 
  | "profile" 
  | "alert" 
  | "notifications";

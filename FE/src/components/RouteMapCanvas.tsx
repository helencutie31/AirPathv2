import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  ZoomControl,
} from "react-leaflet";
import type { LatLngExpression, LatLngTuple } from "leaflet";
import type { PlannedRoutesResponse, RouteRecommendation } from "@/lib/types";

type DecoratedRoute = RouteRecommendation & {
  color: string;
};

type PositionCoords = {
  label: string;
  lat: number;
  lng: number;
  heading?: number | null;
};

type Props = {
  planResult: PlannedRoutesResponse | null;
  routes: DecoratedRoute[];
  selectedKind: RouteRecommendation["kind"];
  heightClassName?: string;
  interactive?: boolean;
  currentPosition?: PositionCoords | null;
  tracking?: boolean;
  centerRequestId?: number;
};

const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export function RouteMapCanvas({
  planResult,
  routes,
  selectedKind,
  heightClassName = "h-[320px]",
  interactive = true,
  currentPosition,
  tracking,
  centerRequestId = 0,
}: Props) {
  const selectedRoute = routes.find((route) => route.kind === selectedKind) ?? routes[0] ?? null;

  const allPoints = useMemo(() => {
    if (!planResult) {
      return [] as LatLngTuple[];
    }

    const points: LatLngTuple[] = [[planResult.origin.lat, planResult.origin.lng], [planResult.destination.lat, planResult.destination.lng]];

    for (const route of routes) {
      for (const point of route.route.geometry?.coordinates ?? []) {
        if (point.length >= 2) {
          points.push([point[1], point[0]]);
        }
      }
    }

    return points;
  }, [planResult, routes]);

  const center = useMemo<LatLngExpression>(() => {
    if (allPoints.length === 0) {
      return [21.0285, 105.8542];
    }

    const lat = allPoints.reduce((sum, point) => sum + point[0], 0) / allPoints.length;
    const lng = allPoints.reduce((sum, point) => sum + point[1], 0) / allPoints.length;
    return [lat, lng];
  }, [allPoints]);

  const originIcon = useMemo(() => createPinIcon("#2563eb", "A"), []);
  const destinationIcon = useMemo(() => createPinIcon("#10b981", "B"), []);

  if (!planResult) {
    return (
      <div className={`flex items-center justify-center bg-[#eef4ea] px-6 text-sm text-slate-500 ${heightClassName}`}>
        Bản đồ sẽ hiển thị khi có kết quả lộ trình.
      </div>
    );
  }

  return (
    <div className={`route-map absolute inset-0 overflow-hidden ${heightClassName}`}>
      <div
        className="map-3d-wrapper absolute inset-0"
        style={{
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <MapContainer
          center={center}
          zoom={14}
          scrollWheelZoom={interactive}
          dragging={interactive}
          doubleClickZoom={interactive}
          touchZoom={interactive}
          zoomControl={false}
          attributionControl={false}
          className="route-map-inner h-full w-full"
        >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {interactive && <ZoomControl position="bottomright" />}
        <FitBounds points={allPoints} />
        <InvalidateMapSize />
        {tracking && currentPosition ? <FollowCurrentPosition position={currentPosition} /> : null}
        {currentPosition ? <CenterOnRequest position={currentPosition} requestId={centerRequestId} /> : null}

        {routes.map((route) => {
          const positions = toLatLngs(route.route.geometry?.coordinates ?? []);
          if (positions.length < 2) {
            return null;
          }

          const active = route.kind === selectedKind;
          return (
            <Polyline
              key={route.kind}
              positions={positions}
              pathOptions={{
                color: route.color,
                weight: active ? 7 : 5,
                opacity: active ? 0.95 : 0.55,
                dashArray: active ? undefined : "10 10",
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          );
        })}

        <Marker position={[planResult.origin.lat, planResult.origin.lng]} icon={originIcon}>
          <Popup>{planResult.origin.label}</Popup>
        </Marker>
        <Marker
          position={[planResult.destination.lat, planResult.destination.lng]}
          icon={destinationIcon}
        >
          <Popup>{planResult.destination.label}</Popup>
        </Marker>

        {selectedRoute ? (
          <>
            <CircleMarker
              center={[planResult.origin.lat, planResult.origin.lng]}
              radius={14}
              pathOptions={{ color: selectedRoute.color, opacity: 0.35, fillOpacity: 0.12 }}
            />
            <CircleMarker
              center={[planResult.destination.lat, planResult.destination.lng]}
              radius={14}
              pathOptions={{ color: selectedRoute.color, opacity: 0.35, fillOpacity: 0.12 }}
            />
          </>
        ) : null}

        {tracking && currentPosition ? (
          <>
            <CircleMarker
              center={[currentPosition.lat, currentPosition.lng]}
              radius={10}
              pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.2 }}
            />
            <Marker
              position={[currentPosition.lat, currentPosition.lng]}
              icon={createUserIcon(currentPosition.heading ?? 0)}
            >
              <Popup>{currentPosition.label}</Popup>
            </Marker>
          </>
        ) : null}
      </MapContainer>
    </div>
  </div>
  );
}

function CenterOnRequest({ position, requestId }: { position: PositionCoords; requestId: number }) {
  const map = useMap();

  useEffect(() => {
    if (requestId <= 0) return;
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 16), {
      animate: true,
      duration: 0.6,
    });
  }, [map, position.lat, position.lng, requestId]);

  return null;
}

function FollowCurrentPosition({ position, tracking }: { position: PositionCoords; tracking?: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!tracking) return;
    map.flyTo([position.lat, position.lng], map.getZoom(), {
      animate: true,
      duration: 0.8,
    });
  }, [map, position, tracking]);

  return null;
}

function InvalidateMapSize() {
  const map = useMap();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [map]);

  return null;
}

function createUserIcon(heading: number) {
  const rotation = `rotate(${heading}deg)`;
  return L.divIcon({
    className: "",
    html: `
      <div style="position: relative; width: 40px; height: 40px;">
        <div style="
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: ${rotation};
        ">
          <div style="
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 18px solid #2563eb;
            filter: drop-shadow(0 2px 8px rgba(15, 23, 42, 0.22));
          "></div>
        </div>
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 2px solid rgba(37, 99, 235, 0.18);
          background: rgba(37, 99, 235, 0.08);
        "></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function FitBounds({ points }: { points: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(points, {
        padding: [32, 32],
        maxZoom: 16,
      });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
  }, [map, points]);

  return null;
}

function toLatLngs(coordinates: number[][]): LatLngTuple[] {
  return coordinates
    .filter((point) => point.length >= 2)
    .map((point) => [point[1], point[0]]);
}

function createPinIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="position: relative; width: 28px; height: 28px;">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: ${color};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.22);
        ">${label}</div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

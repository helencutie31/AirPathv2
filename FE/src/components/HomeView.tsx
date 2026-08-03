import { AlertTriangle, Bell, Clock3, Leaf, MapPin, Route } from "lucide-react";
import type { DashboardResponse } from "@/lib/types";

type Props = {
  dashboard: DashboardResponse | null;
  advice: { severity: string; title: string; body: string } | null;
  onOpenRoute: () => void;
  onOpenProfile: () => void;
  gpsAqi: {
    aqi: number | null;
    location_name: string;
    measured_at: string | null;
    source: string;
  } | null;
  gpsCoords: { lat: number; lng: number } | null;
  gpsLoading: boolean;
  gpsError: string | null;
  onRefreshGpsAqi: () => void;
};

export function HomeView({
  dashboard,
  advice,
  onOpenRoute,
  onOpenProfile,
  gpsAqi,
  gpsCoords,
  gpsLoading,
  gpsError,
  onRefreshGpsAqi,
}: Props) {
  const aqi = gpsAqi?.aqi ?? dashboard?.nearestAqi?.aqi ?? null;
  const locationName = gpsAqi?.location_name ?? dashboard?.nearestAqi?.location_name ?? "Không có dữ liệu";
  const measuredAt = gpsAqi?.measured_at ?? dashboard?.nearestAqi?.measured_at ?? null;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-slate-500">AQI gần bạn</div>
              <div className="mt-2 flex items-end gap-3">
                <span className="text-5xl tracking-tight text-slate-900">{aqi ?? "--"}</span>
                <span className="mb-2 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700 ring-1 ring-emerald-200">
                  {aqi === null ? "Không có dữ liệu" : classifyAqi(aqi)}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <MapPin className="h-4 w-4" />
                {locationName}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <button
                  onClick={onRefreshGpsAqi}
                  disabled={gpsLoading}
                  className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {gpsLoading ? "Đang lấy GPS..." : "Dùng GPS hiện tại (IQAir)"}
                </button>
                <span>{gpsAqi ? "Nguồn: IQAir" : "Nguồn: dữ liệu hệ thống"}</span>
                {gpsCoords ? (
                  <span>
                    GPS: {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                  </span>
                ) : (
                  <span>GPS: Chưa lấy</span>
                )}
                {measuredAt ? <span>· {new Date(measuredAt).toLocaleString()}</span> : null}
              </div>
              {gpsError ? <div className="mt-2 text-xs text-rose-600">{gpsError}</div> : null}
            </div>
            <button
              onClick={onOpenRoute}
              className="rounded-2xl bg-linear-to-r from-blue-600 to-emerald-500 px-4 py-3 text-sm text-white shadow-lg shadow-blue-600/20"
            >
              Tìm lộ trình xanh
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatCard icon={Bell} label="Thông báo chưa đọc" value={String(dashboard?.unreadNotifications ?? 0)} />
            <StatCard
              icon={Clock3}
              label="Yêu cầu lộ trình gần đây"
              value={String(dashboard?.recentRouteRequests.length ?? 0)}
            />
            <StatCard
              icon={Leaf}
              label="Ngưỡng cảnh báo"
              value={String(dashboard?.summary.alert_threshold ?? 140)}
            />
          </div>
        </div>

        <div className="rounded-3xl bg-linear-to-br from-blue-600 to-emerald-500 p-6 text-white shadow-lg">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="mt-4 text-xl">{advice?.title ?? "Chưa có gợi ý nào"}</div>
          <p className="mt-2 text-sm leading-6 text-white/85">
            {advice?.body ??
              "Cập nhật hồ sơ sức khỏe và vị trí gần nhà để nhận gợi ý phù hợp hơn."}
          </p>
          <button
            onClick={onOpenProfile}
            className="mt-6 rounded-2xl bg-white/15 px-4 py-3 text-sm ring-1 ring-white/30"
          >
            Cập nhật hồ sơ
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <div className="mb-4 flex items-center gap-2">
            <Route className="h-5 w-5 text-blue-600" />
            <h3>Lộ trình gần đây</h3>
          </div>
          <div className="space-y-3">
            {dashboard?.recentRouteRequests.length ? (
              dashboard.recentRouteRequests.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="text-sm text-slate-900">
                    {item.origin_label} {"->"} {item.destination_label}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {item.status} · {new Date(item.requested_at).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <EmptyBlock text="Chưa có yêu cầu lộ trình nào." />
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <div className="mb-4 flex items-center gap-2">
            <Leaf className="h-5 w-5 text-emerald-600" />
            <h3>Sự kiện đề xuất</h3>
          </div>
          <div className="space-y-3">
            {dashboard?.recentAdviceEvents.length ? (
              dashboard.recentAdviceEvents.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-900">{item.title}</div>
                    <span className={`rounded-full px-2 py-1 text-xs ${severityClass(item.severity)}`}>
                      {translateSeverity(item.severity)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{item.body}</div>
                </div>
              ))
            ) : (
              <EmptyBlock text="Chưa có sự kiện gợi ý nào." />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bell;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <Icon className="h-4 w-4 text-slate-500" />
      <div className="mt-3 text-2xl text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">{text}</div>;
}

function classifyAqi(aqi: number) {
  if (aqi <= 50) return "Tốt";
  if (aqi <= 100) return "Trung bình";
  if (aqi <= 150) return "Không phù hợp cho người nhạy cảm";
  return "Không tốt cho sức khỏe";
}

function severityClass(value: string) {
  if (value === "critical") return "bg-rose-100 text-rose-700";
  if (value === "warn") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

function translateSeverity(value: string) {
  if (value === "critical") return "Nguy hiểm";
  if (value === "warn") return "Cảnh báo";
  return "Thông tin";
}

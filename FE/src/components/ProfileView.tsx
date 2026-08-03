import { useEffect, useMemo, useState } from "react";
import { Activity, Bell, Heart, Save } from "lucide-react";
import type { ReactNode } from "react";
import type { LookupItem, ProfileResponse } from "@/lib/types";

type Props = {
  profile: ProfileResponse | null;
  availableConditions: LookupItem[];
  availableActivities: LookupItem[];
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  saving: boolean;
};

export function ProfileView({
  profile,
  availableConditions,
  availableActivities,
  onSave,
  saving,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [threshold, setThreshold] = useState(140);
  const [maxRatio, setMaxRatio] = useState(1.5);
  const [primaryActivityId, setPrimaryActivityId] = useState("");
  const [selectedConditionIds, setSelectedConditionIds] = useState<string[]>([]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.user.full_name ?? "");
    setThreshold(profile.profile?.alert_threshold ?? 140);
    setMaxRatio(Number(profile.profile?.default_max_route_ratio ?? 1.5));
    setPrimaryActivityId(profile.profile?.primary_activity_id ?? "");
    setSelectedConditionIds(profile.conditions.map((item) => item.id));
  }, [profile]);

  const selectedActivity = useMemo(
    () => availableActivities.find((item) => item.id === primaryActivityId) ?? null,
    [availableActivities, primaryActivityId],
  );

  async function submit() {
    await onSave({
      fullName,
      alertThreshold: threshold,
      defaultMaxRouteRatio: maxRatio,
      primaryActivityId: primaryActivityId || null,
      conditions: selectedConditionIds.map((conditionId) => ({
        conditionId,
        severity: 3,
      })),
    });
  }

  function toggleCondition(conditionId: string) {
    setSelectedConditionIds((current) =>
      current.includes(conditionId)
        ? current.filter((item) => item !== conditionId)
        : [...current, conditionId],
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-emerald-500 text-white">
            <Heart className="h-6 w-6" />
          </div>
          <div>
            <h3>Hồ sơ</h3>
            <div className="text-sm text-slate-500">Lộ trình。</div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-slate-600">Họ tên</label>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-600">Hoạt động chính</label>
            <select
              value={primaryActivityId}
              onChange={(event) => setPrimaryActivityId(event.target.value)}
              className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200"
            >
              <option value="">Chọn hoạt động</option>
              {availableActivities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {selectedActivity ? (
              <div className="mt-2 text-xs text-slate-500">{selectedActivity.description}</div>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-700">
            <Heart className="h-4 w-4 text-rose-500" />
            Tình trạng sức khỏe
          </div>
          <div className="flex flex-wrap gap-2">
            {availableConditions.map((item) => {
              const active = selectedConditionIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleCondition(item.id)}
                  className={`rounded-full px-3.5 py-2 text-sm ring-1 transition-all ${
                    active
                      ? "bg-linear-to-r from-blue-600 to-emerald-500 text-white ring-transparent"
                      : "bg-slate-50 text-slate-700 ring-slate-200"
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <SliderCard
            icon={<Bell className="h-4 w-4 text-orange-500" />}
            label="Ngưỡng cảnh báo AQI"
            value={threshold}
            min={50}
            max={200}
            step={10}
            onChange={setThreshold}
          />
          <SliderCard
            icon={<Activity className="h-4 w-4 text-emerald-500" />}
            label="Lộ trình"
            value={maxRatio}
            min={1}
            max={2}
            step={0.1}
            onChange={setMaxRatio}
            format={(value) => `x ${value.toFixed(1)}`}
          />
        </div>

        <button
          onClick={submit}
          disabled={saving}
          className="mt-6 flex items-center gap-2 rounded-2xl bg-linear-to-r from-blue-600 to-emerald-500 px-5 py-3 text-white shadow-lg shadow-blue-600/20 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Save className="h-4 w-4" />
          {saving ? "Đang lưu..." : "Hồ sơLưu"}
        </button>
      </div>
    </div>
  );
}

function SliderCard({
  icon,
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="flex items-center gap-2 text-sm text-slate-700">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-3xl text-slate-900">{format ? format(value) : value}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-blue-600"
      />
    </div>
  );
}

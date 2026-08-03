import { Building2, Home, Map, Search, Settings2, UserCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { getAvatarPreset, getAvatarSelectionStyle, type AvatarSelection } from "@/lib/avatar-presets";
import "../styles/demo-shell.css";
import { BrandLogo } from "./BrandLogo";

export type Role = "guest" | "user" | "admin";
export type View =
  | "home"
  | "search"
  | "spot-detail"
  | "comments"
  | "route"
  | "alert"
  | "profile"
  | "dashboard"
  | "facilities"
  | "facility-add"
  | "moderation"
  | "admin-profile";

type Props = {
  role: Role;
  view: View;
  setView: (view: View) => void;
  userName: string;
  avatarSelection?: AvatarSelection;
  unreadCount: number;
  onRequireLogin: () => void;
  onLogout?: () => void;
  children: ReactNode;
};

const guestNavItems: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "home", label: "Trang chủ", icon: Home },
  { id: "search", label: "Tìm kiếm", icon: Search },
  { id: "route", label: "Lộ trình", icon: Map },
  { id: "profile", label: "Hồ sơ", icon: Settings2 },
];

const adminNavItems: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "dashboard", label: "Bảng điều khiển", icon: Home },
  { id: "facilities", label: "Cơ sở", icon: Building2 },
  { id: "admin-profile", label: "Hồ sơ", icon: Settings2 },
];

export function Shell({
  role,
  view,
  setView,
  userName,
  avatarSelection,
  unreadCount,
  onRequireLogin,
  onLogout,
  children,
}: Props) {
  const navItems = role === "admin" ? adminNavItems : guestNavItems;
  const selectedAvatarPreset = avatarSelection ? getAvatarPreset(avatarSelection.avatarId) : null;

  function handleNavigate(nextView: View) {
    if (role === "guest" && ["route", "profile", "alert"].includes(nextView)) {
      onRequireLogin();
      return;
    }

    setView(nextView);
  }

  return (
    <div className="min-h-screen bg-[#edf1ec] pb-40 md:pb-44">
      <header className="mx-auto w-full max-w-107.5 px-4 pt-4">
        <div className="flex items-center justify-between rounded-[1.6rem] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
          <div
            onClick={() => setView(role === "admin" ? "dashboard" : "home")}
            className="flex cursor-pointer items-center gap-2 font-semibold text-emerald-600 transition hover:opacity-80"
          >
            <BrandLogo className="h-10 w-auto object-contain" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (role === "guest") {
                  onRequireLogin();
                  return;
                }

                setView(role === "admin" ? "admin-profile" : "profile");
              }}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200"
              aria-label="Mở hồ sơ"
              style={avatarSelection ? getAvatarSelectionStyle(avatarSelection) : undefined}
            >
              {role === "guest" || !avatarSelection || !selectedAvatarPreset ? (
                <UserCircle2 className="h-5 w-5" />
              ) : (
                <img
                  src={selectedAvatarPreset.src}
                  alt="Ảnh đại diện"
                  className="h-full w-full rounded-full object-cover"
                  style={getAvatarSelectionStyle(avatarSelection)}
                  onError={(event) => {
                    event.currentTarget.src = selectedAvatarPreset.fallbackSrc;
                  }}
                />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-107.5 px-4 py-4">{children}</main>

      <nav className="bottom-nav-demo">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id)}
            className={`nav-item-demo ${view === item.id ? "active" : ""}`}
            title={item.label}
          >
            <span className="nav-icon">
              <item.icon size={18} />
            </span>
            <span className="nav-label-demo">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

import { Bell, Home, Search, Map, User, LogOut, Shield } from "lucide-react";
import { useState, type ReactNode } from "react";
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
  | "admin-profile"
  | "reviews";

type NavItem = {
  id: View;
  label: string;
  icon: ReactNode;
};

type Props = {
  role: Role;
  view: View;
  setView: (view: View) => void;
  userName: string;
  avatarSelection?: AvatarSelection;
  onRequireLogin: () => void;
  onShowLogin?: () => void;
  aqiAlerts: Array<{
    id: string;
    title: string;
    body: string;
    tone: string;
    toneLabel: string;
    aqi: number | null;
    location: string;
    createdAt: string;
    deltaText: string | null;
  }>;
  aqiUnreadCount: number;
  onAqiBellClick: () => void;
  onLogout?: () => void;
  children: ReactNode;
};

const guestNavItems: NavItem[] = [
  { id: "home", label: "Trang chủ", icon: <Home size={18} /> },
  { id: "search", label: "Tìm kiếm", icon: <Search size={18} /> },
  { id: "route", label: "Lộ trình", icon: <Map size={18} /> },
];

const userNavItems: NavItem[] = [
  { id: "home", label: "Trang chủ", icon: <Home size={18} /> },
  { id: "search", label: "Tìm kiếm", icon: <Search size={18} /> },
  { id: "profile", label: "Hồ sơ", icon: <User size={18} /> },
];

const adminNavItems: NavItem[] = [
  { id: "dashboard", label: "Bảng điều khiển", icon: <Shield size={18} /> },
  { id: "facilities", label: "Cơ sở", icon: <Map size={18} /> },
  { id: "moderation", label: "Kiểm duyệt", icon: <LogOut size={18} /> },
  { id: "profile", label: "Hồ sơ", icon: <User size={18} /> },
];

export function ShellDemo({
  role,
  view,
  setView,
  userName,
  avatarSelection,
  onRequireLogin,
  onShowLogin,
  aqiAlerts,
  aqiUnreadCount,
  onAqiBellClick,
  onLogout,
  children,
}: Props) {
  void onLogout;
  const [showAqiPopover, setShowAqiPopover] = useState(false);
  const navItems = role === "admin" ? adminNavItems : role === "user" ? userNavItems : guestNavItems;

  function handleNavigate(nextView: View) {
    // Auth-required views for guests — route is allowed (shows guest preview)
    if (role === "guest" && ["profile", "alert"].includes(nextView)) {
      onRequireLogin();
      return;
    }
    setView(nextView);
  }

  const logoClick = () => {
    setView("home");
  };

  const avatarClick = () => {
    if (role === "guest") {
      // If parent provided a direct show-login handler, use it to navigate to the login screen
      if (onShowLogin) {
        onShowLogin();
        return;
      }
      onRequireLogin();
    } else {
      setView("profile");
    }
  };

  const resolvedAvatarSelection = avatarSelection;
  const avatarPreset = resolvedAvatarSelection ? getAvatarPreset(resolvedAvatarSelection.avatarId) : null;

  const handleBellClick = () => {
    setShowAqiPopover((current) => !current);
    onAqiBellClick();
  };

  return (
    <div className="demo-shell">
      {/* Header */}
      <header className="app-header-demo">
        <div className="logo-area-demo" onClick={logoClick}>
          <BrandLogo className="logo-image-demo" />
        </div>
        <div className="header-actions-demo">
          {role !== "guest" && (
            <button className="aqi-bell-btn-demo" onClick={handleBellClick} aria-label="Thông báo AQI">
              <Bell size={18} />
              {aqiUnreadCount > 0 && <span className="aqi-badge-demo">{aqiUnreadCount > 9 ? "9+" : aqiUnreadCount}</span>}
            </button>
          )}
          <button className="avatar-btn-demo" onClick={avatarClick} title={userName}>
            {role === "guest" || !resolvedAvatarSelection || !avatarPreset ? (
              <User size={18} />
            ) : (
              <div className="avatar-btn-demo-image" style={getAvatarSelectionStyle(resolvedAvatarSelection)}>
                <img
                  src={avatarPreset.src}
                  alt="user avatar"
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = avatarPreset.fallbackSrc;
                  }}
                />
              </div>
            )}
          </button>
        </div>
      </header>

      {showAqiPopover && role !== "guest" && (
        <div className="aqi-popover-layer-demo" onClick={() => setShowAqiPopover(false)}>
          <div className="aqi-popover-demo" onClick={(event) => event.stopPropagation()}>
            <div className="aqi-popover-header-demo">
              <div>
                <div className="aqi-popover-title-demo">Thông báo</div>
                <div className="aqi-popover-subtitle-demo"></div>
              </div>
              <button className="aqi-popover-close-demo" onClick={() => setShowAqiPopover(false)}>
                Đóng
              </button>
            </div>

            <div className="aqi-popover-feed-demo">
              {aqiAlerts.length === 0 ? (
                <div className="aqi-popover-empty-demo">Không có cảnh báo AQI mới.</div>
              ) : (
                aqiAlerts.map((alert) => (
                  <article key={alert.id} className={`aqi-alert-item-demo tone-${alert.tone}`}>
                    <div className="aqi-alert-item-top-demo">
                      <strong>{alert.title}</strong>
                      {alert.toneLabel ? <span>{alert.toneLabel}</span> : <span className="aqi-alert-item-spacer-demo" />}
                    </div>
                    <div className="aqi-alert-item-body-demo">{alert.body}</div>
                    <div className="aqi-alert-item-meta-demo">
                      {alert.aqi !== null ? <span>AQI {alert.aqi}</span> : <span></span>}
                      <span>{alert.location}</span>
                    </div>
                    {alert.deltaText && <div className="aqi-alert-item-delta-demo">{alert.deltaText}</div>}
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`main-content-demo ${view === "route" ? "route-main-content-demo" : ""}`}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav-demo">
        {navItems.map((item) => {
          const activeView = view === "alert" ? "home" : view;
          return (
            <button
              key={item.id}
              className={`nav-item-demo ${activeView === item.id ? "active" : ""}`}
              onClick={() => handleNavigate(item.id)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label-demo">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

import { Bell, Edit2, Eye, EyeOff, AlertCircle, LogOut, X, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  avatarFrames,
  avatarPresets,
  defaultAvatarSelection,
  getAvatarSelectionStyle,
  type AvatarSelection,
} from "@/lib/avatar-presets";
import "../styles/demo-profile.css";

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    joinDate?: string;
    avatar?: string;
  } | null;
  aqiThreshold: number;
  onUpdateProfile: (field: string, value: string) => Promise<void>;
  avatarSelection: AvatarSelection;
  onUpdateAvatarSelection: (selection: AvatarSelection) => Promise<void> | void;
  onLogout: () => void;
  isLoading?: boolean;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  onUpdatePushNotification?: (enabled: boolean) => Promise<void> | void;
  onUpdateEmailNotification?: (enabled: boolean) => Promise<void> | void;
};

export function ProfileViewDemo({
  user,
  aqiThreshold: currentAqiThreshold,
  onUpdateProfile,
  avatarSelection,
  onUpdateAvatarSelection,
  onLogout,
  isLoading = false,
  pushEnabled = true,
  emailEnabled = false,
  onUpdatePushNotification,
  onUpdateEmailNotification,
}: Props) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [aqiThreshold, setAqiThreshold] = useState(currentAqiThreshold);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [pendingAvatarSelection, setPendingAvatarSelection] = useState<AvatarSelection>(avatarSelection);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const selectedAvatarPreset = avatarPresets.find((preset) => preset.id === avatarSelection.avatarId) ?? avatarPresets[0];

  const thresholdRef = useRef(aqiThreshold);
  const lastSavedThresholdRef = useRef(currentAqiThreshold);
  const onUpdateProfileRef = useRef(onUpdateProfile);

  useEffect(() => {
    thresholdRef.current = aqiThreshold;
  }, [aqiThreshold]);

  useEffect(() => {
    lastSavedThresholdRef.current = currentAqiThreshold;
  }, [currentAqiThreshold]);

  useEffect(() => {
    onUpdateProfileRef.current = onUpdateProfile;
  }, [onUpdateProfile]);

  useEffect(() => {
    setPendingAvatarSelection(avatarSelection ?? defaultAvatarSelection);
  }, [avatarSelection]);

  useEffect(() => {
    setAqiThreshold(currentAqiThreshold);
  }, [currentAqiThreshold]);

  useEffect(() => {
    if (aqiThreshold === currentAqiThreshold) {
      return;
    }

    const timer = window.setTimeout(() => {
      void onUpdateProfileRef.current("alertThreshold", String(aqiThreshold));
    }, 500);

    return () => window.clearTimeout(timer);
  }, [aqiThreshold, currentAqiThreshold]);

  useEffect(() => {
    return () => {
      if (thresholdRef.current !== lastSavedThresholdRef.current) {
        void onUpdateProfileRef.current("alertThreshold", String(thresholdRef.current));
      }
    };
  }, []);

  const handleEditClick = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
    setShowPassword(false);
  };

  const handleAvatarSave = async () => {
    await onUpdateAvatarSelection(pendingAvatarSelection);
    setAvatarModalOpen(false);
  };

  const handleSaveEdit = async (field: string) => {
    const nextValue = editValue;

    if (!nextValue.trim()) {
      setEditingField(null);
      return;
    }

    setSavingField(field);
    setEditingField(null);

    try {
      await onUpdateProfile(field, nextValue);
      setShowPassword(false);
    } catch (err) {
      console.error("Update failed:", err);
      setEditingField(field);
      setEditValue(nextValue);
    } finally {
      setSavingField((current) => (current === field ? null : current));
    }
  };

  const getThresholdLabel = (value: number) => {
    if (value <= 50) return "Tốt";
    if (value <= 100) return "Trung bình";
    if (value <= 150) return "Không phù hợp cho người nhạy cảm";
    return "Không tốt cho sức khỏe";
  };

  const formatJoinDate = (value?: string) => {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toLocaleDateString("ja-JP", { month: "2-digit", year: "numeric" });
  };

  if (!user) {
    return (
      <div className="profile-container">
        <div className="empty-state">
          <AlertCircle size={48} className="empty-icon" />
          <p>Chưa có hồ sơ người dùng</p>
        </div>
      </div>
    );
  }

  const joinDateLabel = formatJoinDate(user.joinDate);

  return (
    <div className="profile-container">
      {/* Profile Header */}
      <div className="profile-header-center">
        <div className="main-avatar-wrapper">
          <div className="main-avatar-img" style={getAvatarSelectionStyle(avatarSelection)}>
            <img
              src={selectedAvatarPreset.src}
              alt="Ảnh đại diện"
              onError={(event) => {
                event.currentTarget.src = selectedAvatarPreset.fallbackSrc;
              }}
            />
          </div>
          <button className="edit-avatar-badge" title="Đổi ảnh đại diện" onClick={() => setAvatarModalOpen(true)} type="button">
            📷
          </button>
        </div>
        <div className="user-primary-info">
          <h2 className="user-full-name">{user.name}</h2>
          <span className="user-join-date">
            {joinDateLabel ? `Thành viên từ ${joinDateLabel}` : "Thành viên"}
          </span>
        </div>
      </div>

      {avatarModalOpen && (
        <div className="avatar-modal-backdrop" onClick={() => setAvatarModalOpen(false)} role="presentation">
          <div className="avatar-modal-card" role="dialog" aria-modal="true" aria-labelledby="avatar-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="avatar-modal-header">
              <div>
                <h3 id="avatar-modal-title">Chọn ảnh đại diện</h3>
              </div>
              <button className="avatar-modal-close" type="button" onClick={() => setAvatarModalOpen(false)} aria-label="Đóng phần chọn ảnh đại diện">
                <X size={16} />
              </button>
            </div>

            <div className="avatar-modal-section">
              <div className="avatar-section-title">Khung</div>
              <div className="avatar-choice-grid">
                {avatarFrames.map((frame) => (
                  <button
                    key={frame.id}
                    type="button"
                    className={`avatar-choice-chip ${pendingAvatarSelection.frameId === frame.id ? "is-selected" : ""}`}
                    onClick={() => setPendingAvatarSelection((current) => ({ ...current, frameId: frame.id }))}
                    aria-label={frame.label}
                    title={frame.label}
                  >
                    <span className="avatar-choice-swatch" style={{ background: frame.color, boxShadow: `0 0 0 3px ${frame.color}` }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="avatar-modal-section">
              <div className="avatar-section-title">Ảnh đại diện</div>
              <div className="avatar-preset-grid">
                {avatarPresets.map((preset) => {
                  const isSelected = pendingAvatarSelection.avatarId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`avatar-preset-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setPendingAvatarSelection((current) => ({ ...current, avatarId: preset.id }))}
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
              <button type="button" className="avatar-modal-secondary" onClick={() => setAvatarModalOpen(false)}>
                Hủy
              </button>
              <button type="button" className="avatar-modal-primary" onClick={() => void handleAvatarSave()} disabled={isLoading}>
                Lưu ảnh đại diện
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Personal Info Section */}
      <div className="settings-section">
        <h3 className="section-title-small">Thông tin cá nhân</h3>
        <div className="settings-card">
          {/* Name */}
          <div className="info-row">
            <div className="info-content">
              {editingField === "name" ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="edit-input"
                  disabled={isLoading}
                  autoFocus
                />
              ) : (
                <>
                  <span className="info-label">Họ và tên</span>
                  <span className="info-value">{user.name}</span>
                </>
              )}
            </div>
            {editingField === "name" ? (
              <button
                type="button"
                className="btn-save-inline"
                onClick={() => handleSaveEdit("name")}
                disabled={isLoading || savingField === "name"}
              >
                {savingField === "name" ? "…" : "✓"}
              </button>
            ) : (
              <button
                type="button"
                className="btn-edit-inline"
                onClick={() => handleEditClick("name", user.name)}
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>

          {/* Email */}
          <div className="info-row">
            <div className="info-content">
              {editingField === "email" ? (
                <input
                  type="email"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="edit-input"
                  disabled={isLoading}
                  autoFocus
                />
              ) : (
                <>
                  <span className="info-label">Email</span>
                  <span className="info-value">{user.email}</span>
                </>
              )}
            </div>
            {editingField === "email" ? (
              <button
                type="button"
                className="btn-save-inline"
                onClick={() => handleSaveEdit("email")}
                disabled={isLoading || savingField === "email"}
              >
                {savingField === "email" ? "…" : "✓"}
              </button>
            ) : (
              <button
                type="button"
                className="btn-edit-inline"
                onClick={() => handleEditClick("email", user.email)}
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>

          {/* Password */}
          <div className="info-row no-border">
            <div className="info-content">
              {editingField === "password" ? (
                <div className="password-edit-row">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="edit-input"
                    disabled={isLoading}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn-toggle-inline"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={isLoading}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                    title={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              ) : (
                <>
                  <span className="info-label">Mật khẩu</span>
                  <span className="info-value">••••••••</span>
                </>
              )}
            </div>
            {editingField === "password" ? (
              <button
                type="button"
                className="btn-save-inline"
                onClick={() => handleSaveEdit("password")}
                disabled={isLoading || savingField === "password"}
              >
                {savingField === "password" ? "…" : "✓"}
              </button>
            ) : (
              <button
                type="button"
                className="btn-edit-inline"
                onClick={() => handleEditClick("password", "")}
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* App Settings Section */}
      <div className="settings-section">
        <h3 className="section-title-small">Cài đặt ứng dụng</h3>
        <div className="settings-card">
          {/* AQI Threshold Slider */}
          <div className="slider-row">
            <div className="slider-header">
              <span className="setting-item-title">
                <AlertCircle size={16} className="inline-icon" />
                Ngưỡng cảnh báo AQI
              </span>
              <span className="slider-val-display">{aqiThreshold}</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={aqiThreshold}
              onChange={(e) => setAqiThreshold(Number(e.target.value))}
              className="custom-range-slider"
            />
            <div className="slider-labels">
              <span>Tốt (0-50)</span>
              <span>Trung bình (51-100)</span>
              <span>Không tốt cho sức khỏe (200+)</span>
            </div>
            <div className="threshold-badge">{getThresholdLabel(aqiThreshold)}</div>
          </div>

          <div className="divider-line"></div>

          {/* Push Notifications */}
          <div className="toggle-row">
            <span className="setting-item-title">
              <Bell size={16} className="inline-icon" />
              Thông báo đẩy
            </span>
            <label className="switch">
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={(e) => {
                  if (onUpdatePushNotification) {
                    void onUpdatePushNotification(e.target.checked);
                  }
                }}
                disabled={isLoading}
              />
              <span className="slider round"></span>
            </label>
          </div>

          {/* Email Notifications */}
          <div className="toggle-row">
            <span className="setting-item-title">
              <Mail size={16} className="inline-icon" />
              Thông báo email
            </span>
            <label className="switch">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => {
                  if (onUpdateEmailNotification) {
                    void onUpdateEmailNotification(e.target.checked);
                  }
                }}
                disabled={isLoading}
              />
              <span className="slider round"></span>
            </label>
          </div>

        </div>
      </div>

      {/* Logout Button */}
      <button className="btn-logout" onClick={onLogout} disabled={isLoading}>
        <LogOut size={16} />
        Đăng xuất
      </button>
    </div>
  );
}

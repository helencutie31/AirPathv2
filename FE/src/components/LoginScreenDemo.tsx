import { ArrowRight, Lock, Mail, X } from "lucide-react";
import { useState } from "react";
import "../styles/demo-auth.css";
import { BrandLogo } from "./BrandLogo";

type Props = {
  onUserLogin: (email: string, password: string) => Promise<void>;
  onAdminLogin: (email: string, password: string) => Promise<void>;
  onRegisterClick: () => void;
  onGuestContinue: () => void;
  onForgotPassword: (email: string) => Promise<string>;
  isLoading?: boolean;
  error?: string;
  success?: string;
};

type LoginMode = "user" | "admin";

export function LoginScreenDemo({
  onUserLogin,
  onAdminLogin,
  onRegisterClick,
  onGuestContinue,
  onForgotPassword,
  isLoading = false,
  error,
  success,
}: Props) {
  const [mode, setMode] = useState<LoginMode>("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotSending, setForgotSending] = useState(false);

  const isAdminMode = mode === "admin";
  const displayMode = isAdminMode ? "quản trị viên" : "người dùng";

  function switchMode(nextMode: LoginMode) {
    setMode(nextMode);
    setFormError(null);
  }

  function openForgotPasswordModal() {
    setForgotEmail(email.trim());
    setForgotError(null);
    setForgotMessage(null);
    setForgotPasswordOpen(true);
  }

  function closeForgotPasswordModal() {
    setForgotPasswordOpen(false);
    setForgotError(null);
    setForgotMessage(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim()) {
      setFormError("Vui lòng nhập email hoặc tên người dùng.");
      return;
    }

    if (!password.trim()) {
      setFormError("Vui lòng nhập mật khẩu.");
      return;
    }

    const identifier = email.trim();
    const looksLikeEmail = identifier.includes("@");

    if (looksLikeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      setFormError("Vui lòng nhập email hoặc tên người dùng hợp lệ.");
      return;
    }

    try {
      if (isAdminMode) {
        await onAdminLogin(email, password);
        return;
      }

      await onUserLogin(email, password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotMessage(null);

    if (!forgotEmail.trim()) {
      setForgotError("Vui lòng nhập email đã đăng ký.");
      return;
    }

    const normalizedEmail = forgotEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setForgotError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }

    setForgotSending(true);
    try {
      const message = await onForgotPassword(normalizedEmail);
      setForgotMessage(message);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Không thể gửi mật khẩu mới.");
    } finally {
      setForgotSending(false);
    }
  };

  return (
    <div className="demo-auth-container login-page">
      {/* Header */}
      <div className="auth-header">
        <div className="logo-area-auth">
          <BrandLogo className="logo-image-auth" />
        </div>
      </div>

      {/* Main Content */}
      <main className="auth-scrollable-content">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h1 className="main-greeting">Chào mừng trở lại</h1>
          <p className="sub-greeting">Hãy tiếp tục hành trình sức khỏe của bạn</p>
        </div>

        {/* Auth Card */}
        <div className="auth-card">
          <h2 className="form-title">Đăng nhập với tư cách {displayMode}</h2>

          <div className="auth-mode-switcher" role="tablist" aria-label="Chế độ đăng nhập">
            <button
              type="button"
              className={`auth-mode-btn ${mode === "user" ? "active" : ""}`}
              onClick={() => switchMode("user")}
            >
              Người dùng thường
            </button>
            <button
              type="button"
              className={`auth-mode-btn ${mode === "admin" ? "active" : ""}`}
              onClick={() => switchMode("admin")}
            >
              Quản trị viên
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email / Username Input */}
            <div className="input-group-auth">
              <label className="input-label-auth">Email / tên người dùng</label>
              <div className="input-icon-wrapper-auth">
                <Mail size={16} className="input-icon-auth" />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="email@example.com hoặc tên người dùng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="input-group-auth">
              <div className="label-row-auth">
                <label className="input-label-auth">Mật khẩu</label>
                <button type="button" className="forgot-pwd-link" onClick={openForgotPasswordModal}>
                  Quên mật khẩu?
                </button>
              </div>
              <div className="input-icon-wrapper-auth">
                <Lock size={16} className="input-icon-auth" />
                <input
                  type="password"
                  className="auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Error Message */}
            {(formError || error) && <div className="error-text-auth">{formError || error}</div>}
            {success && !formError && !error && <div className="success-text-auth">{success}</div>}

            {/* Submit Button */}
            <button type="submit" className="btn-primary-auth" disabled={isLoading}>
              {isLoading ? "Đang đăng nhập..." : `Đăng nhập với tư cách ${displayMode}`}
              <ArrowRight size={16} className="btn-icon-auth" />
            </button>
          </form>

          {/* Guest continue + Register Prompt */}
          <div className="register-prompt">
            <button onClick={onGuestContinue} className="btn-secondary-auth" type="button">
              Tiếp tục với tư cách khách
            </button>
          </div>

          <div className="register-prompt">
            <span className="prompt-text">Bạn chưa có tài khoản?</span>
            <button onClick={onRegisterClick} className="register-link-btn" type="button">
              Đăng ký ngay
            </button>
          </div>
        </div>
      </main>

      {forgotPasswordOpen && (
        <div className="forgot-modal-backdrop" role="presentation" onClick={closeForgotPasswordModal}>
          <div
            className="forgot-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="forgot-modal-header">
              <div>
                <h3 id="forgot-modal-title">Đặt lại mật khẩu</h3>
                <p>Nhập email đã đăng ký để nhận mật khẩu mới.</p>
              </div>
              <button type="button" className="forgot-modal-close" onClick={closeForgotPasswordModal} aria-label="Đóng">
                <X size={16} />
              </button>
            </div>

            <form className="forgot-modal-form" onSubmit={handleForgotPasswordSubmit}>
              <div className="input-group-auth">
                <label className="input-label-auth" htmlFor="forgot-email-input">
                  Email đã đăng ký
                </label>
                <div className="input-icon-wrapper-auth">
                  <Mail size={16} className="input-icon-auth" />
                  <input
                    id="forgot-email-input"
                    type="email"
                    className="auth-input"
                    placeholder="email@example.com"
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    disabled={forgotSending || isLoading}
                    autoFocus
                  />
                </div>
              </div>

              {forgotError ? <div className="error-text-auth">{forgotError}</div> : null}
              {forgotMessage ? <div className="success-text-auth">{forgotMessage}</div> : null}

              <div className="forgot-modal-actions">
                <button type="button" className="btn-secondary-auth" onClick={closeForgotPasswordModal} disabled={forgotSending}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary-auth" disabled={forgotSending || isLoading}>
                  {forgotSending ? "Đang gửi..." : "Gửi mật khẩu mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

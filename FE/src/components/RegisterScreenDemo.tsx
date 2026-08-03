import { User, Mail, Lock, ArrowRight } from "lucide-react";
import { useState } from "react";
import "../styles/demo-auth.css";
import { BrandLogo } from "./BrandLogo";

type Props = {
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onLoginClick: () => void;
  isLoading?: boolean;
  error?: string;
};

export function RegisterScreenDemo({
  onRegister,
  onLoginClick,
  isLoading = false,
  error,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const validatePassword = (pwd: string) => {
    return pwd.length >= 8 && pwd.length <= 16;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Vui lòng nhập họ tên.");
      return;
    }

    if (!email.trim()) {
      setFormError("Vui lòng nhập địa chỉ email.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }

    if (!validatePassword(password)) {
      setFormError("Mật khẩu phải có từ 8 đến 16 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      await onRegister(name, email, password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Đăng ký thất bại.");
    }
  };

  return (
    <div className="demo-auth-container register-page">
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
          <h1 className="main-greeting">Tạo tài khoản</h1>
          <p className="sub-greeting">Bắt đầu hành trình sức khỏe của bạn từ hôm nay</p>
        </div>

        {/* Auth Card */}
        <div className="auth-card">
          <h2 className="form-title">Đăng ký</h2>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Name Input */}
            <div className="input-group-auth">
              <label className="input-label-auth">Họ và tên</label>
              <div className="input-icon-wrapper-auth">
                <User size={16} className="input-icon-auth" />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Nhập họ tên"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="input-group-auth">
              <label className="input-label-auth">Email</label>
              <div className="input-icon-wrapper-auth">
                <Mail size={16} className="input-icon-auth" />
                <input
                  type="email"
                  className="auth-input"
                  placeholder="Nhập email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="input-group-auth">
              <label className="input-label-auth">Mật khẩu (8-16 ký tự)</label>
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

            {/* Confirm Password Input */}
            <div className="input-group-auth">
              <label className="input-label-auth">Xác nhận mật khẩu</label>
              <div className="input-icon-wrapper-auth">
                <Lock size={16} className="input-icon-auth" />
                <input
                  type="password"
                  className="auth-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Error Message */}
            {(formError || error) && <div className="error-text-auth">{formError || error}</div>}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary-auth"
              disabled={isLoading}
            >
              {isLoading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
              <ArrowRight size={16} className="btn-icon-auth" />
            </button>
          </form>

          {/* Login Prompt */}
          <div className="register-prompt">
            <span className="prompt-text">Bạn đã có tài khoản?</span>
            <button
              onClick={onLoginClick}
              className="register-link-btn"
              type="button"
            >
              Đăng nhập
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

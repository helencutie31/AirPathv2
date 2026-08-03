import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";

type Props = {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (fullName: string, email: string, password: string) => Promise<void>;
  onGuestContinue: () => void;
  error: string | null;
  loading: boolean;
};

export function LoginScreen({ onLogin, onRegister, onGuestContinue, error, loading }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    setFormError(null);

    if (mode === "login") {
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

      await onLogin(email, password);
      return;
    }

    // Signup validations
    if (!fullName.trim()) {
      setFormError("Vui lòng nhập họ tên.");
      return;
    }

    if (!email.trim()) {
      setFormError("Vui lòng nhập địa chỉ email.");
      return;
    }

    if (!password.trim()) {
      setFormError("Vui lòng nhập mật khẩu.");
      return;
    }

    await onRegister(fullName, email, password);
  }

  return (
    <div className="min-h-screen bg-[#edf1ec] px-4 py-6">
      <div className="mx-auto w-full max-w-107.5">
        <div className="mb-4 flex items-center gap-3 rounded-[1.6rem] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
          <BrandLogo className="h-10 w-auto object-contain sm:h-11" />
          <div>
            <div className="text-sm font-medium text-slate-900">AirPath</div>
            <div className="text-xs text-slate-500">Hướng dẫn lộ trình AQI và trợ lý sức khỏe</div>
          </div>
        </div>

        <div className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
          <button
            onClick={onGuestContinue}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00c853]/10 to-[#279bec]/10 px-4 py-3 text-sm text-slate-700 ring-1 ring-[#279bec]/15"
          >
            <UserCircle2 className="h-4 w-4" />
            Dùng với tư cách khách
          </button>

          <div className="mb-5 inline-flex w-full gap-1 rounded-full bg-[#f4f6f2] p-1 ring-1 ring-slate-200">
            {(["login", "signup"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setMode(item)}
                className={`rounded-full px-4 py-1.5 text-sm transition-all ${
                  mode === item
                    ? "bg-gradient-to-r from-[#00c853] to-[#279bec] text-white shadow-[0_10px_24px_rgba(39,155,236,0.22)]"
                    : "text-slate-600"
                }`}
              >
                {item === "login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            ))}
          </div>

          <h2 className="text-3xl text-slate-900">
            {mode === "login" ? "Đăng nhập AirPath" : "Tạo tài khoản"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {mode === "login"
              ? "Đăng nhập để tiếp tục theo dõi AQI và lộ trình xanh."
              : "Tạo tài khoản mới để nhận cảnh báo sức khỏe phù hợp hơn."}
          </p>

          <div className="mt-7 space-y-3">
            {mode === "signup" && (
              <Field label="Họ và tên">
                <input
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    setFormError(null);
                  }}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </Field>
            )}

            <Field label="Email" icon={<Mail className="h-4 w-4 text-slate-400" />}>
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFormError(null);
                }}
                placeholder="email@example.com"
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </Field>

            <Field label="Mật khẩu" icon={<Lock className="h-4 w-4 text-slate-400" />}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFormError(null);
                }}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>

            {mode === "login" ? <button className="text-xs text-[#279bec]">Quên mật khẩu?</button> : null}
          </div>

          {(formError || error) ? (
            <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{formError || error}</div>
          ) : null}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00c853] to-[#279bec] py-3 text-white shadow-[0_14px_30px_rgba(39,155,236,0.24)] transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
            <ArrowRight className="h-4 w-4" />
          </button>

          {mode === "signup" ? (
            <>
              <div className="my-4 text-center text-xs text-slate-400">Hoặc đăng ký bằng cách khác</div>
              <div className="flex justify-center gap-3">
                <button className="rounded-xl bg-slate-100 p-3 ring-1 ring-slate-200">
                  <Mail className="h-4 w-4 text-slate-600" />
                </button>
                <button className="rounded-xl bg-slate-100 p-3 ring-1 ring-slate-200">
                  <ShieldCheck className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <div className="mt-1 flex items-center gap-2 rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-emerald-500">
        {icon}
        {children}
      </div>
    </div>
  );
}

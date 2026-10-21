import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, User, Lock, Globe, AlertCircle, ArrowRight } from "lucide-react";

import { formatAuthError } from "../../shared/utils/authValidation";
import { staffAccounts } from "../../app/navigation/staffAccounts";

interface LoginPageProps {
  onLogin: (identity: string, password: string) => Promise<string | null> | string | null;
  onBack: () => void;
}

const DEMO_ROLES = [
  { label: "Lễ tân", email: "FRONTDESK", desc: "Quầy lễ tân" },
  { label: "Buồng phòng", email: "HOUSEKEEP", desc: "Buồng phòng & dịch vụ" },
  { label: "Kế toán", email: "ACCOUNTING", desc: "Thanh toán & hóa đơn" },
  { label: "Quản lý", email: "MANAGER", desc: "Quản lý khách sạn" },
];

const SHOW_DEMO_ACCOUNTS = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === "true";

export default function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError("Vui lòng nhập đầy đủ thông tin đăng nhập.");
      return;
    }
    const value = username.trim().toLowerCase();
    const account = staffAccounts[value];
    const employeeId = account?.employeeId ?? username.trim().toUpperCase();
    const supported = Object.values(staffAccounts).some((staff) => staff.employeeId === employeeId);
    if (!supported) {
      setError("Chỉ nhân viên khách sạn mới đăng nhập tại đây.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const message = await onLogin(employeeId, password);
      if (message) {
        setError(message);
      }
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (email: string, label: string) => {
    setUsername(email);
    setPassword("hotel123");
    setSelectedRole(label);
    setError("");
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#FAF8F5] text-[#1C1917] font-sans antialiased selection:bg-[#B8944A]/25">
      {/* ── Left Panel: Majestic Cinematic Heritage Hotel ── */}
      <div className="relative hidden md:flex flex-col justify-between w-[48%] lg:w-[54%] xl:w-[58%] min-h-screen overflow-hidden bg-[#0D1117]">
        {/* Background Image */}
        <img
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&h=1200&fit=crop&auto=format"
          alt="MaM Hotel Heritage Ambiance"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out"
        />

        {/* Cinematic Multi-layer Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/70 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/75 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(184,148,74,0.18)_0%,transparent_75%)] pointer-events-none" />

        {/* Subtle Decorative Golden Border Frame inside left panel */}
        <div className="absolute inset-6 lg:inset-10 border border-[#D4AF6E]/20 pointer-events-none" />

        {/* 1. Top Brand Header */}
        <div className="relative z-10 p-8 lg:p-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/hotel_logo.png"
              alt="MaM Hotel Crest"
              className="w-12 lg:w-14 h-auto object-contain drop-shadow-[0_4px_16px_rgba(212,175,110,0.4)]"
            />
            <div>
              <span className="font-display text-xl lg:text-2xl text-white font-normal tracking-[0.2em] block leading-none">
                MaM Hotel
              </span>
              <span className="text-[10px] uppercase tracking-[0.35em] text-[#E6CA85] font-semibold block mt-1.5">
                Beachfront Retreat &amp; Spa · Biển Vũng Tàu
              </span>
            </div>
          </div>

          {/* 5 Golden Stars */}
          <div className="hidden lg:flex items-center gap-1.5 opacity-80">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="text-[#D4AF6E] text-xs">★</span>
            ))}
          </div>
        </div>

        {/* 2. Center Editorial Quote Block */}
        <div className="relative z-10 px-8 lg:px-16 my-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-[#D4AF6E]/30 mb-6 text-[#E6CA85] text-[10px] tracking-[0.3em] uppercase font-semibold">
            <span>KHÁCH SẠN THƯỢNG LƯU</span>
          </div>

          <h2 className="font-display font-light text-white text-3xl sm:text-4xl lg:text-5xl leading-[1.2] tracking-tight mb-6">
            Nơi từng khoảnh khắc{" "}
            <span className="italic text-[#E8C878] font-normal block mt-1">
              được nâng tầm thành trải nghiệm.
            </span>
          </h2>

          <div className="flex items-center gap-3 my-6 opacity-75">
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-[#D4AF6E] to-transparent" />
            <span className="text-[#D4AF6E] text-xs">◆</span>
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-[#D4AF6E] to-transparent" />
          </div>

          <p className="text-white/80 text-sm lg:text-base font-light leading-relaxed max-w-xl">
            Không gian kiến trúc thanh lịch, nội thất tinh tế và dịch vụ tận tâm,
            mở ra trải nghiệm lưu trú đẳng cấp cùng nghệ thuật ẩm thực tinh hoa và những phút giây thư giãn trọn vẹn.
          </p>
        </div>

        {/* 3. Bottom Experience Strip */}
        <div className="relative z-10 p-8 lg:p-14 pt-0">
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-6 text-[10px] uppercase tracking-[0.25em] text-white/60 font-light">
            <div className="flex items-center gap-6">
              <span>Phòng &amp; Suite sang trọng</span>
              <span>·</span>
              <span>Ẩm thực thượng hạng</span>
              <span>·</span>
              <span>Trị liệu Nam Y</span>
            </div>
            <span className="text-[#D4AF6E]/80 font-normal">ĐẲNG CẤP VƯỢT THỜI GIAN</span>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Classical Luxury Authentication Suite ── */}
      <div className="flex-1 flex flex-col justify-between min-h-screen bg-[#FAF8F5] relative p-6 sm:p-10 lg:p-12 border-l border-[#EAE4D8]">
        {/* Top Utility Bar */}
        <div className="flex items-center justify-between w-full max-w-lg mx-auto mb-4">
          <button
            type="button"
            onClick={onBack}
            className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-[#78716C] hover:text-[#8C6D37] transition cursor-pointer"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
            <span>Trang chủ</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-[#78716C]">
            <Globe size={14} className="text-[#8C6D37]" />
            <span className="font-semibold text-[#1C1917]">VI</span>
            <span className="text-[#D9D2C5]">/</span>
            <span className="hover:text-[#1C1917] cursor-pointer">EN</span>
          </div>
        </div>

        {/* Main Centered Form Card */}
        <div className="w-full max-w-[460px] mx-auto my-auto py-4">
          {/* Brand Crest & Title */}
          <div className="text-center mb-7">
            <img
              src="/hotel_logo.png"
              alt="MaM Hotel"
              className="w-12 h-auto mx-auto mb-3 object-contain drop-shadow-[0_4px_12px_rgba(184,148,74,0.35)]"
            />
            <h1 className="font-display text-3xl sm:text-4xl text-[#1C1917] font-normal tracking-tight">
              Đăng Nhập Hệ Thống
            </h1>
            
          </div>

          {/* Tài khoản mẫu: giữ đúng bốn vai trò đang dùng */}
          {SHOW_DEMO_ACCOUNTS && (
            <div className="mb-5 rounded-2xl bg-white border border-[#E5DDD0] shadow-sm overflow-hidden">
              <div className="p-3 bg-[#FDFBF7] flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-[#8C6D37] font-semibold mr-1">Mẫu:</span>
                {DEMO_ROLES.map((staff) => (
                  <button
                    key={staff.email}
                    type="button"
                    onClick={() => handleSelectRole(staff.email, staff.label)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${selectedRole === staff.label ? "bg-[#8C6D37] text-white" : "bg-white text-[#57534E] border border-[#E5DDD0]"}`}
                  >
                    {staff.label}
                  </button>
                ))}
              </div>
              <div className="px-3.5 py-1.5 bg-[#FAF8F5] text-[10px] text-[#8C827A]">
                Mật khẩu mẫu: <strong className="text-[#8C6D37]">hotel123</strong>
              </div>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-red-800 text-xs flex items-center gap-2.5 animate-fadeIn"
            >
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Fields */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            {/* Username / Phone / Employee ID */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C6D37] mb-1.5">
                Mã nhân viên
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C6D37]">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Nhập mã nhân viên"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#DDD5C7] rounded-xl text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#8C6D37] focus:ring-2 focus:ring-[#8C6D37]/15 transition shadow-xs"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C6D37]">
                  Mật khẩu bảo mật
                </label>
                <span className="text-[11px] text-[#8C6D37] font-medium">Dành cho nhân viên</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C6D37]">
                  <Lock size={16} />
                </div>
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Nhập mật khẩu của bạn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 bg-white border border-[#DDD5C7] rounded-xl text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#8C6D37] focus:ring-2 focus:ring-[#8C6D37]/15 transition shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8C827A] hover:text-[#1C1917] cursor-pointer"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-[#DDD5C7] text-[#8C6D37] focus:ring-[#8C6D37]/25 accent-[#8C6D37] cursor-pointer"
                />
                <span className="text-xs text-[#57534E]">Ghi nhớ phiên đăng nhập</span>
              </label>
            </div>

            {/* Stately Luxury Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-6 rounded-xl bg-[#1C1917] hover:bg-[#8C6D37] text-white text-xs uppercase tracking-[0.25em] font-semibold transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <span>Đăng Nhập Hệ Thống</span>
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>



        </div>

        {/* Bottom Micro Footer */}
        <div className="w-full max-w-lg mx-auto text-center pt-4 border-t border-[#EDE6DC]">
          <p className="text-[11px] text-[#8C827A] font-light">
            © 2026 MaM Hotel &amp; Sanctuary · Beachfront Hotel &amp; Spa. Bảo mật thông tin chuẩn mực 5 sao.
          </p>
        </div>
      </div>


    </div>
  );
}

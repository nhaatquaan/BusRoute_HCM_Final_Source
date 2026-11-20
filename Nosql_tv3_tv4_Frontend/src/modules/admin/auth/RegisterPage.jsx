import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authService } from '../../../services/authService';
import Button from '../../../components/Button';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Vui lòng điền đầy đủ họ tên, email và mật khẩu.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Địa chỉ email không đúng định dạng.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setLoading(true);
      await authService.register({
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
      });

      // Tự động chuyển hướng vào cổng Hành khách (Passenger Portal)
      navigate('/portal', { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng ký tài khoản thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F7FA] p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
        {/* Brand */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#172B4D] to-[#245A85] text-white shadow-md">
              <Bus className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#172B4D]">
                BusRoute <span className="text-[#245A85]">HCM</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Đăng ký tài khoản Hành khách
              </p>
            </div>
          </div>
          <Link
            to="/"
            className="text-xs font-semibold text-slate-500 hover:text-[#172B4D] flex items-center gap-1"
          >
            <ArrowLeft size={13} /> Trang chủ
          </Link>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-[#D9534F]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Họ và tên *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#245A85] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Địa chỉ Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hanhkhach@busroute.vn"
              className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#245A85] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0912345678 (tùy chọn)"
              className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#245A85] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Mật khẩu truy cập *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3.5 py-2.5 pr-10 text-xs text-slate-900 focus:border-[#245A85] focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Xác nhận mật khẩu *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#245A85] focus:bg-white focus:outline-none"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full py-2.5 mt-2" disabled={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản Hành khách'}
          </Button>
        </form>

        <div className="mt-6 border-t border-[#E2E8F0] pt-4 text-center">
          <p className="text-xs text-slate-500">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-semibold text-[#245A85] hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

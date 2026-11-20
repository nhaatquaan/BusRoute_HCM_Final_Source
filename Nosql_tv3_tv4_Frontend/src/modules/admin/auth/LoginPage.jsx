import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, AlertCircle, ArrowRight, Eye, EyeOff, ArrowLeft, Shield, Wrench, User } from 'lucide-react';
import { authService } from '../../../services/authService';
import Button from '../../../components/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin@busroute.vn');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập hoặc email và mật khẩu.');
      return;
    }

    try {
      setLoading(true);
      const { user } = await authService.login({ username, password });
      
      // Điều hướng thông minh theo vai trò chính thức
      const role = String(user.role || '').toLowerCase();
      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (role === 'operator') {
        navigate('/operator/dashboard', { replace: true });
      } else {
        navigate('/portal', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoAccount = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
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
                Đăng nhập vào Hệ thống
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Email hoặc Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin@busroute.vn"
              className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#245A85] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Mật khẩu truy cập
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

          <Button type="submit" variant="primary" className="w-full py-2.5 mt-2" disabled={loading}>
            {loading ? 'Đang xác thực...' : 'Đăng nhập vào Hệ thống'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Chưa có tài khoản hành khách?{' '}
            <Link to="/register" className="font-semibold text-[#245A85] hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>

        {/* Demo Accounts Presets for all 3 official roles */}
        <div className="mt-6 border-t border-[#E2E8F0] pt-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Tài khoản mẫu từ MongoDB (Mật khẩu: 123456):
          </div>
          <div className="space-y-1.5 text-xs">
            {/* Admin */}
            <button
              type="button"
              onClick={() => handleSelectDemoAccount('admin@busroute.vn', '123456')}
              className="w-full flex items-center justify-between rounded-lg border border-[#E2E8F0] p-2 hover:bg-slate-50 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-indigo-600 shrink-0" />
                <div>
                  <span className="font-semibold text-[#172B4D]">admin@busroute.vn</span>
                  <span className="text-[11px] text-slate-500 block">Quản trị viên toàn quyền (Admin)</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#245A85] flex items-center gap-1">
                Chọn <ArrowRight size={12} />
              </span>
            </button>

            {/* Operator */}
            <button
              type="button"
              onClick={() => handleSelectDemoAccount('operator@busroute.vn', '123456')}
              className="w-full flex items-center justify-between rounded-lg border border-[#E2E8F0] p-2 hover:bg-slate-50 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <Wrench size={14} className="text-amber-600 shrink-0" />
                <div>
                  <span className="font-semibold text-[#172B4D]">operator@busroute.vn</span>
                  <span className="text-[11px] text-slate-500 block">Điều hành viên mạng lưới (Operator)</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#245A85] flex items-center gap-1">
                Chọn <ArrowRight size={12} />
              </span>
            </button>

            {/* Passenger */}
            <button
              type="button"
              onClick={() => handleSelectDemoAccount('user@busroute.vn', '123456')}
              className="w-full flex items-center justify-between rounded-lg border border-[#E2E8F0] p-2 hover:bg-slate-50 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <User size={14} className="text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold text-[#172B4D]">user@busroute.vn</span>
                  <span className="text-[11px] text-slate-500 block">Hành khách (Passenger)</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#245A85] flex items-center gap-1">
                Chọn <ArrowRight size={12} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, AlertCircle, Database, ShieldCheck, ArrowRight } from 'lucide-react';
import { authService } from '../../../services/authService';
import Button from '../../../components/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin@busroute.vn');
  const [password, setPassword] = useState('123456');
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
      await authService.login({ username, password });
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoAccount = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F7FA] p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
        {/* Brand */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#172B4D] to-[#245A85] text-white shadow-md">
            <Bus className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#172B4D]">
              BusRoute <span className="text-[#245A85]">HCM</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Hệ thống Quản lý & Tra cứu Lộ trình Xe buýt TP.HCM
            </p>
          </div>
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#245A85] focus:bg-white focus:outline-none"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full py-2.5 mt-2" disabled={loading}>
            {loading ? 'Đang xác thực...' : 'Đăng nhập vào Hệ thống'}
          </Button>
        </form>

        {/* Demo Accounts Presets */}
        <div className="mt-6 border-t border-[#E2E8F0] pt-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Tài khoản mẫu từ MongoDB (Mật khẩu: 123456):
          </div>
          <div className="space-y-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleSelectDemoAccount('admin@busroute.vn', '123456')}
              className="w-full flex items-center justify-between rounded-lg border border-[#E2E8F0] p-2 hover:bg-slate-50 text-left transition-colors"
            >
              <div>
                <span className="font-semibold text-[#172B4D]">admin@busroute.vn</span>
                <span className="text-[11px] text-slate-500 block">Quản trị viên toàn quyền (Admin)</span>
              </div>
              <span className="text-[11px] font-semibold text-[#245A85] flex items-center gap-1">
                Chọn <ArrowRight size={12} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDemoAccount('operator@busroute.vn', '123456')}
              className="w-full flex items-center justify-between rounded-lg border border-[#E2E8F0] p-2 hover:bg-slate-50 text-left transition-colors"
            >
              <div>
                <span className="font-semibold text-[#172B4D]">operator@busroute.vn</span>
                <span className="text-[11px] text-slate-500 block">Điều hành viên mạng lưới</span>
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

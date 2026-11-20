import React from 'react';
import { Link } from 'react-router-dom';
import { RoutePlannerModule } from '../route-planner';
import { authService } from '../../services/authService';
import { Sparkles, ArrowRight, ShieldCheck, MapPin, Compass } from 'lucide-react';

export default function HomePage() {
  const isAuthenticated = authService.isAuthenticated();

  return (
    <div className="space-y-6">
      {/* Banner for Guests */}
      {!isAuthenticated && (
        <div className="rounded-2xl border border-[#245A85]/20 bg-gradient-to-r from-[#172B4D] to-[#245A85] p-5 text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
                <Sparkles size={12} />
              </span>
              <h2 className="text-sm font-bold tracking-tight">
                Chào mừng bạn đến với Cổng Tra cứu Xe buýt TP.HCM
              </h2>
            </div>
            <p className="text-xs text-slate-200">
              Tra cứu lộ trình hoàn toàn miễn phí. Đăng ký tài khoản Hành khách để cập nhật hồ sơ cá nhân và quản trị bảo mật tài khoản.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#172B4D] hover:bg-slate-100 transition-colors shadow-xs"
            >
              Đăng ký ngay <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* Main Route Planner Module */}
      <RoutePlannerModule />
    </div>
  );
}

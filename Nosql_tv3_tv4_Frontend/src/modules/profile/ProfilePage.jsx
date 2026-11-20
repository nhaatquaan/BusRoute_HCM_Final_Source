import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, Phone, Shield, Calendar, CheckCircle2, AlertCircle, Save, KeyRound } from 'lucide-react';
import { authService } from '../../services/authService';
import Button from '../../components/Button';
import Badge from '../../components/Badge';

export default function ProfilePage() {
  const [user, setUser] = useState(authService.getCurrentUser() || {});
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'password'

  // Info form state
  const [fullName, setFullName] = useState(user.fullName || user.ho_ten || '');
  const [email, setEmail] = useState(user.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user.so_dien_thoai || '');
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState('');
  const [infoError, setInfoError] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  useEffect(() => {
    async function loadLatestProfile() {
      try {
        const latest = await authService.getProfile();
        if (latest) {
          setUser(latest);
          setFullName(latest.fullName || latest.ho_ten || '');
          setEmail(latest.email || '');
          setPhoneNumber(latest.so_dien_thoai || '');
        }
      } catch (err) {
        console.warn('Could not refresh profile from server:', err.message);
      }
    }
    loadLatestProfile();
  }, []);

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setInfoError('');
    setInfoSuccess('');

    if (!fullName.trim()) {
      setInfoError('Họ và tên không được để trống.');
      return;
    }

    try {
      setInfoSaving(true);
      const updated = await authService.updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
      });
      setUser(updated);
      setInfoSuccess('Cập nhật thông tin hồ sơ thành công!');
      setTimeout(() => setInfoSuccess(''), 4000);
    } catch (err) {
      setInfoError(err.message || 'Không thể cập nhật hồ sơ cá nhân.');
    } finally {
      setInfoSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!currentPassword) {
      setPwdError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPwdError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    try {
      setPwdSaving(true);
      await authService.changePassword({ currentPassword, newPassword });
      setPwdSuccess('Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới của bạn.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdSuccess(''), 5000);
    } catch (err) {
      setPwdError(err.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setPwdSaving(false);
    }
  };

  const getRoleBadge = (role) => {
    const r = String(role || '').toLowerCase();
    if (r === 'admin') return <Badge variant="info">Quản trị viên (Admin)</Badge>;
    if (r === 'operator') return <Badge variant="warning">Điều hành viên (Operator)</Badge>;
    return <Badge variant="success">Hành khách (Passenger)</Badge>;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D]">Hồ sơ cá nhân & Bảo mật</h1>
        <p className="mt-1 text-sm text-slate-500">
          Quản lý thông tin tài khoản, thông tin liên lạc và cập nhật mật khẩu truy cập hệ thống BusRoute HCM
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#172B4D] to-[#245A85] text-2xl font-bold text-white shadow-md uppercase">
            {(user.fullName || user.ho_ten || user.username || 'U')[0]}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-[#172B4D]">
                {user.fullName || user.ho_ten || user.username}
              </h2>
              {getRoleBadge(user.role || user.vai_tro)}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              @{user.username || (user.email ? user.email.split('@')[0] : 'user')} &bull; ID: <span className="font-mono text-slate-700">{user.id || user._key}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Mail size={14} className="text-[#245A85]" />
            <span>{user.email || 'Chưa cập nhật'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-[#245A85]" />
            <span>Tham gia: {user.createdAt || '2026-11-20'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0] gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'info'
              ? 'border-[#245A85] text-[#245A85]'
              : 'border-transparent text-slate-500 hover:text-[#172B4D]'
          }`}
        >
          <User size={15} />
          Thông tin cá nhân
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'password'
              ? 'border-[#245A85] text-[#245A85]'
              : 'border-transparent text-slate-500 hover:text-[#172B4D]'
          }`}
        >
          <KeyRound size={15} />
          Đổi mật khẩu
        </button>
      </div>

      {/* Tab 1: Personal Info */}
      {activeTab === 'info' && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs">
          <h3 className="text-sm font-bold text-[#172B4D] mb-4">Cập nhật thông tin tài khoản</h3>

          {infoSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-[#16866B]">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{infoSuccess}</span>
            </div>
          )}

          {infoError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-[#D9534F]">
              <AlertCircle size={16} className="shrink-0" />
              <span>{infoError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateInfo} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@busroute.vn"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#245A85] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0901234567"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#245A85] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vai trò trong hệ thống
              </label>
              <input
                type="text"
                disabled
                value={
                  user.role === 'admin'
                    ? 'Quản trị viên (Toàn quyền quản trị)'
                    : user.role === 'operator'
                    ? 'Điều hành viên (Quản lý tuyến & trạm)'
                    : 'Hành khách (Tra cứu & tiện ích cá nhân)'
                }
                className="w-full rounded-xl border border-[#E2E8F0] bg-slate-100 px-3.5 py-2.5 text-xs text-slate-500 font-medium cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Vai trò do hệ thống phân quyền, người dùng không thể tự thay đổi vai trò của mình.
              </p>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" disabled={infoSaving}>
                <Save size={14} />
                {infoSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Change Password */}
      {activeTab === 'password' && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs">
          <h3 className="text-sm font-bold text-[#172B4D] mb-4">Đổi mật khẩu truy cập</h3>

          {pwdSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-[#16866B]">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{pwdSuccess}</span>
            </div>
          )}

          {pwdError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-[#D9534F]">
              <AlertCircle size={16} className="shrink-0" />
              <span>{pwdError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu hiện tại *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#245A85] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu mới * (Tối thiểu 6 ký tự)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#245A85] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Xác nhận mật khẩu mới *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#E2E8F0] bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#245A85] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" disabled={pwdSaving}>
                <KeyRound size={14} />
                {pwdSaving ? 'Đang đổi mật khẩu...' : 'Cập nhật mật khẩu mới'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

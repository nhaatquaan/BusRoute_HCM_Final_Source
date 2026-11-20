import React, { useEffect, useState } from 'react';
import Modal from '../../../components/Modal';
import Button from '../../../components/Button';

const EMPTY_FORM = {
  username: '',
  fullName: '',
  email: '',
  so_dien_thoai: '',
  password: '',
  role: 'passenger',
  status: 'active',
};

export default function UserFormModal({ isOpen, onClose, initialData, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (initialData) {
        const rawRole = String(initialData.role || initialData.vai_tro || '').toLowerCase();
        const role = ['admin', 'operator', 'passenger'].includes(rawRole) ? rawRole : 'passenger';
        setForm({
          ...EMPTY_FORM,
          ...initialData,
          role,
          so_dien_thoai: initialData.so_dien_thoai || '',
          password: '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.username.trim() || !form.fullName.trim() || !form.email.trim()) {
      setError('Tên đăng nhập, Họ tên và Email không được để trống.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError('Địa chỉ email không đúng định dạng.');
      return;
    }

    if (!isEdit && (!form.password || form.password.length < 6)) {
      setError('Mật khẩu khởi tạo phải có ít nhất 6 ký tự.');
      return;
    }

    if (isEdit && form.password && form.password.length < 6) {
      setError('Mật khẩu mới đặt lại phải có ít nhất 6 ký tự.');
      return;
    }

    try {
      setSaving(true);
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể lưu thông tin tài khoản.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Chỉnh sửa tài khoản ${initialData.username}` : 'Tạo tài khoản mới'}
      maxWidth="max-w-lg"
    >
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Tên đăng nhập *
            </label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              disabled={isEdit}
              placeholder="nhanvien01"
              className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-xs focus:border-[#245A85] focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 font-mono"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Họ và tên *
            </label>
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
              className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-xs focus:border-[#245A85] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Địa chỉ Email *
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@busroute.vn"
              className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-xs focus:border-[#245A85] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Số điện thoại
            </label>
            <input
              type="tel"
              name="so_dien_thoai"
              value={form.so_dien_thoai}
              onChange={handleChange}
              placeholder="0901234567"
              className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-xs focus:border-[#245A85] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            {isEdit ? 'Đặt lại mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu khởi tạo *'}
          </label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder={isEdit ? 'Nhập mật khẩu mới...' : 'Mặc định: 123456'}
            className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-xs focus:border-[#245A85] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Vai trò (Role)
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#245A85] focus:outline-none"
            >
              <option value="admin">Quản trị viên (Admin)</option>
              <option value="operator">Điều hành viên (Operator)</option>
              <option value="passenger">Hành khách (Passenger)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Trạng thái tài khoản
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#245A85] focus:outline-none"
            >
              <option value="active">Đang hoạt động</option>
              <option value="locked">Bị khóa (Locked)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật tài khoản' : 'Tạo tài khoản'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

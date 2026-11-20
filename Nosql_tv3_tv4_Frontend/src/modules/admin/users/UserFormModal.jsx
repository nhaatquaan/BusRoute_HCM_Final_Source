import React, { useEffect, useState } from 'react';
import Modal from '../../../components/Modal';
import Button from '../../../components/Button';

const EMPTY_FORM = {
  username: '',
  fullName: '',
  email: '',
  password: '',
  role: 'staff',
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
      setForm(
        initialData ? { ...EMPTY_FORM, ...initialData, password: '' } : EMPTY_FORM
      );
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username.trim() || !form.fullName.trim()) {
      setError('Tên đăng nhập và Họ tên không được để trống.');
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
    >
      {error && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Tên đăng nhập *
            </label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              disabled={isEdit}
              placeholder="nhanvien01"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Họ và tên *
            </label>
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="email@busroute.hcm.vn"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {!isEdit && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Mật khẩu khởi tạo
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mặc định: 123456"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Vai trò
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            >
              <option value="admin">Quản trị viên (Admin)</option>
              <option value="staff">Nhân viên điều hành (Staff)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Trạng thái
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            >
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đã khóa</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo tài khoản'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

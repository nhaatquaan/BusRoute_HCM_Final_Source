import React, { useEffect, useState } from 'react';
import Modal from '../../../components/Modal';
import Button from '../../../components/Button';

const EMPTY_FORM = {
  code: '',
  name: '',
  startPoint: '',
  endPoint: '',
  operatingHours: '05:00 - 20:00',
  ticketPrice: 7000,
  frequency: '10 - 15 phút/chuyến',
  status: 'active',
};

export default function RouteFormModal({ isOpen, onClose, initialData, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setForm(initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM);
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.code.trim() || !form.name.trim()) {
      setError('Mã tuyến và Tên tuyến không được để trống.');
      return;
    }
    try {
      setSaving(true);
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể lưu thông tin tuyến xe.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Chỉnh sửa tuyến ${initialData.code}` : 'Thêm tuyến xe mới'}
    >
      {error && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Mã tuyến *
            </label>
            <input
              name="code"
              value={form.code}
              onChange={handleChange}
              placeholder="VD: 19"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Tên tuyến *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="VD: Bến Thành - ĐH Quốc Gia"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Điểm đầu
            </label>
            <input
              name="startPoint"
              value={form.startPoint}
              onChange={handleChange}
              placeholder="Bến xe buýt Sài Gòn"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Điểm cuối
            </label>
            <input
              name="endPoint"
              value={form.endPoint}
              onChange={handleChange}
              placeholder="Đại học Quốc Gia"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Thời gian hoạt động
            </label>
            <input
              name="operatingHours"
              value={form.operatingHours}
              onChange={handleChange}
              placeholder="05:00 - 20:30"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Giá vé (VNĐ)
            </label>
            <input
              type="number"
              name="ticketPrice"
              value={form.ticketPrice}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Giãn cách chuyến
            </label>
            <input
              name="frequency"
              value={form.frequency}
              onChange={handleChange}
              placeholder="10 - 15 phút/chuyến"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
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
              <option value="inactive">Tạm ngưng</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo tuyến mới'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

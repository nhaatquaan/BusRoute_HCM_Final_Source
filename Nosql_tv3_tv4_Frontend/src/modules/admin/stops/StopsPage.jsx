import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, MapPin, Download, Filter } from 'lucide-react';
import { stopService } from '../../../services/stopService';
import Button from '../../../components/Button';
import Badge from '../../../components/Badge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import StopFormModal from './StopFormModal';

export default function StopsPage() {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingStop, setEditingStop] = useState(null);
  const [deletingStop, setDeletingStop] = useState(null);

  const loadStops = async () => {
    setLoading(true);
    try {
      const data = await stopService.getAll();
      setStops(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStops();
  }, []);

  const districts = useMemo(() => {
    const set = new Set();
    stops.forEach((s) => {
      const d = s.district || s.khuVuc;
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  }, [stops]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return stops.filter((s) => {
      const matchText =
        !q ||
        (s.code || '').toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q);
      const matchDistrict =
        districtFilter === 'all' || (s.district || s.khuVuc) === districtFilter;
      return matchText && matchDistrict;
    });
  }, [stops, keyword, districtFilter]);

  const handleSave = async (payload) => {
    if (editingStop) {
      await stopService.update(editingStop.id, payload);
    } else {
      await stopService.create(payload);
    }
    await loadStops();
  };

  const handleDelete = async () => {
    if (!deletingStop) return;
    try {
      await stopService.remove(deletingStop.id);
      setDeletingStop(null);
      await loadStops();
    } catch (err) {
      alert('Không thể xóa trạm dừng: ' + err.message);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Mã trạm', 'Tên trạm dừng', 'Địa chỉ', 'Quận/Huyện', 'Vĩ độ', 'Kinh độ'];
    const rows = filtered.map((s) => [
      `"${s.code || s.ma_tram}"`,
      `"${s.name || s.ten_tram}"`,
      `"${s.address || s.dia_chi}"`,
      `"${s.district || s.khuVuc || ''}"`,
      s.lat ?? s.vi_do,
      s.lng ?? s.kinh_do,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Danh_sach_tram_dung_${Date.now()}.csv`;
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Quản lý Trạm dừng</h1>
          <p className="mt-1 text-sm text-slate-500">
            Danh mục các trạm dừng xe buýt, vị trí GPS và khu vực phục vụ tại TP.HCM trong cơ sở dữ liệu MongoDB
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <Download size={14} /> Xuất CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingStop(null);
              setFormOpen(true);
            }}
          >
            <Plus size={14} /> Thêm trạm dừng
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo mã trạm, tên trạm, địa chỉ..."
            className="w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 py-2 text-xs text-[#172B4D] focus:border-[#245A85] focus:outline-none shadow-xs"
          />
        </div>

        <select
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-700 focus:border-[#245A85] focus:outline-none shadow-xs"
        >
          <option value="all">Tất cả Quận / Huyện ({stops.length})</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <span className="text-xs text-slate-500 ml-auto">
          Hiển thị <strong>{filtered.length}</strong> / <strong>{stops.length}</strong> trạm dừng
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Mã trạm</th>
                <th className="px-5 py-3.5">Tên trạm dừng</th>
                <th className="px-5 py-3.5">Địa chỉ</th>
                <th className="px-5 py-3.5">Quận / Huyện</th>
                <th className="px-5 py-3.5">Tọa độ GPS</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.map((stop) => {
                const lat = Number(stop.lat ?? stop.latitude ?? stop.vi_do);
                const lng = Number(stop.lng ?? stop.longitude ?? stop.kinh_do);

                return (
                  <tr key={stop.id || stop._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold font-mono text-[#245A85] whitespace-nowrap">
                      {stop.code || stop.ma_tram}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#172B4D]">
                      {stop.name || stop.ten_tram}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">
                      {stop.address || stop.dia_chi || '—'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge variant="primary">{stop.district || stop.khuVuc || 'TP.HCM'}</Badge>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                      {lat ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStop(stop);
                            setFormOpen(true);
                          }}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#172B4D]"
                          title="Sửa trạm"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingStop(stop)}
                          className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-[#D9534F]"
                          title="Xóa trạm"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Không tìm thấy trạm dừng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      <StopFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={editingStop}
        onSubmit={handleSave}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingStop)}
        onClose={() => setDeletingStop(null)}
        onConfirm={handleDelete}
        title="Xóa trạm dừng"
        message={`Bạn có chắc muốn xóa trạm "${deletingStop?.name}" (${deletingStop?.code})? Hành động này sẽ được kiểm tra với các tuyến xe đang liên kết.`}
      />
    </div>
  );
}

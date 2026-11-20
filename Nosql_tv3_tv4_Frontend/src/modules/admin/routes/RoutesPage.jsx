import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Route, Download, ExternalLink } from 'lucide-react';
import { routeService } from '../../../services/routeService';
import Button from '../../../components/Button';
import Badge from '../../../components/Badge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import RouteFormModal from './RouteFormModal';

export default function RoutesPage() {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/operator') ? '/operator' : '/admin';
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [deletingRoute, setDeletingRoute] = useState(null);

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const data = await routeService.getAll();
      setRoutes(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return routes.filter((r) => {
      const matchText =
        !q ||
        (r.code || '').toLowerCase().includes(q) ||
        (r.name || '').toLowerCase().includes(q) ||
        (r.startPoint || '').toLowerCase().includes(q) ||
        (r.endPoint || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchText && matchStatus;
    });
  }, [routes, keyword, statusFilter]);

  const handleSave = async (payload) => {
    if (editingRoute) {
      await routeService.update(editingRoute.id, payload);
    } else {
      await routeService.create(payload);
    }
    await loadRoutes();
  };

  const handleDelete = async () => {
    if (!deletingRoute) return;
    try {
      await routeService.remove(deletingRoute.id);
      setDeletingRoute(null);
      await loadRoutes();
    } catch (err) {
      alert('Lỗi khi xóa tuyến: ' + err.message);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Mã tuyến', 'Tên tuyến', 'Điểm đầu', 'Điểm cuối', 'Giá vé', 'Giờ hoạt động', 'Trạng thái'];
    const rows = filtered.map((r) => [
      `"${r.code || r.ma_tuyen}"`,
      `"${r.name || r.ten_tuyen}"`,
      `"${r.startPoint || r.diem_dau || ''}"`,
      `"${r.endPoint || r.diem_cuoi || ''}"`,
      r.ticketPrice || r.gia_ve || 6000,
      `"${r.operatingHours || ''}"`,
      r.status === 'active' ? 'Hoạt động' : 'Tạm ngưng',
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Danh_sach_tuyen_xe_${Date.now()}.csv`;
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Quản lý Tuyến xe buýt</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản trị danh mục tuyến xe, lộ trình đón trả khách và gán trạm dừng theo thứ tự di chuyển
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
              setEditingRoute(null);
              setFormOpen(true);
            }}
          >
            <Plus size={14} /> Thêm tuyến xe
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo mã tuyến, tên tuyến, điểm đầu/cuối..."
            className="w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 py-2 text-xs text-[#172B4D] focus:border-[#245A85] focus:outline-none shadow-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-700 focus:border-[#245A85] focus:outline-none shadow-xs"
        >
          <option value="all">Tất cả trạng thái ({routes.length})</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Tạm ngưng / Chưa cấp phép</option>
        </select>

        <span className="text-xs text-slate-500 ml-auto">
          Hiển thị <strong>{filtered.length}</strong> / <strong>{routes.length}</strong> tuyến xe
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Mã tuyến</th>
                <th className="px-5 py-3.5">Tên tuyến</th>
                <th className="px-5 py-3.5">Lộ trình đầu - cuối</th>
                <th className="px-5 py-3.5">Giá vé</th>
                <th className="px-5 py-3.5">Giờ chạy</th>
                <th className="px-5 py-3.5">Trạng thái</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.map((route) => (
                <tr key={route.id || route._id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5 font-bold font-mono text-[#245A85] whitespace-nowrap">
                    <span className="rounded bg-[#172B4D]/10 px-2 py-0.5 text-xs text-[#172B4D]">
                      {route.code || route.ma_tuyen}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#172B4D]">
                    <Link
                      to={`${basePath}/routes/${route.id || route._key}`}
                      className="hover:text-[#245A85] hover:underline"
                    >
                      {route.name || route.ten_tuyen}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {route.startPoint || route.diem_dau || '—'} → {route.endPoint || route.diem_cuoi || '—'}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#16866B] whitespace-nowrap">
                    {(route.ticketPrice || route.gia_ve || 6000).toLocaleString('vi-VN')} đ
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                    {route.operatingHours || route.thoiGianHoatDong || '05:00 - 20:30'}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <Badge variant={route.status === 'active' || route.trang_thai === 'active' ? 'success' : 'danger'}>
                      {route.status === 'active' || route.trang_thai === 'active' ? 'Đang chạy' : 'Tạm ngưng'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`${basePath}/routes/${route.id || route._key}`}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#245A85]"
                        title="Quản lý thứ tự trạm trên tuyến"
                      >
                        <Route size={15} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRoute(route);
                          setFormOpen(true);
                        }}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#172B4D]"
                        title="Sửa thông tin tuyến"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingRoute(route)}
                        className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-[#D9534F]"
                        title="Xóa tuyến"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Không tìm thấy tuyến xe nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      <RouteFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={editingRoute}
        onSubmit={handleSave}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingRoute)}
        onClose={() => setDeletingRoute(null)}
        onConfirm={handleDelete}
        title="Xóa tuyến xe buýt"
        message={`Bạn có chắc muốn xóa tuyến "${deletingRoute?.name}" (${deletingRoute?.code})? Mọi quan hệ CO_TRAM và KE_TIEP của tuyến này trong MongoDB sẽ được tự động xóa an toàn.`}
      />
    </div>
  );
}

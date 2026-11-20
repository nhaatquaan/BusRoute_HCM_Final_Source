import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Lock, Unlock, Search, Shield, Wrench, User } from 'lucide-react';
import { userService } from '../../../services/userService';
import Button from '../../../components/Button';
import Badge from '../../../components/Badge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import UserFormModal from './UserFormModal';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getAll();
      setUsers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return users.filter((u) => {
      const matchText =
        !q ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.fullName || u.ho_ten || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.so_dien_thoai || '').includes(q);

      const r = String(u.role || u.vai_tro || '').toLowerCase();
      const matchRole =
        roleFilter === 'all' ||
        (roleFilter === 'admin' && r === 'admin') ||
        (roleFilter === 'operator' && (r === 'operator' || u.email === 'operator@busroute.vn')) ||
        (roleFilter === 'passenger' && (r === 'passenger' || r === 'user' || r === 'staff'));

      const isLocked = u.status === 'locked' || u.trang_thai === 'inactive';
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !isLocked) ||
        (statusFilter === 'locked' && isLocked);

      return matchText && matchRole && matchStatus;
    });
  }, [users, keyword, roleFilter, statusFilter]);

  const handleSave = async (payload) => {
    if (editingUser) {
      await userService.update(editingUser.id, payload);
    } else {
      await userService.create(payload);
    }
    await loadUsers();
  };

  const handleToggleLock = async (user) => {
    const isCurrentlyActive = user.status === 'active' && user.trang_thai !== 'inactive';
    const nextStatus = isCurrentlyActive ? 'locked' : 'active';
    try {
      await userService.update(user.id, { status: nextStatus });
      await loadUsers();
    } catch (err) {
      alert(err.message || 'Lỗi khi cập nhật trạng thái tài khoản');
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      await userService.remove(deletingUser.id);
      setDeletingUser(null);
      await loadUsers();
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa tài khoản');
    }
  };

  const renderRoleBadge = (user) => {
    const r = String(user.role || user.vai_tro || '').toLowerCase();
    if (r === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
          <Shield size={11} /> Quản trị viên
        </span>
      );
    }
    if (r === 'operator' || user.email === 'operator@busroute.vn') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
          <Wrench size={11} /> Điều hành viên
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
        <User size={11} /> Hành khách
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Quản lý Tài khoản & Phân quyền</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản trị danh sách người dùng, thiết lập vai trò (Admin, Operator, Passenger) và kiểm soát trạng thái truy cập
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingUser(null);
            setFormOpen(true);
          }}
        >
          <Plus size={14} /> Tạo tài khoản mới
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên, email, username hoặc số điện thoại..."
            className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-9 pr-3 py-2 text-xs text-[#172B4D] focus:border-[#245A85] focus:outline-none shadow-xs"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-700 focus:border-[#245A85] focus:outline-none shadow-xs"
        >
          <option value="all">Tất cả vai trò</option>
          <option value="admin">Quản trị viên (Admin)</option>
          <option value="operator">Điều hành viên (Operator)</option>
          <option value="passenger">Hành khách (Passenger)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-700 focus:border-[#245A85] focus:outline-none shadow-xs"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="locked">Bị khóa (Locked)</option>
        </select>

        <span className="text-xs text-slate-500 ml-auto">
          Hiển thị <strong>{filtered.length}</strong> / <strong>{users.length}</strong> tài khoản
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Tên đăng nhập</th>
                <th className="px-5 py-3.5">Họ và tên</th>
                <th className="px-5 py-3.5">Email & Điện thoại</th>
                <th className="px-5 py-3.5">Vai trò chuẩn hóa</th>
                <th className="px-5 py-3.5">Trạng thái</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    Đang tải dữ liệu người dùng từ MongoDB...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    Không tìm thấy tài khoản nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const isLocked = user.status === 'locked' || user.trang_thai === 'inactive';
                  return (
                    <tr key={user.id || user._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-[#172B4D]">
                        {user.username}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[#172B4D]">
                        {user.fullName || user.ho_ten}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        <div>{user.email}</div>
                        {user.so_dien_thoai && (
                          <div className="text-[10px] text-slate-400 tabular-nums">
                            {user.so_dien_thoai}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {renderRoleBadge(user)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={!isLocked ? 'success' : 'danger'}>
                          {!isLocked ? 'Hoạt động' : 'Đã khóa'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleLock(user)}
                            title={!isLocked ? 'Khóa tài khoản' : 'Mở khóa'}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          >
                            {!isLocked ? <Lock size={15} /> : <Unlock size={15} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(user);
                              setFormOpen(true);
                            }}
                            title="Chỉnh sửa tài khoản"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#245A85] transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingUser(user)}
                            disabled={user.username === 'admin'}
                            title={user.username === 'admin' ? 'Không thể xóa Admin chính' : 'Xóa tài khoản'}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-[#D9534F] disabled:opacity-20 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={editingUser}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingUser)}
        title="Xác nhận xóa tài khoản"
        message={`Bạn có chắc chắn muốn xóa tài khoản "${deletingUser?.fullName || deletingUser?.username}" khỏi cơ sở dữ liệu MongoDB? Thao tác này không thể hoàn tác.`}
        confirmText="Xóa tài khoản"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeletingUser(null)}
      />
    </div>
  );
}

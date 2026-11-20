import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Lock, Unlock } from 'lucide-react';
import { userService } from '../../../services/userService';
import Button from '../../../components/Button';
import Badge from '../../../components/Badge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import UserFormModal from './UserFormModal';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getAll();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSave = async (payload) => {
    if (editingUser) {
      await userService.update(editingUser.id, payload);
    } else {
      await userService.create(payload);
    }
    await loadUsers();
  };

  const handleToggleLock = async (user) => {
    const nextStatus = user.status === 'active' ? 'locked' : 'active';
    await userService.update(user.id, { status: nextStatus });
    await loadUsers();
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    await userService.remove(deletingUser.id);
    setDeletingUser(null);
    await loadUsers();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Quản lý tài khoản</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Phân quyền và quản lý trạng thái truy cập hệ thống quản trị.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingUser(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Tạo tài khoản
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Tên đăng nhập</th>
                <th className="px-4 py-3">Họ và tên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                    {user.username}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {user.fullName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'admin' ? 'info' : 'neutral'}>
                      {user.role === 'admin' ? 'Quản trị viên' : 'Điều hành viên'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.status === 'active' ? 'success' : 'danger'}>
                      {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleLock(user)}
                        title={user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      >
                        {user.status === 'active' ? (
                          <Lock className="h-4 w-4" strokeWidth={1.75} />
                        ) : (
                          <Unlock className="h-4 w-4" strokeWidth={1.75} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUser(user);
                          setFormOpen(true);
                        }}
                        title="Chỉnh sửa"
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingUser(user)}
                        disabled={user.username === 'admin'}
                        title="Xóa tài khoản"
                        className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    Chưa có tài khoản nào.
                  </td>
                </tr>
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
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDelete}
        title="Xóa tài khoản"
        message={
          deletingUser
            ? `Bạn có chắc chắn muốn xóa tài khoản "${deletingUser.username}"?`
            : ''
        }
      />
    </div>
  );
}

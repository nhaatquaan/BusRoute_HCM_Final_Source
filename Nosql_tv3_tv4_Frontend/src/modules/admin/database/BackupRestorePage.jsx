import React, { useEffect, useState } from 'react';
import {
  HardDrive,
  RotateCcw,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  Calendar,
  Database
} from 'lucide-react';
import { databaseService } from '../../../services/databaseService';
import Button from '../../../components/Button';
import Badge from '../../../components/Badge';
import Modal from '../../../components/Modal';

export default function BackupRestorePage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Modal xác nhận restore
  const [restoreModal, setRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await databaseService.getBackups();
      if (res.success && Array.isArray(res.data)) {
        setBackups(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách backup:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await databaseService.createBackup();
      if (res.success) {
        setActionSuccess(`Tạo bản backup "${res.data.filename}" thành công!`);
        loadBackups();
      } else {
        setActionError(res.message || 'Lỗi khi tạo backup');
      }
    } catch (err) {
      setActionError(err.message || 'Lỗi máy chủ khi tạo backup');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackup) return;
    setLoading(true);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await databaseService.restoreBackup(selectedBackup.filename);
      if (res.success) {
        setActionSuccess(`Khôi phục Database từ "${selectedBackup.filename}" thành công!`);
        setRestoreModal(false);
        setSelectedBackup(null);
      } else {
        setActionError(res.message || 'Lỗi khi khôi phục');
      }
    } catch (err) {
      setActionError(err.message || 'Lỗi máy chủ khi khôi phục');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Backup & Restore Database</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý các bản sao lưu cơ sở dữ liệu MongoDB <code className="text-[#245A85]">BusRouteDB</code> và khôi phục khi cần thiết
          </p>
        </div>
        <Button variant="primary" onClick={handleCreateBackup} disabled={loading}>
          <Plus size={15} /> Tạo bản Sao lưu Mới (Backup Now)
        </Button>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs text-[#16866B]">
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-4 text-xs text-[#D9534F]">
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Warning Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        <AlertTriangle size={20} className="text-[#D69A36] shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold">Lưu ý an toàn:</h4>
          <p className="mt-0.5 leading-relaxed">
            Thao tác Khôi phục (Restore) sẽ ghi đè toàn bộ dữ liệu trong các collection (TuyenXe, TramDung, NguoiDung, CO_TRAM, KE_TIEP). Hãy đảm bảo chỉ thực hiện khi có nhu cầu quay lại phiên bản chuẩn của giảng viên hoặc nhóm phát triển.
          </p>
        </div>
      </div>

      {/* Backups List */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        <div className="border-b border-[#E2E8F0] px-5 py-3.5 bg-[#F8FAFC]">
          <h3 className="text-sm font-bold text-[#172B4D]">Danh sách các Bản sao lưu hiện có ({backups.length})</h3>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {backups.map((b) => (
            <div key={b.filename} className="flex flex-wrap items-center justify-between p-4 hover:bg-slate-50/80 transition-colors gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#245A85]/10 text-[#245A85]">
                  <FileArchive size={20} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-[#172B4D] truncate">{b.filename}</div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>Dung lượng: <strong>{b.sizeKb} KB</strong></span>
                    <span>&bull;</span>
                    <span>Thời gian tạo: {new Date(b.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => { setSelectedBackup(b); setRestoreModal(true); }}
                >
                  <RotateCcw size={14} /> Khôi phục (Restore)
                </Button>
              </div>
            </div>
          ))}

          {backups.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              Chưa có bản sao lưu nào trong thư mục backup. Nhấn &quot;Tạo bản Sao lưu Mới&quot; để tạo ngay.
            </div>
          )}
        </div>
      </div>

      {/* Modal Confirm Restore */}
      <Modal
        isOpen={restoreModal}
        onClose={() => setRestoreModal(false)}
        title="Xác nhận Khôi phục Cơ sở dữ liệu"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-[#D9534F]">
            <AlertTriangle size={20} className="shrink-0" />
            <div>
              <strong>CẢNH BÁO NGUY HIỂM:</strong>
              <p className="mt-1">
                Dữ liệu hiện tại trong Database sẽ bị thay thế hoàn toàn bằng dữ liệu từ bản sao lưu:
                <br />
                <code className="font-bold text-slate-900">{selectedBackup?.filename}</code>
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Bạn có chắc chắn muốn tiếp tục thực hiện khôi phục không?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setRestoreModal(false)}>Hủy bỏ</Button>
            <Button variant="danger" onClick={handleConfirmRestore} disabled={loading}>
              {loading ? 'Đang khôi phục...' : 'Xác nhận Khôi phục'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

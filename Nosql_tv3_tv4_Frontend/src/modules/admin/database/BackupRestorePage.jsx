import React, { useEffect, useState, useRef } from 'react';
import {
  HardDrive,
  RotateCcw,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  Calendar,
  Database,
  Download,
  Upload,
  FileJson,
  Eye,
  Check
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

  // Modal xác nhận restore từ file máy chủ
  const [restoreModal, setRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);

  // Cloud / Browser Upload & Preview state
  const [uploadPreviewModal, setUploadPreviewModal] = useState(false);
  const [uploadData, setUploadData] = useState(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadValidation, setUploadValidation] = useState({ valid: false, errors: [], counts: {} });
  const fileInputRef = useRef(null);

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

  // 1. Tải bản sao lưu JSON trực tiếp về trình duyệt (Browser Download)
  const handleDownloadCloudBackup = async () => {
    setLoading(true);
    setActionSuccess('');
    setActionError('');
    try {
      const data = await databaseService.downloadFullBackup();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BusRouteDB_FullBackup_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setActionSuccess('Đã tải thành công file sao lưu JSON về máy tính cá nhân.');
    } catch (err) {
      setActionError(err.message || 'Lỗi khi tải file sao lưu JSON');
    } finally {
      setLoading(false);
    }
  };

  // 2. Chọn file JSON để xem trước và xác thực trước khi khôi phục
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setActionError('');
    setActionSuccess('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        validateAndPreviewBackup(parsed);
      } catch (err) {
        setUploadValidation({
          valid: false,
          errors: ['File được chọn không đúng định dạng JSON hợp lệ: ' + err.message],
          counts: {}
        });
        setUploadData(null);
        setUploadPreviewModal(true);
      }
    };
    reader.readAsText(file);
    // Reset file input để có thể chọn lại cùng 1 file
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateAndPreviewBackup = (data) => {
    const errors = [];
    const counts = {};

    if (!data || typeof data !== 'object') {
      errors.push('Dữ liệu JSON rỗng hoặc không phải đối tượng hợp lệ.');
    } else if (!data.collections || typeof data.collections !== 'object') {
      errors.push('Thiếu trường collections chứa các danh mục document.');
    } else {
      const required = ['TuyenXe', 'TramDung', 'NguoiDung', 'CO_TRAM', 'KE_TIEP'];
      for (const col of required) {
        if (!data.collections[col]) {
          errors.push(`Thiếu collection bắt buộc: "${col}".`);
        } else if (!Array.isArray(data.collections[col])) {
          errors.push(`Collection "${col}" phải là một mảng documents.`);
        } else {
          counts[col] = data.collections[col].length;
        }
      }
      if (data.collections.BusRouteGraph) {
        counts.BusRouteGraph = Array.isArray(data.collections.BusRouteGraph)
          ? data.collections.BusRouteGraph.length
          : 1;
      }
    }

    setUploadValidation({
      valid: errors.length === 0,
      errors,
      counts
    });
    setUploadData(data);
    setUploadPreviewModal(true);
  };

  const handleConfirmUploadRestore = async () => {
    if (!uploadData || !uploadValidation.valid) return;
    setLoading(true);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await databaseService.restoreUploadedBackup(uploadData);
      if (res.success) {
        setActionSuccess('Khôi phục Database từ file JSON tải lên thành công!');
        setUploadPreviewModal(false);
        setUploadData(null);
        loadBackups();
      } else {
        setActionError(res.message || 'Lỗi khi khôi phục từ file JSON');
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
            Quản lý các bản sao lưu cơ sở dữ liệu MongoDB <code className="text-[#245A85]">BusRouteDB</code>, tải file JSON về máy hoặc tải lên để khôi phục
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json,application/json"
            className="hidden"
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="Tải lên file JSON để xem trước và khôi phục vào MongoDB"
          >
            <Upload size={15} /> Tải file JSON lên (Restore)
          </Button>

          <Button
            variant="secondary"
            onClick={handleDownloadCloudBackup}
            disabled={loading}
            title="Tải bản sao lưu JSON toàn bộ Database về máy tính"
          >
            <Download size={15} /> Tải file JSON về máy (Backup)
          </Button>

          <Button variant="primary" onClick={handleCreateBackup} disabled={loading}>
            <Plus size={15} /> Tạo bản Sao lưu trên Server
          </Button>
        </div>
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

      {/* Cloud & Safety Notice */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900">
          <Database size={20} className="text-[#245A85] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Hỗ trợ Cloud & Trình duyệt (Vercel & Atlas Ready):</h4>
            <p className="mt-0.5 leading-relaxed text-blue-800">
              Bạn có thể xuất toàn bộ dữ liệu MongoDB thành một file JSON chuẩn để lưu trữ an toàn hoặc chia sẻ. Khi cần phục hồi, tải file lên để hệ thống tự động kiểm tra cấu trúc và ghi đè vào database.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
          <AlertTriangle size={20} className="text-[#D69A36] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Lưu ý an toàn:</h4>
            <p className="mt-0.5 leading-relaxed text-amber-800">
              Thao tác Khôi phục (Restore) sẽ ghi đè toàn bộ dữ liệu trong các collection (TuyenXe, TramDung, NguoiDung, CO_TRAM, KE_TIEP, BusRouteGraph). Hãy xem trước cấu trúc trước khi nhấn xác nhận.
            </p>
          </div>
        </div>
      </div>

      {/* Backups List */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        <div className="border-b border-[#E2E8F0] px-5 py-3.5 bg-[#F8FAFC]">
          <h3 className="text-sm font-bold text-[#172B4D]">Bản sao lưu lưu trữ trên máy chủ ({backups.length})</h3>
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
              Chưa có bản sao lưu nào trên thư mục máy chủ. Bạn có thể nhấn &quot;Tải file JSON về máy&quot; để lưu trữ trực tiếp trên máy cá nhân.
            </div>
          )}
        </div>
      </div>

      {/* Modal Confirm Server Restore */}
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

      {/* Modal Preview & Validate Uploaded JSON */}
      <Modal
        isOpen={uploadPreviewModal}
        onClose={() => setUploadPreviewModal(false)}
        title="Xem trước & Xác thực file sao lưu JSON"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-[#E2E8F0] p-3 text-xs">
            <FileJson size={24} className="text-[#245A85] shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 truncate">{uploadFileName}</div>
              <div className="text-slate-500">
                Phiên bản định dạng: {uploadData?.metadata?.version || '1.0'} &bull; Xuất lúc:{' '}
                {uploadData?.metadata?.exportedAt
                  ? new Date(uploadData.metadata.exportedAt).toLocaleString('vi-VN')
                  : 'Không xác định'}
              </div>
            </div>
          </div>

          {/* Validation Status */}
          {uploadValidation.valid ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span><strong>Cấu trúc hợp lệ:</strong> File sao lưu có đầy đủ tất cả các collection bắt buộc để khôi phục.</span>
            </div>
          ) : (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-rose-700">
                <AlertCircle size={18} className="shrink-0" />
                <span>Cấu trúc không hợp lệ - Không thể khôi phục:</span>
              </div>
              <ul className="list-disc pl-6 space-y-0.5">
                {uploadValidation.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Collections Breakdown Preview */}
          {uploadValidation.valid && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Chi tiết số lượng Document sẽ khôi phục:
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(uploadValidation.counts).map(([col, count]) => (
                  <div
                    key={col}
                    className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-white p-2.5 shadow-2xs"
                  >
                    <span className="font-medium text-slate-700">{col}</span>
                    <Badge variant="neutral">{count} docs</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <Button variant="secondary" onClick={() => setUploadPreviewModal(false)}>
              Đóng
            </Button>
            <Button
              variant="danger"
              disabled={!uploadValidation.valid || loading}
              onClick={handleConfirmUploadRestore}
            >
              {loading ? 'Đang khôi phục...' : 'Xác nhận Ghi đè vào Database'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

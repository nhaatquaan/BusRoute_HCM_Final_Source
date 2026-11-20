import React, { useEffect, useState } from 'react';
import {
  Database,
  Layers,
  FileCode,
  Plus,
  Trash2,
  Edit2,
  Search,
  RefreshCw,
  ExternalLink,
  Table,
  Eye,
  KeyRound,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { databaseService } from '../../../services/databaseService';
import Button from '../../../components/Button';
import Badge from '../../../components/Badge';
import Modal from '../../../components/Modal';

export default function MongoExplorerPage() {
  const [collections, setCollections] = useState([]);
  const [selectedCol, setSelectedCol] = useState('TuyenXe');
  const [documentsData, setDocumentsData] = useState({ documents: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modal xem/sửa Document
  const [viewDoc, setViewDoc] = useState(null);
  const [editDocModal, setEditDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [docJsonText, setDocJsonText] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Modal tạo Index
  const [indexModal, setIndexModal] = useState(false);
  const [indexField, setIndexField] = useState('ma_tuyen');
  const [indexUnique, setIndexUnique] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    loadDocuments(selectedCol, page, search);
  }, [selectedCol, page]);

  const loadCollections = async () => {
    try {
      const res = await databaseService.getOverview();
      if (res.success && Array.isArray(res.data)) {
        setCollections(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách collections:', err);
    }
  };

  const loadDocuments = async (colName, p = 1, q = '') => {
    setLoading(true);
    setActionError('');
    try {
      const res = await databaseService.getDocuments(colName, {
        page: p,
        limit: 15,
        search: q,
      });
      if (res.success) {
        setDocumentsData(res.data);
      }
    } catch (err) {
      setActionError(err.message || 'Lỗi khi tải documents');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadDocuments(selectedCol, 1, search);
  };

  const handleOpenEdit = (doc) => {
    setEditingDoc(doc);
    setDocJsonText(JSON.stringify(doc, null, 2));
    setActionError('');
    setEditDocModal(true);
  };

  const handleOpenAdd = () => {
    setEditingDoc(null);
    let sample = { _key: `NEW_${Date.now()}` };
    if (selectedCol === 'TuyenXe') {
      sample = { _key: 'TX_NEW', ma_tuyen: '99', ten_tuyen: 'Tuyến thử nghiệm', gia_ve: 6000, trang_thai: 'active' };
    } else if (selectedCol === 'TramDung') {
      sample = { _key: 'TR_NEW', ma_tram: 'TR_NEW', ten_tram: 'Trạm mới', vi_do: 10.77, kinh_do: 106.70, trang_thai: 'active' };
    }
    setDocJsonText(JSON.stringify(sample, null, 2));
    setActionError('');
    setEditDocModal(true);
  };

  const handleSaveDoc = async () => {
    setActionError('');
    try {
      const parsed = JSON.parse(docJsonText);
      if (editingDoc) {
        await databaseService.updateDocument(selectedCol, editingDoc._id || editingDoc._key, parsed);
        setActionSuccess('Cập nhật document thành công');
      } else {
        await databaseService.createDocument(selectedCol, parsed);
        setActionSuccess('Thêm document mới thành công');
      }
      setEditDocModal(false);
      loadDocuments(selectedCol, page, search);
      loadCollections();
    } catch (err) {
      setActionError(err.message || 'JSON không đúng định dạng');
    }
  };

  const handleDeleteDoc = async (doc) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa document "${doc._id || doc._key}" khỏi collection ${selectedCol}?`)) {
      return;
    }
    try {
      await databaseService.deleteDocument(selectedCol, doc._id || doc._key);
      setActionSuccess('Xóa document thành công');
      loadDocuments(selectedCol, page, search);
      loadCollections();
    } catch (err) {
      setActionError(err.message || 'Lỗi khi xóa document');
    }
  };

  const handleCreateIndex = async () => {
    try {
      await databaseService.createIndex(selectedCol, indexField, indexUnique);
      setActionSuccess(`Tạo index trên trường "${indexField}" thành công`);
      setIndexModal(false);
      loadCollections();
    } catch (err) {
      setActionError(err.message || 'Lỗi khi tạo index');
    }
  };

  const currentOverview = collections.find((c) => c.name === selectedCol);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">MongoDB Database Explorer</h1>
          <p className="mt-1 text-sm text-slate-500">
            Khám phá, tra cứu, chỉnh sửa Document và quản lý Index trực tiếp trên cơ sở dữ liệu MongoDB <code className="text-[#245A85]">BusRouteDB</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => { loadCollections(); loadDocuments(selectedCol, page, search); }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
          </Button>
          <Button variant="accent" size="sm" onClick={() => setIndexModal(true)}>
            <KeyRound size={14} /> Thêm Index
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenAdd}>
            <Plus size={14} /> Thêm Document
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-[#16866B]">
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-[#D9534F]">
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Collections Overview Tabs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {collections.map((col) => {
          const isSelected = col.name === selectedCol;
          return (
            <button
              key={col.name}
              type="button"
              onClick={() => { setSelectedCol(col.name); setPage(1); setSearch(''); }}
              className={`rounded-xl border p-3.5 text-left transition-all ${
                isSelected
                  ? 'border-[#245A85] bg-[#172B4D] text-white shadow-sm'
                  : 'border-[#E2E8F0] bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                  {col.type?.includes('Edge') ? 'Edge Col' : 'Vertex'}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-bold tabular-nums ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#172B4D]'}`}>
                  {col.documentCount}
                </span>
              </div>
              <div className="mt-2 text-sm font-bold truncate">{col.name}</div>
              <div className={`mt-1 text-[11px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                {col.indexCount} indexes
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Collection Meta Info Card */}
      {currentOverview && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-[#172B4D] text-sm">Collection: {currentOverview.name}</span>
              <Badge variant={currentOverview.type?.includes('Edge') ? 'warning' : 'primary'}>
                {currentOverview.type}
              </Badge>
              <span className="text-slate-500">{currentOverview.role}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <span>Đang có <strong>{currentOverview.indexes?.length || 0}</strong> Indexes:</span>
              {(currentOverview.indexes || []).map((idx) => (
                <code key={idx.name} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-[#245A85]">
                  {idx.name}
                </code>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Documents Explorer Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#E2E8F0] p-4 gap-3 bg-[#F8FAFC]">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={`Tìm kiếm trong ${selectedCol}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 py-1.5 text-xs text-[#172B4D] focus:border-[#245A85] focus:outline-none"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">Tìm</Button>
          </form>

          <div className="text-xs text-slate-500">
            Hiển thị <strong>{documentsData.documents?.length || 0}</strong> / <strong>{documentsData.total || 0}</strong> Documents
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2E8F0] bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">_id</th>
                <th className="px-4 py-3">_key</th>
                <th className="px-4 py-3">Thuộc tính chính</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {documentsData.documents?.map((doc) => {
                // Tóm tắt các field hiển thị
                const { _id, _key, ...rest } = doc;
                const summaryProps = Object.entries(rest)
                  .filter(([k, v]) => typeof v !== 'object' && k !== 'mat_khau')
                  .slice(0, 4)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' | ');

                return (
                  <tr key={doc._id || doc._key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-[#245A85] whitespace-nowrap">
                      {doc._id || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-[#172B4D] whitespace-nowrap">
                      {doc._key || doc.id || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-md">
                      {summaryProps || '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewDoc(doc)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-[#245A85]"
                          title="Xem JSON chi tiết"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(doc)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-[#172B4D]"
                          title="Chỉnh sửa document"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc)}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-[#D9534F]"
                          title="Xóa document"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!documentsData.documents || documentsData.documents.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Không tìm thấy document nào trong collection {selectedCol}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] px-4 py-3 bg-[#F8FAFC] text-xs">
          <span className="text-slate-500">
            Trang {documentsData.page} / {documentsData.totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              disabled={documentsData.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={documentsData.page >= documentsData.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      </div>

      {/* Modal View JSON */}
      <Modal isOpen={Boolean(viewDoc)} onClose={() => setViewDoc(null)} title={`Xem Document: ${viewDoc?._id || viewDoc?._key}`} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <pre className="max-h-96 overflow-y-auto rounded-lg bg-slate-900 p-4 text-xs font-mono text-emerald-400">
            {JSON.stringify(viewDoc, null, 2)}
          </pre>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setViewDoc(null)}>Đóng</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Edit / Add Document */}
      <Modal
        isOpen={editDocModal}
        onClose={() => setEditDocModal(false)}
        title={editingDoc ? `Sửa Document (${selectedCol})` : `Thêm Document mới (${selectedCol})`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Chỉnh sửa nội dung document dưới định dạng JSON hợp lệ:
          </p>
          <textarea
            rows={12}
            value={docJsonText}
            onChange={(e) => setDocJsonText(e.target.value)}
            className="w-full rounded-lg border border-[#E2E8F0] bg-slate-900 p-3 font-mono text-xs text-emerald-400 focus:outline-none"
          />
          {actionError && <p className="text-xs text-[#D9534F]">{actionError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditDocModal(false)}>Hủy</Button>
            <Button variant="primary" onClick={handleSaveDoc}>Lưu vào MongoDB</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Create Index */}
      <Modal isOpen={indexModal} onClose={() => setIndexModal(false)} title={`Tạo Index trên ${selectedCol}`} maxWidth="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Chọn trường cần Index:</label>
            <select
              value={indexField}
              onChange={(e) => setIndexField(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] p-2 text-xs text-[#172B4D]"
            >
              <option value="ma_tuyen">ma_tuyen</option>
              <option value="ma_tram">ma_tram</option>
              <option value="email">email</option>
              <option value="_from">_from (Edge)</option>
              <option value="_to">_to (Edge)</option>
              <option value="thu_tu">thu_tu</option>
              <option value="trang_thai">trang_thai</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="uniqueIdx"
              checked={indexUnique}
              onChange={(e) => setIndexUnique(e.target.checked)}
              className="rounded border-slate-300"
            />
            <label htmlFor="uniqueIdx" className="text-xs text-slate-700">Ràng buộc duy nhất (Unique Index)</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIndexModal(false)}>Hủy</Button>
            <Button variant="primary" onClick={handleCreateIndex}>Tạo Index</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

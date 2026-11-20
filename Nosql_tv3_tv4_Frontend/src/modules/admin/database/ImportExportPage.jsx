import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Layers,
  ArrowRight
} from 'lucide-react';
import { databaseService } from '../../../services/databaseService';
import Button from '../../../components/Button';
import Badge from '../../../components/Badge';

const COLLECTIONS = ['TuyenXe', 'TramDung', 'NguoiDung', 'CO_TRAM', 'KE_TIEP', 'BusRouteGraph'];

export default function ImportExportPage() {
  const [selectedCol, setSelectedCol] = useState('TuyenXe');
  const [importMode, setImportMode] = useState('insert'); // insert, upsert, skip
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedPreview, setParsedPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = (e) => {
    setErrorMsg('');
    setSuccessMsg('');
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        setFileContent(text);

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          setParsedPreview(items);
        } else if (file.name.endsWith('.csv')) {
          // Parse CSV cơ bản
          const lines = text.trim().split('\n');
          if (lines.length > 1) {
            const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
            const items = lines.slice(1).map((line) => {
              const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
              const obj = {};
              headers.forEach((h, i) => {
                obj[h] = vals[i] || '';
              });
              return obj;
            });
            setParsedPreview(items);
          }
        }
      } catch (err) {
        setErrorMsg('Không thể đọc file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!parsedPreview || parsedPreview.length === 0) {
      setErrorMsg('Vui lòng chọn file dữ liệu hợp lệ để import');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await databaseService.importData(selectedCol, parsedPreview, importMode);
      if (res.success) {
        setSuccessMsg(
          `Import thành công ${res.data.inserted} document mới, cập nhật ${res.data.updated}, bỏ qua trùng ${res.data.skipped}.`
        );
        setParsedPreview(null);
        setFileContent('');
        setFileName('');
      } else {
        setErrorMsg(res.message || 'Lỗi khi import');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi máy chủ khi import');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('bus_admin_token');
    // Mở liên kết tải trực tiếp hoặc gọi fetch
    fetch(`${apiUrl}/api/database/export/${selectedCol}?format=${format}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Lỗi xuất dữ liệu HTTP ' + res.status);
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedCol}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => setErrorMsg(err.message));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D]">Import & Export Dữ liệu MongoDB</h1>
        <p className="mt-1 text-sm text-slate-500">
          Hỗ trợ nhập và xuất dữ liệu định dạng JSON hoặc CSV cho từng Vertex Collection và Edge Collection
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs text-[#16866B]">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-4 text-xs text-[#D9534F]">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Export Card */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#245A85]/10 text-[#245A85]">
              <Download size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#172B4D]">Xuất Dữ liệu (Export)</h3>
              <p className="text-xs text-slate-500">Tải dữ liệu từ MongoDB về máy tính cá nhân</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Chọn Collection:</label>
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#E2E8F0] p-2.5 text-xs text-[#172B4D] font-medium"
            >
              {COLLECTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex flex-wrap gap-3">
            <Button variant="accent" onClick={() => handleExport('json')} className="flex-1">
              <FileJson size={15} /> Xuất JSON
            </Button>
            <Button variant="secondary" onClick={() => handleExport('csv')} className="flex-1">
              <FileSpreadsheet size={15} /> Xuất CSV
            </Button>
          </div>
        </div>

        {/* Import Card */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#16866B]/10 text-[#16866B]">
              <Upload size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#172B4D]">Nhập Dữ liệu (Import)</h3>
              <p className="text-xs text-slate-500">Đọc file JSON hoặc CSV và nạp vào MongoDB</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Collection đích:</label>
              <select
                value={selectedCol}
                onChange={(e) => setSelectedCol(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#E2E8F0] p-2 text-xs text-[#172B4D]"
              >
                {COLLECTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Chế độ ghi:</label>
              <select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#E2E8F0] p-2 text-xs text-[#172B4D]"
              >
                <option value="insert">Chỉ chèn mới (Insert only)</option>
                <option value="upsert">Cập nhật nếu trùng (Upsert)</option>
                <option value="skip">Bỏ qua nếu trùng (Skip)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Tải file lên (.json hoặc .csv):</label>
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleFileUpload}
              className="mt-1.5 block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#172B4D]/10 file:text-[#172B4D] hover:file:bg-[#172B4D]/20 cursor-pointer"
            />
          </div>

          {parsedPreview && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Preview: {fileName}</span>
                <Badge variant="success">{parsedPreview.length} documents sẵn sàng</Badge>
              </div>
              <pre className="max-h-36 overflow-y-auto rounded bg-slate-900 p-2 text-[11px] font-mono text-emerald-400">
                {JSON.stringify(parsedPreview.slice(0, 2), null, 2)}
              </pre>
            </div>
          )}

          <Button
            variant="primary"
            className="w-full"
            onClick={handleExecuteImport}
            disabled={loading || !parsedPreview}
          >
            {loading ? 'Đang import...' : 'Xác nhận Import vào MongoDB'}
          </Button>
        </div>
      </div>
    </div>
  );
}

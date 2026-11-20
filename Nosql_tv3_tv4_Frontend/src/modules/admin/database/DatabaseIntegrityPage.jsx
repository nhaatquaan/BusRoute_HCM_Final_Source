import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  Wrench
} from 'lucide-react';
import { databaseService } from '../../../services/databaseService';
import Button from '../../../components/Button';
import Badge from '../../../components/Badge';

export default function DatabaseIntegrityPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  useEffect(() => {
    loadIntegrity();
  }, []);

  const loadIntegrity = async () => {
    setLoading(true);
    try {
      const res = await databaseService.getIntegrityReport();
      if (res.success && res.data) {
        setReport(res.data);
      }
    } catch (err) {
      console.error('Lỗi kiểm tra toàn vẹn:', err);
    } finally {
      setLoading(false);
    }
  };

  const summary = report?.summary || { totalIssues: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0, status: 'HEALTHY' };
  const issues = report?.issues || [];

  const filteredIssues = issues.filter((iss) => {
    if (filterSeverity === 'ALL') return true;
    return iss.severity === filterSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Kiểm tra Tính toàn vẹn Cơ sở dữ liệu</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tự động kiểm tra và rà soát cạnh mồ côi (CO_TRAM, KE_TIEP), tọa độ GPS không hợp lệ và tính đồng bộ giữa các đỉnh đồ thị
          </p>
        </div>
        <Button variant="primary" onClick={loadIntegrity} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Đang quét...' : 'Chạy kiểm tra lại (Scan)'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Trạng thái Database</span>
            <ShieldCheck className={summary.status === 'HEALTHY' ? 'text-[#16866B]' : 'text-[#D69A36]'} size={20} />
          </div>
          <div className="mt-2 text-xl font-bold text-[#172B4D]">
            {summary.status === 'HEALTHY' ? 'Toàn vẹn (Healthy)' : summary.status === 'CRITICAL' ? 'Lỗi nghiêm trọng' : 'Cần lưu ý'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Kiểm tra lúc: {report?.checkedAt ? new Date(report.checkedAt).toLocaleTimeString() : 'Vừa xong'}</div>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tổng số cảnh báo</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
              {summary.totalIssues}
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#172B4D] tabular-nums">
            {summary.totalIssues}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Trên 6 Collections</div>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Mức độ Cao (High)</span>
            <AlertOctagon className="text-[#D9534F]" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#D9534F] tabular-nums">
            {summary.highSeverity}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Cạnh mồ côi / Liên kết sai</div>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Mức độ Trung bình / Thấp</span>
            <AlertTriangle className="text-[#D69A36]" size={20} />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#D69A36] tabular-nums">
            {summary.mediumSeverity + summary.lowSeverity}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Tọa độ ngoại biên / Trạm chưa gán</div>
        </div>
      </div>

      {/* Issues Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b border-[#E2E8F0] p-4 bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#172B4D]">Lọc theo mức độ:</span>
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setFilterSeverity(sev)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterSeverity === sev ? 'bg-[#172B4D] text-white' : 'bg-white border text-slate-600 hover:bg-slate-100'
                }`}
              >
                {sev === 'ALL' ? 'Tất cả' : sev}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500">
            Hiển thị <strong>{filteredIssues.length}</strong> kết quả
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2E8F0] bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Mức độ</th>
                <th className="px-5 py-3">Phân loại</th>
                <th className="px-5 py-3">Nội dung chi tiết</th>
                <th className="px-5 py-3">Document liên quan</th>
                <th className="px-5 py-3">Hướng khắc phục đề xuất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredIssues.map((iss, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <Badge variant={iss.severity === 'HIGH' ? 'danger' : iss.severity === 'MEDIUM' ? 'warning' : 'neutral'}>
                      {iss.severity}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-700 whitespace-nowrap">
                    {iss.category}
                  </td>
                  <td className="px-5 py-3 text-slate-800 font-medium">
                    {iss.message}
                  </td>
                  <td className="px-5 py-3 font-mono text-[#245A85] whitespace-nowrap">
                    {iss.documentId || '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {iss.remediation}
                  </td>
                </tr>
              ))}
              {filteredIssues.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 size={28} className="text-[#16866B]" />
                      <p className="font-semibold text-slate-700">Cơ sở dữ liệu hoàn hảo! Không phát hiện lỗi bất thường.</p>
                      <p className="text-xs text-slate-400">Tất cả các đỉnh Vertex và cạnh Edge đều liên kết chính xác 100%.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

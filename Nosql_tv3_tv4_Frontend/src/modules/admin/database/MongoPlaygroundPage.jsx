import React, { useEffect, useState } from 'react';
import {
  Terminal,
  Play,
  Clock,
  FileCode,
  Layers,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { databaseService } from '../../../services/databaseService';
import Button from '../../../components/Button';
import Badge from '../../../components/Badge';

export default function MongoPlaygroundPage() {
  const [presets, setPresets] = useState([]);
  const [selectedQueryId, setSelectedQueryId] = useState('active_routes');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const res = await databaseService.getPlaygroundQueries();
      if (res.success && Array.isArray(res.data)) {
        setPresets(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải mẫu truy vấn:', err);
    }
  };

  const handleRun = async (qId) => {
    const idToRun = qId || selectedQueryId;
    setRunning(true);
    setError('');
    setResult(null);
    try {
      const res = await databaseService.runPlaygroundQuery(idToRun);
      if (res.success) {
        setResult(res);
      } else {
        setError(res.message || 'Lỗi khi thực thi truy vấn');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setRunning(false);
    }
  };

  const currentPreset = presets.find((p) => p.id === selectedQueryId) || presets[0];

  const handleCopyCode = () => {
    if (currentPreset?.queryCode) {
      navigator.clipboard.writeText(currentPreset.queryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">MongoDB Query Playground</h1>
          <p className="mt-1 text-sm text-slate-500">
            Trình diễn các kỹ thuật truy vấn NoSQL nâng cao: Aggregation Pipeline ($match, $lookup, $group, $sort, $graphLookup, $facet)
          </p>
        </div>
        <Button variant="accent" onClick={() => handleRun()} disabled={running}>
          <Play size={15} className={running ? 'animate-spin' : ''} />
          {running ? 'Đang thực thi...' : 'Chạy truy vấn (Execute)'}
        </Button>
      </div>

      {/* Preset Queries Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {presets.map((preset) => {
          const isSelected = preset.id === selectedQueryId;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => { setSelectedQueryId(preset.id); handleRun(preset.id); }}
              className={`rounded-xl border p-3.5 text-left transition-all ${
                isSelected
                  ? 'border-[#245A85] bg-[#172B4D] text-white shadow-sm'
                  : 'border-[#E2E8F0] bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <Badge variant={preset.type === 'graphLookup' ? 'warning' : isSelected ? 'neutral' : 'primary'}>
                  {preset.type}
                </Badge>
                {isSelected && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
              </div>
              <div className="mt-2 text-sm font-bold truncate">{preset.name}</div>
              <p className={`mt-1 text-[11px] line-clamp-2 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Query Code & Explanation Pane */}
      {currentPreset && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3">
            <div className="flex items-center gap-2 text-xs">
              <Terminal size={15} className="text-[#245A85]" />
              <span className="font-bold text-[#172B4D]">{currentPreset.name}</span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-slate-500">{currentPreset.description}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-200"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép mã'}</span>
            </button>
          </div>

          <pre className="p-4 text-xs font-mono bg-slate-900 text-emerald-400 overflow-x-auto leading-relaxed">
            {currentPreset.queryCode}
          </pre>
        </div>
      )}

      {/* Execution Results View */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-4 text-xs text-[#D9534F]">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
          <div className="flex flex-wrap items-center justify-between border-b border-[#E2E8F0] px-5 py-3.5 bg-[#F8FAFC]">
            <div className="flex items-center gap-4 text-xs">
              <span className="font-bold text-[#172B4D]">Kết quả thực thi MongoDB:</span>
              <span className="text-slate-500">
                Trả về: <strong className="text-[#16866B]">{result.resultCount} documents</strong>
              </span>
              <span className="text-slate-500">
                Thời gian: <strong className="text-[#245A85]">{result.executionTimeMs} ms</strong>
              </span>
            </div>
            <Badge variant="success">Execution Success</Badge>
          </div>

          <div className="p-4 bg-slate-950 max-h-[500px] overflow-y-auto">
            <pre className="text-xs font-mono text-emerald-300 leading-relaxed">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

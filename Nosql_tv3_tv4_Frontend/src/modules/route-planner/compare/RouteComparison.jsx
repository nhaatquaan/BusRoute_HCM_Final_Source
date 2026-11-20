import React, { useEffect, useState, useMemo } from 'react';
import {
  Scale,
  Bus,
  Clock,
  MapPin,
  Milestone,
  Printer,
  CheckCircle2,
  ArrowLeftRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { routeService } from '../../../services/routeService';
import { formatCurrency, printRouteDocument } from '../utils/routeHelpers.js';

export function RouteComparison({ onInspectStop }) {
  const [routesList, setRoutesList] = useState([]);
  const [routeAId, setRouteAId] = useState('TX_01');
  const [routeBId, setRouteBId] = useState('TX_19');
  const [detailA, setDetailA] = useState(null);
  const [detailB, setDetailB] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadAllRoutes() {
      try {
        const list = await routeService.getAll();
        if (Array.isArray(list) && list.length > 0) {
          setRoutesList(list);
          const first = list[0]?.id || list[0]?._key || 'TX_01';
          const second = list[1]?.id || list[1]?._key || first;
          setRouteAId(first);
          setRouteBId(second);
        }
      } catch (err) {
        console.warn('Error loading routes for comparison:', err.message);
      }
    }
    loadAllRoutes();
  }, []);

  useEffect(() => {
    let mounted = true;
    async function fetchDetails() {
      if (!routeAId || !routeBId) return;
      setLoading(true);
      try {
        const [a, b] = await Promise.all([
          routeService.getById(routeAId).catch(() => null),
          routeService.getById(routeBId).catch(() => null),
        ]);
        if (!mounted) return;
        setDetailA(a);
        setDetailB(b);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchDetails();
    return () => {
      mounted = false;
    };
  }, [routeAId, routeBId]);

  // Tìm các trạm giao nhau (Trạm trung chuyển chung giữa Tuyến A và Tuyến B)
  const sharedStops = useMemo(() => {
    const stopsA = detailA?.stops || [];
    const stopsB = detailB?.stops || [];
    const idsB = new Set(stopsB.map((s) => s.code || s.ma_tram || s.id || s._key));
    return stopsA.filter((s) => idsB.has(s.code || s.ma_tram || s.id || s._key));
  }, [detailA, detailB]);

  const calcTotalDuration = (routeDetail) => {
    const stops = routeDetail?.stops || [];
    if (stops.length <= 1) return (stops.length || 10) * 4;
    return stops.reduce((sum, s, i) => sum + (i === 0 ? 0 : Number(s.thoi_gian_di_chuyen_phut || 5)), 0);
  };

  const handlePrintRoute = (detail) => {
    if (!detail) return;
    const code = detail.code || detail.ma_tuyen || detail.maTuyen;
    const name = detail.name || detail.ten_tuyen || detail.tenTuyen;
    printRouteDocument({
      title: `THÔNG TIN LỘ TRÌNH TUYẾN XE BUÝT SỐ ${code}`,
      subtitle: `${name} (${detail.startPoint || detail.diem_dau || ''} ➔ ${detail.endPoint || detail.diem_cuoi || ''})`,
      stops: detail.stops || [],
      metaList: [
        { label: 'Mã tuyến xe', value: `Tuyến ${code}` },
        { label: 'Giá vé lượt', value: formatCurrency(detail.ticketPrice || detail.gia_ve || 6000) },
        { label: 'Giờ hoạt động', value: detail.operatingHours || detail.thoiGianHoatDong || '05:00 - 20:30' },
        { label: 'Tổng cự ly & số trạm', value: `${detail.cu_ly_km || 15} km (${(detail.stops || []).length} trạm)` },
      ],
    });
  };

  const durA = calcTotalDuration(detailA);
  const durB = calcTotalDuration(detailB);
  const fareA = Number(detailA?.ticketPrice ?? detailA?.gia_ve ?? 6000);
  const fareB = Number(detailB?.ticketPrice ?? detailB?.gia_ve ?? 6000);
  const distA = Number(detailA?.cu_ly_km ?? parseFloat(detailA?.cuLy) ?? 15);
  const distB = Number(detailB?.cu_ly_km ?? parseFloat(detailB?.cuLy) ?? 15);
  const stopsCountA = detailA?.stops?.length || 0;
  const stopsCountB = detailB?.stops?.length || 0;

  return (
    <div className="space-y-5">
      {/* Top Selection Card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#172B4D] flex items-center gap-2">
              <Scale size={19} className="text-[#245A85]" />
              <span>So sánh Hai Tuyến Xe Buýt (Đối chiếu Dữ liệu Đồ thị MongoDB)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Đặt 2 tuyến xe lên bàn cân về giá vé, cự ly, số trạm dừng, thời gian toàn trình và tự động tìm các Trạm Trung chuyển giao nhau
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const temp = routeAId;
              setRouteAId(routeBId);
              setRouteBId(temp);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <ArrowLeftRight size={14} /> Đổi bên so sánh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50/40 p-3.5">
            <label className="block text-xs font-bold text-blue-900 mb-1.5">
              🔵 Chọn Tuyến xe thứ nhất (Tuyến A):
            </label>
            <select
              value={routeAId}
              onChange={(e) => setRouteAId(e.target.value)}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-[#172B4D] focus:outline-none"
            >
              {routesList.map((r) => {
                const id = r.id || r._key;
                const code = r.code || r.ma_tuyen;
                const name = r.name || r.ten_tuyen;
                return (
                  <option key={id} value={id}>
                    Tuyến {code}: {name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-3.5">
            <label className="block text-xs font-bold text-emerald-900 mb-1.5">
              🟢 Chọn Tuyến xe thứ hai (Tuyến B):
            </label>
            <select
              value={routeBId}
              onChange={(e) => setRouteBId(e.target.value)}
              className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-[#172B4D] focus:outline-none"
            >
              {routesList.map((r) => {
                const id = r.id || r._key;
                const code = r.code || r.ma_tuyen;
                const name = r.name || r.ten_tuyen;
                return (
                  <option key={id} value={id}>
                    Tuyến {code}: {name}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Intersection / Shared Transfer Hubs Banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <Sparkles size={16} className="text-amber-600" />
            <span>
              Điểm giao nhau (Trạm trung chuyển chung giữa Tuyến {detailA?.code || detailA?.ma_tuyen} và Tuyến{' '}
              {detailB?.code || detailB?.ma_tuyen}):
            </span>
          </div>
          <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-950">
            {sharedStops.length} trạm giao nhau
          </span>
        </div>

        {sharedStops.length === 0 ? (
          <p className="mt-2 text-xs text-amber-800">
            Hai tuyến xe này không có trạm dừng chung trực tiếp. Hành khách cần chuyển qua một tuyến trung gian thứ 3.
          </p>
        ) : (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {sharedStops.map((s) => {
              const code = s.code || s.ma_tram || s.id;
              const name = s.name || s.ten_tram;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => onInspectStop && onInspectStop(s)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                  title="Bấm để xem chi tiết trạm trung chuyển này"
                >
                  <MapPin size={13} className="text-amber-600" />
                  <span>{name}</span>
                  <span className="font-mono text-[10px] text-amber-700">({code})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Side-by-side Comparison Table & Stops Sequence */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          Đang tải và đối chiếu dữ liệu 2 tuyến từ MongoDB...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            { detail: detailA, color: '#2563eb', badgeBg: 'bg-blue-600', dur: durA, otherDur: durB, fare: fareA, otherFare: fareB, dist: distA, stopsCount: stopsCountA },
            { detail: detailB, color: '#16866B', badgeBg: 'bg-[#16866B]', dur: durB, otherDur: durA, fare: fareB, otherFare: fareA, dist: distB, stopsCount: stopsCountB },
          ].map((col, idx) => {
            const d = col.detail;
            if (!d) return null;
            const code = d.code || d.ma_tuyen;
            const name = d.name || d.ten_tuyen;
            const isCheaper = col.fare < col.otherFare;
            const isFaster = col.dur < col.otherDur;

            return (
              <div
                key={idx}
                className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden flex flex-col"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`rounded-xl px-3 py-1.5 text-xs font-extrabold text-white ${col.badgeBg}`}>
                      Tuyến {code}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#172B4D] truncate">{name}</h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        {d.startPoint || d.diem_dau} ➔ {d.endPoint || d.diem_cuoi}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePrintRoute(d)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
                    title="In phiếu thông tin tuyến xe này"
                  >
                    <Printer size={13} /> In tuyến
                  </button>
                </div>

                {/* Metrics Comparison Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b border-slate-100 bg-white text-xs">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Giá vé lượt</div>
                    <div className="mt-1 font-extrabold text-sm text-[#172B4D] flex items-center gap-1">
                      <span>{formatCurrency(col.fare)}</span>
                    </div>
                    {isCheaper && (
                      <span className="text-[10px] font-bold text-emerald-600">✓ Rẻ hơn</span>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Cự ly tuyến</div>
                    <div className="mt-1 font-extrabold text-sm text-[#172B4D]">{col.dist} km</div>
                    <span className="text-[10px] text-slate-400">Toàn lộ trình</span>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Số trạm dừng</div>
                    <div className="mt-1 font-extrabold text-sm text-[#172B4D]">{col.stopsCount} trạm</div>
                    <span className="text-[10px] text-slate-400">Quan hệ CO_TRAM</span>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">TG toàn trình</div>
                    <div className="mt-1 font-extrabold text-sm text-[#172B4D]">~{col.dur} phút</div>
                    {isFaster && (
                      <span className="text-[10px] font-bold text-emerald-600">✓ Nhanh hơn</span>
                    )}
                  </div>
                </div>

                {/* Operating hours */}
                <div className="px-5 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-400" />
                    Giờ chạy: <strong>{d.operatingHours || d.thoiGianHoatDong || '05:00 - 20:30'}</strong>
                  </span>
                  <span>Giãn cách: <strong>{d.frequency || d.gianCachChuyen || '10 - 15 phút'}</strong></span>
                </div>

                {/* Stops List of Route */}
                <div className="p-4 flex-1">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                    Danh sách trạm đi qua ({col.stopsCount} trạm — Bấm vào trạm để xem chi tiết):
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 pr-1">
                    {(d.stops || []).map((s, sIdx) => {
                      const sCode = s.code || s.ma_tram || s.id;
                      const isShared = sharedStops.some(
                        (sh) => (sh.code || sh.ma_tram || sh.id) === sCode
                      );

                      return (
                        <div
                          key={sCode || sIdx}
                          onClick={() => onInspectStop && onInspectStop(s)}
                          className={`flex items-center justify-between gap-2 py-2 px-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                            isShared
                              ? 'bg-amber-50/80 hover:bg-amber-100 font-semibold'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                              {sIdx + 1}
                            </span>
                            <span className="truncate text-slate-800">{s.name || s.ten_tram}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isShared && (
                              <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                                Trạm chung
                              </span>
                            )}
                            <span className="font-mono text-[11px] text-slate-400">{sCode}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RouteComparison;

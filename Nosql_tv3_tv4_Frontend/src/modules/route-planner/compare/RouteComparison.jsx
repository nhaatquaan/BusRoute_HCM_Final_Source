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
  const [direction, setDirection] = useState('luot_di');
  const [routeAId, setRouteAId] = useState('TX_01');
  const [routeBId, setRouteBId] = useState('TX_19');
  const [detailA, setDetailA] = useState(null);
  const [detailB, setDetailB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [retryTrigger, setRetryTrigger] = useState(0);

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
      setFetchError('');
      try {
        // Tải chính xác dữ liệu của chiều đã chọn (không dùng fallback âm thầm sang lượt đi khi lượt về lỗi)
        const [a, b] = await Promise.all([
          routeService.getById(routeAId, direction),
          routeService.getById(routeBId, direction),
        ]);
        if (!mounted) return;
        setDetailA(a);
        setDetailB(b);
      } catch (err) {
        if (!mounted) return;
        setDetailA(null);
        setDetailB(null);
        setFetchError(
          `Không thể tải dữ liệu chiều "${direction === 'luot_di' ? 'Lượt đi' : 'Lượt về'}": ${err.message || 'Lỗi kết nối'}`
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchDetails();
    return () => {
      mounted = false;
    };
  }, [routeAId, routeBId, direction, retryTrigger]);

  // Tìm các trạm giao nhau (Trạm trung chuyển chung giữa Tuyến A và Tuyến B)
  const sharedStops = useMemo(() => {
    const stopsA = detailA?.stops || [];
    const stopsB = detailB?.stops || [];
    const idsB = new Set(stopsB.map((s) => s.code || s.ma_tram || s.id || s._key));
    return stopsA.filter((s) => idsB.has(s.code || s.ma_tram || s.id || s._key));
  }, [detailA, detailB]);

  const calcTotalDuration = (routeDetail) => {
    const stops = routeDetail?.stops;
    if (!Array.isArray(stops) || stops.length <= 1) {
      return null;
    }

    let total = 0;
    let validEdgeCount = 0;
    const totalEdges = stops.length - 1;

    // Trong MongoDB và Backend API, thoi_gian_di_chuyen_phut tại stops[i]
    // biểu diễn thời gian của cạnh KE_TIEP đi từ stops[i] đến stops[i + 1].
    // Tuyến có N trạm sẽ có N - 1 cạnh (chỉ duyệt từ phần tử 0 đến length - 2).
    // Phần tử cuối cùng (length - 1) không có chặng kế tiếp nên không cộng dồn.
    for (let i = 0; i < totalEdges; i++) {
      const edgeTime = stops[i]?.thoi_gian_di_chuyen_phut ?? stops[i]?.thoi_gian_den_tram_tiep_theo;
      if (
        edgeTime !== undefined &&
        edgeTime !== null &&
        !isNaN(Number(edgeTime)) &&
        Number(edgeTime) >= 0
      ) {
        total += Number(edgeTime);
        validEdgeCount++;
      }
    }

    if (validEdgeCount === 0) {
      return null;
    }

    return {
      totalMinutes: total,
      isEstimate: validEdgeCount < totalEdges,
      validEdges: validEdgeCount,
      totalEdges,
    };
  };

  const handlePrintRoute = (detail) => {
    if (!detail) return;
    const code = detail.code || detail.ma_tuyen || detail.maTuyen;
    const name = detail.name || detail.ten_tuyen || detail.tenTuyen;
    const rawFare = detail.gia_ve ?? detail.ticketPrice ?? detail.giaVe;
    const rawDist = detail.cu_ly_km ?? (detail.cuLy ? parseFloat(detail.cuLy) : null);
    const fareStr = rawFare !== undefined && rawFare !== null && !isNaN(Number(rawFare)) ? formatCurrency(Number(rawFare)) : 'Chưa cập nhật';
    const distStr = rawDist !== undefined && rawDist !== null && !isNaN(Number(rawDist)) ? `${rawDist} km` : 'Chưa cập nhật';
    const durInfo = calcTotalDuration(detail);
    const durStr = durInfo
      ? (durInfo.isEstimate
          ? `${durInfo.totalMinutes} phút dữ liệu đã có (thiếu ${durInfo.totalEdges - durInfo.validEdges}/${durInfo.totalEdges} chặng – chưa đủ tính toàn tuyến)`
          : `~${durInfo.totalMinutes} phút (toàn trình ${durInfo.totalEdges}/${durInfo.totalEdges} cạnh KE_TIEP)`)
      : 'Chưa cập nhật';
    printRouteDocument({
      title: `THÔNG TIN LỘ TRÌNH TUYẾN XE BUÝT SỐ ${code}`,
      subtitle: `${name} (${detail.startPoint || detail.diem_dau || ''} ➔ ${detail.endPoint || detail.diem_cuoi || ''})`,
      stops: detail.stops || [],
      metaList: [
        { label: 'Mã tuyến xe', value: `Tuyến ${code}` },
        { label: 'Chiều so sánh', value: direction === 'luot_di' ? 'Lượt đi' : 'Lượt về' },
        { label: 'Giá vé lượt', value: fareStr },
        { label: 'Thời gian toàn trình', value: durStr },
        { label: 'Giờ hoạt động', value: detail.operatingHours || detail.thoiGianHoatDong || '05:00 - 20:30' },
        { label: 'Tổng cự ly & số trạm', value: `${distStr} (${(detail.stops || []).length} trạm)` },
      ],
    });
  };

  const durA = calcTotalDuration(detailA);
  const durB = calcTotalDuration(detailB);

  const rawFareA = detailA?.gia_ve ?? detailA?.ticketPrice ?? detailA?.giaVe;
  const rawFareB = detailB?.gia_ve ?? detailB?.ticketPrice ?? detailB?.giaVe;
  const fareA = rawFareA !== undefined && rawFareA !== null && !isNaN(Number(rawFareA)) ? Number(rawFareA) : null;
  const fareB = rawFareB !== undefined && rawFareB !== null && !isNaN(Number(rawFareB)) ? Number(rawFareB) : null;

  const rawDistA = detailA?.cu_ly_km ?? (detailA?.cuLy ? parseFloat(detailA.cuLy) : null);
  const rawDistB = detailB?.cu_ly_km ?? (detailB?.cuLy ? parseFloat(detailB.cuLy) : null);
  const distA = rawDistA !== undefined && rawDistA !== null && !isNaN(Number(rawDistA)) ? Number(rawDistA) : null;
  const distB = rawDistB !== undefined && rawDistB !== null && !isNaN(Number(rawDistB)) ? Number(rawDistB) : null;

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
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setDirection('luot_di')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                  direction === 'luot_di'
                    ? 'bg-white text-[#245A85] shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lượt đi
              </button>
              <button
                type="button"
                onClick={() => setDirection('luot_ve')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                  direction === 'luot_ve'
                    ? 'bg-white text-[#245A85] shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lượt về
              </button>
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

      {/* Error Alert with Retry button (nếu có lỗi tải dữ liệu của chiều đã chọn) */}
      {fetchError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-xs text-xs flex flex-wrap items-center justify-between gap-3 text-rose-800">
          <div>
            <strong className="font-bold text-rose-900">Không thể tải dữ liệu:</strong> {fetchError}
          </div>
          <button
            type="button"
            onClick={() => setRetryTrigger((k) => k + 1)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer"
          >
            Thử tải lại
          </button>
        </div>
      )}

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
            const isCheaper = col.fare !== null && col.otherFare !== null && col.fare < col.otherFare;
            // Chỉ so sánh nhanh/chậm khi CẢ HAI tuyến đều có đầy đủ dữ liệu (không so sánh nếu một trong hai đang ước tính / thiếu chặng)
            const isFaster =
              col.dur &&
              col.otherDur &&
              !col.dur.isEstimate &&
              !col.otherDur.isEstimate &&
              col.dur.totalMinutes < col.otherDur.totalMinutes;

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
                      <span>{col.fare !== null ? formatCurrency(col.fare) : 'Chưa cập nhật'}</span>
                    </div>
                    {isCheaper && (
                      <span className="text-[10px] font-bold text-emerald-600">✓ Rẻ hơn</span>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Cự ly tuyến</div>
                    <div className="mt-1 font-extrabold text-sm text-[#172B4D]">
                      {col.dist !== null ? `${col.dist} km` : 'Chưa cập nhật'}
                    </div>
                    <span className="text-[10px] text-slate-400">Toàn lộ trình</span>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Số trạm dừng</div>
                    <div className="mt-1 font-extrabold text-sm text-[#172B4D]">{col.stopsCount} trạm</div>
                    <span className="text-[10px] text-slate-400">Quan hệ CO_TRAM</span>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">TG toàn trình</div>
                    {col.dur ? (
                      col.dur.isEstimate ? (
                        <>
                          <div className="mt-1 font-extrabold text-sm text-amber-700">
                            {col.dur.totalMinutes} phút <span className="text-[10px] font-semibold text-amber-600">(dữ liệu đã có)</span>
                          </div>
                          <span className="text-[10px] text-amber-600 block mt-0.5 font-medium leading-tight">
                            Thiếu {col.dur.totalEdges - col.dur.validEdges}/{col.dur.totalEdges} chặng – Chưa đủ tính toàn tuyến
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="mt-1 font-extrabold text-sm text-[#172B4D]">
                            ~{col.dur.totalMinutes} phút
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Tổng thời gian ({col.dur.totalEdges}/{col.dur.totalEdges} cạnh KE_TIEP)
                          </span>
                        </>
                      )
                    ) : (
                      <>
                        <div className="mt-1 font-extrabold text-sm text-slate-400">Chưa cập nhật</div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Chưa đủ dữ liệu chặng</span>
                      </>
                    )}
                    {isFaster && (
                      <span className="text-[10px] font-bold text-emerald-600 block mt-1">✓ Nhanh hơn</span>
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

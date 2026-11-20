import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RoutePlannerModule } from '../route-planner';
import { authService } from '../../services/authService';
import { passengerService } from '../../services/passengerService';
import {
  Compass,
  Bot,
  Network,
  User,
  Navigation,
  Sparkles,
  Heart,
  History,
  MapPin,
  Home,
  Briefcase,
  GraduationCap,
  Plus,
  Trash2,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ChevronRight,
  Clock,
  ArrowRight
} from 'lucide-react';
import Button from '../../components/Button';
import Badge from '../../components/Badge';

export default function PassengerDashboardPage() {
  const user = authService.getCurrentUser() || {};
  const displayName = user.fullName || user.ho_ten || 'Hành khách';

  // State
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState(null);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [favoriteRoutes, setFavoriteRoutes] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [guestHistoryCount, setGuestHistoryCount] = useState(0);
  const [preferences, setPreferences] = useState({ defaultCriteria: 'least_transfers', maxWalkingKm: 1.0 });

  // Notifications / Feedback
  const [toastMsg, setToastMsg] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Modal: Add/Edit Place
  const [placeModalOpen, setPlaceModalOpen] = useState(false);
  const [placeForm, setPlaceForm] = useState({ type: 'home', name: '', address: '', nearestStopId: '' });
  const [placeSaving, setPlaceSaving] = useState(false);

  // Modal: Preferences
  const [prefModalOpen, setPrefModalOpen] = useState(false);
  const [prefForm, setPrefForm] = useState({ defaultCriteria: 'least_transfers', maxWalkingKm: 1.0 });

  // Quick search triggering
  const [plannerKey, setPlannerKey] = useState(1);

  // Load all passenger data
  const loadPassengerData = useCallback(async () => {
    try {
      setLoading(true);
      const [recs, places, favs, hist, prefs] = await Promise.all([
        passengerService.getRecommendations().catch(() => null),
        passengerService.getSavedPlaces().catch(() => []),
        passengerService.getFavoriteRoutes().catch(() => []),
        passengerService.getSearchHistory({ limit: 8, page: 1 }).catch(() => ({ data: [] })),
        passengerService.getPreferences().catch(() => ({ defaultCriteria: 'least_transfers', maxWalkingKm: 1.0 }))
      ]);

      setRecommendations(recs);
      setSavedPlaces(places);
      setFavoriteRoutes(favs);
      setSearchHistory(hist?.data || []);
      setPreferences(prefs);
      setPrefForm(prefs);

      // Check Guest history in localStorage
      const guestHistory = passengerService.getGuestLocalHistory();
      setGuestHistoryCount(guestHistory.length);
    } catch (err) {
      console.warn('Load passenger data error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPassengerData();
  }, [loadPassengerData]);

  // Sync Guest history
  const handleSyncGuestHistory = async () => {
    try {
      const guestList = passengerService.getGuestLocalHistory();
      if (guestList.length === 0) return;
      const res = await passengerService.syncGuestHistory(guestList);
      passengerService.clearGuestLocalHistory();
      setGuestHistoryCount(0);
      showToast(`Đã đồng bộ thành công ${res.syncedCount} lượt tìm kiếm từ trình duyệt!`);
      loadPassengerData();
    } catch (err) {
      showToast(err.message || 'Lỗi khi đồng bộ lịch sử', 'error');
    }
  };

  // Add Place
  const handleSavePlace = async (e) => {
    e.preventDefault();
    if (!placeForm.name.trim()) {
      showToast('Vui lòng nhập tên địa điểm.', 'error');
      return;
    }
    try {
      setPlaceSaving(true);
      await passengerService.addSavedPlace(placeForm);
      setPlaceModalOpen(false);
      setPlaceForm({ type: 'home', name: '', address: '', nearestStopId: '' });
      showToast(`Đã lưu địa điểm "${placeForm.name}" thành công!`);
      loadPassengerData();
    } catch (err) {
      showToast(err.message || 'Không thể lưu địa điểm', 'error');
    } finally {
      setPlaceSaving(false);
    }
  };

  // Delete Place
  const handleDeletePlace = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa địa điểm "${name}"?`)) return;
    try {
      await passengerService.deleteSavedPlace(id);
      showToast(`Đã xóa địa điểm "${name}".`);
      loadPassengerData();
    } catch (err) {
      showToast(err.message || 'Lỗi xóa địa điểm', 'error');
    }
  };

  // Remove Favorite Route
  const handleRemoveFavorite = async (routeId, routeCode) => {
    try {
      await passengerService.removeFavoriteRoute(routeId);
      showToast(`Đã bỏ tuyến ${routeCode} khỏi danh sách yêu thích.`);
      loadPassengerData();
    } catch (err) {
      showToast(err.message || 'Lỗi bỏ thích tuyến', 'error');
    }
  };

  // Delete single history
  const handleDeleteHistory = async (id) => {
    try {
      await passengerService.deleteHistoryItem(id);
      showToast('Đã xóa mục lịch sử tìm kiếm.');
      loadPassengerData();
    } catch (err) {
      showToast(err.message || 'Lỗi xóa mục lịch sử', 'error');
    }
  };

  // Clear all history
  const handleClearAllHistory = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử tìm kiếm của mình?')) return;
    try {
      await passengerService.clearAllHistory();
      showToast('Đã xóa sạch toàn bộ lịch sử tìm kiếm.');
      loadPassengerData();
    } catch (err) {
      showToast(err.message || 'Lỗi xóa lịch sử', 'error');
    }
  };

  // Save Preferences
  const handleSavePreferences = async (e) => {
    e.preventDefault();
    try {
      const updated = await passengerService.updatePreferences(prefForm);
      setPreferences(updated);
      setPrefModalOpen(false);
      showToast('Đã lưu sở thích tìm đường thành công!');
    } catch (err) {
      showToast(err.message || 'Lỗi lưu sở thích', 'error');
    }
  };

  // Helper icons for place types
  const getPlaceIcon = (type) => {
    switch (type) {
      case 'home':
        return <Home size={16} className="text-emerald-600" />;
      case 'work':
        return <Briefcase size={16} className="text-blue-600" />;
      case 'school':
        return <GraduationCap size={16} className="text-amber-600" />;
      default:
        return <MapPin size={16} className="text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold shadow-lg transition-all ${
            toastMsg.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {toastMsg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastMsg.msg}</span>
        </div>
      )}

      {/* Guest History Sync Banner (if guest local history detected) */}
      {guestHistoryCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <RefreshCw size={18} className="text-amber-600 animate-spin-slow shrink-0" />
            <div>
              <span className="font-bold">Đồng bộ lịch sử tìm kiếm:</span> Bạn có{' '}
              <span className="font-bold text-amber-950">{guestHistoryCount} lượt tìm kiếm</span> từ phiên
              truy cập trước trên trình duyệt này.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSyncGuestHistory}
              className="rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-700 transition-colors"
            >
              Đồng bộ ngay
            </button>
            <button
              onClick={() => {
                passengerService.clearGuestLocalHistory();
                setGuestHistoryCount(0);
              }}
              className="rounded-lg bg-white px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 border border-amber-200"
            >
              Bỏ qua
            </button>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-[#16866B] to-[#245A85] p-6 text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs">
              <Sparkles size={16} />
            </span>
            <h1 className="text-xl font-bold tracking-tight">Xin chào, {displayName}!</h1>
          </div>
          <p className="text-xs text-emerald-100 max-w-xl">
            Chào mừng bạn đến với Cổng thông tin Hành khách BusRoute HCM. Lộ trình cá nhân, tuyến yêu thích và các địa điểm thân quen của bạn được quản lý an toàn và bảo mật.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPrefModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors border border-white/20"
          >
            <Sliders size={13} />
            Tiêu chí mặc định: {preferences.defaultCriteria === 'fastest' ? 'Nhanh nhất' : (preferences.defaultCriteria === 'fewest_stops' || preferences.defaultCriteria === 'least_walking') ? 'Ít trạm dừng nhất' : 'Ít chuyển tuyến'}
          </button>
          <Link
            to="/portal/profile"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#16866B] hover:bg-slate-50 transition-colors shadow-xs"
          >
            <User size={13} />
            Hồ sơ cá nhân
          </Link>
        </div>
      </div>

      {/* Grid: Saved Places & Smart Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. ĐỊA ĐIỂM ĐÃ LƯU (SAVED PLACES) */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="text-[#16866B]" size={18} />
              <h2 className="text-sm font-bold text-[#172B4D]">Địa điểm đã lưu của bạn</h2>
            </div>
            <button
              onClick={() => setPlaceModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#16866B] hover:text-[#116954]"
            >
              <Plus size={14} /> Thêm địa điểm
            </button>
          </div>

          {savedPlaces.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <MapPin size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Bạn chưa lưu địa điểm thân quen nào</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                Lưu Nhà riêng, Nơi làm việc hoặc Trường học để tra cứu lộ trình nhanh chóng chỉ với một chạm.
              </p>
              <button
                onClick={() => setPlaceModalOpen(true)}
                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-[#16866B] hover:bg-emerald-100"
              >
                <Plus size={13} /> Thêm địa điểm đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedPlaces.map((place) => (
                <div
                  key={place.id}
                  className="group relative flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 hover:border-emerald-200 hover:bg-white transition-all shadow-xs"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs border border-slate-200">
                    {getPlaceIcon(place.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 truncate">{place.name}</span>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                        {place.type === 'home' ? 'Nhà' : place.type === 'work' ? 'Cơ quan' : place.type === 'school' ? 'Trường' : 'Khác'}
                      </span>
                    </div>
                    {place.address && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{place.address}</p>
                    )}
                    {place.nearestStopName && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                        <Navigation size={10} />
                        <span>Trạm gần: {place.nearestStopName}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeletePlace(place.id, place.name)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-opacity p-1"
                    title="Xóa địa điểm này"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. ĐỀ XUẤT LỘ TRÌNH THÔNG MINH (RECOMMENDATIONS) */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-600" size={18} />
              <h2 className="text-sm font-bold text-[#172B4D]">Gợi ý hành trình thông minh</h2>
            </div>
            {recommendations?.basedOn === 'actual_history_and_places' && (
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                Dựa trên thói quen tìm kiếm
              </span>
            )}
          </div>

          {!recommendations?.hasData || recommendations?.recommendations?.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <Sparkles size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Chưa có đề xuất cá nhân hóa</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                Hệ thống sẽ tự động học hỏi và đề xuất hành trình yêu thích khi bạn tìm kiếm các chuyến đi thường ngày.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recommendations.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-purple-100 bg-purple-50/40 p-3 hover:bg-purple-50 transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded">
                        {rec.badge}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate">{rec.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{rec.explanation}</p>
                  </div>
                  <div className="shrink-0">
                    <span className="text-[11px] font-bold text-purple-700 flex items-center gap-0.5 hover:underline">
                      Xem lộ trình <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid: Tuyến xe yêu thích & Lịch sử tìm kiếm gần đây */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TUYẾN XE YÊU THÍCH (1 Cột) */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="text-rose-500 fill-rose-500" size={18} />
              <h2 className="text-sm font-bold text-[#172B4D]">Tuyến xe yêu thích</h2>
            </div>
            <span className="text-xs font-bold text-slate-400">{favoriteRoutes.length} tuyến</span>
          </div>

          {favoriteRoutes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <Heart size={26} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Chưa có tuyến yêu thích</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Lưu các tuyến xe bạn thường đi để theo dõi nhanh giờ hoạt động và lộ trình trạm.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {favoriteRoutes.map((route) => (
                <div
                  key={route.id}
                  className="flex items-center justify-between gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 hover:bg-white hover:border-rose-200 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: route.color || '#2563eb' }}
                    >
                      {route.routeCode}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{route.routeName}</div>
                      {route.fare && (
                        <div className="text-[10px] text-slate-400">{Number(route.fare).toLocaleString('vi-VN')} đ/lượt</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFavorite(route.routeId, route.routeCode)}
                    className="text-slate-300 hover:text-rose-500 p-1"
                    title="Bỏ thích tuyến"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LỊCH SỬ TÌM KIẾM GẦN ĐÂY (2 Cột) */}
        <div className="lg:col-span-2 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="text-[#245A85]" size={18} />
              <h2 className="text-sm font-bold text-[#172B4D]">Lịch sử tìm kiếm gần đây</h2>
            </div>
            {searchHistory.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {searchHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <History size={26} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Chưa có lịch sử tìm kiếm</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Các lượt tìm đường xuất phát và đích sẽ được ghi nhận tự động để bạn tra cứu lại tiện lợi.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                    <th className="pb-2.5">Thời gian</th>
                    <th className="pb-2.5">Trạm đi ➔ Trạm đến</th>
                    <th className="pb-2.5">Tiêu chí</th>
                    <th className="pb-2.5">Kết quả</th>
                    <th className="pb-2.5 text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {searchHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 text-slate-400 text-[11px] whitespace-nowrap">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'}
                      </td>
                      <td className="py-2.5 font-semibold text-slate-800">
                        {item.fromStopName} <ArrowRight size={11} className="inline mx-1 text-slate-400" /> {item.toStopName}
                      </td>
                      <td className="py-2.5">
                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {item.criteria === 'fastest' ? 'Nhanh nhất' : (item.criteria === 'fewest_stops' || item.criteria === 'least_walking') ? 'Ít trạm dừng nhất' : 'Ít chuyển tuyến'}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 text-[11px]">
                        {item.summaryResult?.totalPaths ? `${item.summaryResult.totalPaths} phương án` : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => handleDeleteHistory(item.id)}
                          className="text-slate-300 hover:text-rose-500 p-1"
                          title="Xóa mục này"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Route Planner Component */}
      <div className="pt-2">
        <RoutePlannerModule key={plannerKey} defaultCriteria={preferences.defaultCriteria} />
      </div>

      {/* Modal: Thêm Địa Điểm */}
      {placeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-[#172B4D]">Lưu địa điểm thân quen</h3>
              <button onClick={() => setPlaceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePlace} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loại địa điểm *</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'home', label: 'Nhà riêng', icon: Home },
                    { id: 'work', label: 'Cơ quan', icon: Briefcase },
                    { id: 'school', label: 'Trường học', icon: GraduationCap },
                    { id: 'other', label: 'Khác', icon: MapPin }
                  ].map((t) => {
                    const IconComponent = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setPlaceForm({ ...placeForm, type: t.id })}
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 border transition-all ${
                          placeForm.type === t.id
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <IconComponent size={16} />
                        <span className="text-[10px]">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên địa điểm *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nhà riêng, Công ty FPT, ĐH Bách Khoa..."
                  value={placeForm.name}
                  onChange={(e) => setPlaceForm({ ...placeForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa chỉ chi tiết (nếu có)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 268 Lý Thường Kiệt, Quận 10..."
                  value={placeForm.address}
                  onChange={(e) => setPlaceForm({ ...placeForm, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setPlaceModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" disabled={placeSaving}>
                  {placeSaving ? 'Đang lưu...' : 'Lưu địa điểm'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tùy Chỉnh Sở Thích Tìm Đường */}
      {prefModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-[#172B4D]">Tùy chỉnh sở thích tìm đường</h3>
              <button onClick={() => setPrefModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-2">Tiêu chí ưu tiên mặc định</label>
                <div className="space-y-2">
                  {[
                    { id: 'least_transfers', title: 'Ít chuyển tuyến nhất (Khuyên dùng)', desc: 'Ưu tiên các chuyến đi thẳng hoặc ít đổi xe nhất' },
                    { id: 'fastest', title: 'Thời gian nhanh nhất', desc: 'Ưu tiên tổng thời gian di chuyển ngắn nhất' },
                    { id: 'fewest_stops', title: 'Ít trạm dừng nhất', desc: 'Tối ưu số lượng trạm dừng trung gian ít nhất trên hành trình' }
                  ].map((crit) => (
                    <label
                      key={crit.id}
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                        prefForm.defaultCriteria === crit.id
                          ? 'border-emerald-600 bg-emerald-50/60 font-medium'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="criteria"
                        value={crit.id}
                        checked={prefForm.defaultCriteria === crit.id}
                        onChange={() => setPrefForm({ ...prefForm, defaultCriteria: crit.id })}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="font-bold text-slate-800">{crit.title}</div>
                        <div className="text-[11px] text-slate-500">{crit.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setPrefModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary">
                  Lưu cấu hình
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

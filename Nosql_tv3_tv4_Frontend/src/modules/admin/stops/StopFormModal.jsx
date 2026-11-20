import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import Modal from '../../../components/Modal';
import Button from '../../../components/Button';
import { MapPin, Crosshair } from 'lucide-react';

const pickerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [22, 34],
  iconAnchor: [11, 34],
});

// Component lắng nghe sự kiện click trên bản đồ Leaflet để chọn tọa độ
function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  const eventHandlers = useMemo(
    () => ({
      dragend(e) {
        const marker = e.target;
        if (marker) {
          const latLng = marker.getLatLng();
          setPosition([latLng.lat, latLng.lng]);
        }
      },
    }),
    [setPosition]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      icon={pickerIcon}
    />
  );
}

const EMPTY_FORM = {
  code: '',
  name: '',
  address: '',
  district: '',
  lat: '10.7769',
  lng: '106.7009',
};

export default function StopFormModal({ isOpen, onClose, initialData, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [mapCoords, setMapCoords] = useState([10.7769, 106.7009]);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (initialData) {
        setForm({ ...EMPTY_FORM, ...initialData });
        const lat = Number(initialData.lat || initialData.latitude || 10.7769);
        const lng = Number(initialData.lng || initialData.longitude || 106.7009);
        setMapCoords([lat, lng]);
      } else {
        setForm(EMPTY_FORM);
        setMapCoords([10.7769, 106.7009]);
      }
    }
  }, [isOpen, initialData]);

  const handleCoordsChangeFromMap = (coords) => {
    setMapCoords(coords);
    setForm((prev) => ({
      ...prev,
      lat: coords[0].toFixed(6),
      lng: coords[1].toFixed(6),
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'lat' || name === 'lng') {
      const latVal = name === 'lat' ? Number(value) : mapCoords[0];
      const lngVal = name === 'lng' ? Number(value) : mapCoords[1];
      if (!isNaN(latVal) && !isNaN(lngVal) && latVal !== 0 && lngVal !== 0) {
        setMapCoords([latVal, lngVal]);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.code.trim() || !form.name.trim()) {
      setError('Mã trạm và Tên trạm dừng không được để trống.');
      return;
    }
    const latNum = Number(form.lat);
    const lngNum = Number(form.lng);
    if (isNaN(latNum) || isNaN(lngNum) || latNum < 10.0 || latNum > 11.5 || lngNum < 106.0 || lngNum > 107.5) {
      setError('Tọa độ GPS phải nằm trong phạm vi khu vực TP.HCM (Lat: 10.0-11.5, Lng: 106.0-107.5).');
      return;
    }

    try {
      setSaving(true);
      await onSubmit({
        ...form,
        lat: latNum,
        lng: lngNum,
        vi_do: latNum,
        kinh_do: lngNum,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể lưu thông tin trạm dừng.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Chỉnh sửa trạm ${initialData.code}` : 'Thêm trạm dừng mới'}
      maxWidth="max-w-2xl"
    >
      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Mã trạm *
            </label>
            <input
              name="code"
              value={form.code}
              onChange={handleChange}
              disabled={isEdit}
              placeholder="VD: TR_26"
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-mono focus:border-[#245A85] focus:outline-none disabled:bg-slate-100"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Tên trạm dừng *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="VD: Trạm Vòng xoay Hàng Xanh"
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs focus:border-[#245A85] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Địa chỉ
            </label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Số nhà, tên đường..."
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs focus:border-[#245A85] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Quận / Huyện
            </label>
            <input
              name="district"
              value={form.district}
              onChange={handleChange}
              placeholder="VD: Quận 1, TP. Thủ Đức"
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs focus:border-[#245A85] focus:outline-none"
            />
          </div>
        </div>

        {/* Leaflet Coordinate Picker Map */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <MapPin size={14} className="text-[#245A85]" />
              Chọn vị trí trên bản đồ Leaflet (Click hoặc Kéo Marker):
            </label>
            <span className="text-[11px] text-slate-400">
              Tọa độ: {Number(form.lat).toFixed(4)}, {Number(form.lng).toFixed(4)}
            </span>
          </div>

          <div className="h-48 w-full rounded-lg overflow-hidden border border-[#E2E8F0] relative z-0">
            <MapContainer center={mapCoords} zoom={13} scrollWheelZoom={false} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker position={mapCoords} setPosition={handleCoordsChangeFromMap} />
            </MapContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Vĩ độ (Latitude)
            </label>
            <input
              type="number"
              step="any"
              name="lat"
              value={form.lat}
              onChange={handleChange}
              placeholder="10.7709"
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs tabular-nums focus:border-[#245A85] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Kinh độ (Longitude)
            </label>
            <input
              type="number"
              step="any"
              name="lng"
              value={form.lng}
              onChange={handleChange}
              placeholder="106.7009"
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs tabular-nums focus:border-[#245A85] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy bỏ
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm trạm mới'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

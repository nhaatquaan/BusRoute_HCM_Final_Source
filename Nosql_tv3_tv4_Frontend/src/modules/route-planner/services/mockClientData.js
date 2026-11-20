/**
 * Client Mock Data for TP.HCM Bus Route Network
 * Makes the RoutePlanner frontend module completely self-contained and portable.
 */

export const tuyenXeData = [
  {
    _key: '01',
    _id: 'TuyenXe/01',
    maTuyen: '01',
    tenTuyen: 'Bến Thành - Bến xe Chợ Lớn',
    loaiTuyen: 'Phổ thông - có trợ giá',
    giaVe: 5000,
    thoiGianHoatDong: '05:00 - 20:30',
    gianCachChuyen: '10 - 15 phút',
    mauSac: '#2563eb',
    cuLy: '9.2 km',
    soChuyen: 160
  },
  {
    _key: '19',
    _id: 'TuyenXe/19',
    maTuyen: '19',
    tenTuyen: 'Bến Thành - Khu Đô thị ĐHQG TP.HCM',
    loaiTuyen: 'Phổ thông - có trợ giá',
    giaVe: 7000,
    thoiGianHoatDong: '05:00 - 20:15',
    gianCachChuyen: '8 - 15 phút',
    mauSac: '#059669',
    cuLy: '22.5 km',
    soChuyen: 180
  },
  {
    _key: '03',
    _id: 'TuyenXe/03',
    maTuyen: '03',
    tenTuyen: 'Bến Thành - Thạnh Lộc (Quận 12)',
    loaiTuyen: 'Phổ thông - có trợ giá',
    giaVe: 6000,
    thoiGianHoatDong: '05:00 - 20:00',
    gianCachChuyen: '12 - 18 phút',
    mauSac: '#d97706',
    cuLy: '18.4 km',
    soChuyen: 120
  },
  {
    _key: '150',
    _id: 'TuyenXe/150',
    maTuyen: '150',
    tenTuyen: 'Bến xe Chợ Lớn - Tân Vạn',
    loaiTuyen: 'Phổ thông - có trợ giá',
    giaVe: 7000,
    thoiGianHoatDong: '04:30 - 21:00',
    gianCachChuyen: '6 - 10 phút',
    mauSac: '#dc2626',
    cuLy: '31.2 km',
    soChuyen: 240
  },
  {
    _key: '08',
    _id: 'TuyenXe/08',
    maTuyen: '08',
    tenTuyen: 'Bến xe Quận 8 - ĐH Quốc Gia',
    loaiTuyen: 'Phổ thông - có trợ giá',
    giaVe: 7000,
    thoiGianHoatDong: '04:40 - 20:30',
    gianCachChuyen: '7 - 12 phút',
    mauSac: '#7c3aed',
    cuLy: '24.8 km',
    soChuyen: 210
  }
];

export const tramDungData = [
  {
    _key: 'TR_BEN_THANH',
    _id: 'TramDung/TR_BEN_THANH',
    maTram: 'TR_BEN_THANH',
    tenTram: 'Trạm Trung chuyển Bến Thành',
    diaChi: 'Hàm Nghi, Phường Bến Nghé, Quận 1',
    latitude: 10.771971,
    longitude: 106.698345,
    khuVuc: 'Quận 1'
  },
  {
    _key: 'TR_CHO_BEN_THANH',
    _id: 'TramDung/TR_CHO_BEN_THANH',
    maTram: 'TR_CHO_BEN_THANH',
    tenTram: 'Chợ Bến Thành (Lê Lai)',
    diaChi: 'Đường Lê Lai, Phường Bến Thành, Quận 1',
    latitude: 10.772530,
    longitude: 106.696000,
    khuVuc: 'Quận 1'
  },
  {
    _key: 'TR_CV_23_9',
    _id: 'TramDung/TR_CV_23_9',
    maTram: 'TR_CV_23_9',
    tenTram: 'Công viên 23/9',
    diaChi: 'Phạm Ngũ Lão, Phường Phạm Ngũ Lão, Quận 1',
    latitude: 10.768780,
    longitude: 106.693890,
    khuVuc: 'Quận 1'
  },
  {
    _key: 'TR_DH_SP',
    _id: 'TramDung/TR_DH_SP',
    maTram: 'TR_DH_SP',
    tenTram: 'Đại học Sư Phạm TP.HCM',
    diaChi: '280 An Dương Vương, Phường 4, Quận 5',
    latitude: 10.759900,
    longitude: 106.682200,
    khuVuc: 'Quận 5'
  },
  {
    _key: 'TR_DH_KHTN',
    _id: 'TramDung/TR_DH_KHTN',
    maTram: 'TR_DH_KHTN',
    tenTram: 'Đại học Khoa học Tự nhiên',
    diaChi: '227 Nguyễn Văn Cừ, Phường 4, Quận 5',
    latitude: 10.762800,
    longitude: 106.682600,
    khuVuc: 'Quận 5'
  },
  {
    _key: 'TR_AN_DUONG_VUONG',
    _id: 'TramDung/TR_AN_DUONG_VUONG',
    maTram: 'TR_AN_DUONG_VUONG',
    tenTram: 'Trạm An Dương Vương',
    diaChi: 'Đường An Dương Vương, Phường 8, Quận 5',
    latitude: 10.755400,
    longitude: 106.671200,
    khuVuc: 'Quận 5'
  },
  {
    _key: 'TR_THUAN_KIEU',
    _id: 'TramDung/TR_THUAN_KIEU',
    maTram: 'TR_THUAN_KIEU',
    tenTram: 'Thuận Kiều Plaza',
    diaChi: '190 Hồng Bàng, Phường 12, Quận 5',
    latitude: 10.753800,
    longitude: 106.657900,
    khuVuc: 'Quận 5'
  },
  {
    _key: 'TR_BX_CHO_LON',
    _id: 'TramDung/TR_BX_CHO_LON',
    maTram: 'TR_BX_CHO_LON',
    tenTram: 'Ga Bến xe Chợ Lớn',
    diaChi: 'Trang Tử, Phường 14, Quận 5',
    latitude: 10.751900,
    longitude: 106.652800,
    khuVuc: 'Quận 5'
  },
  {
    _key: 'TR_DINH_TIEN_HOANG',
    _id: 'TramDung/TR_DINH_TIEN_HOANG',
    maTram: 'TR_DINH_TIEN_HOANG',
    tenTram: 'Đinh Tiên Hoàng - Điện Biên Phủ',
    diaChi: 'Đinh Tiên Hoàng, Phường Đa Kao, Quận 1',
    latitude: 10.789100,
    longitude: 106.699800,
    khuVuc: 'Quận 1'
  },
  {
    _key: 'TR_HANG_XANH',
    _id: 'TramDung/TR_HANG_XANH',
    maTram: 'TR_HANG_XANH',
    tenTram: 'Ngã tư Hàng Xanh',
    diaChi: 'Điện Biên Phủ, Phường 21, Bình Thạnh',
    latitude: 10.801600,
    longitude: 106.711500,
    khuVuc: 'Bình Thạnh'
  },
  {
    _key: 'TR_CAU_SAI_GON',
    _id: 'TramDung/TR_CAU_SAI_GON',
    maTram: 'TR_CAU_SAI_GON',
    tenTram: 'Cầu Sài Gòn',
    diaChi: 'Xa lộ Hà Nội, An Phú, TP. Thủ Đức',
    latitude: 10.799500,
    longitude: 106.723000,
    khuVuc: 'TP. Thủ Đức'
  },
  {
    _key: 'TR_THAO_DIEN',
    _id: 'TramDung/TR_THAO_DIEN',
    maTram: 'TR_THAO_DIEN',
    tenTram: 'Trạm Metro Thảo Điền',
    diaChi: 'Xa lộ Hà Nội, Thảo Điền, TP. Thủ Đức',
    latitude: 10.803200,
    longitude: 106.738000,
    khuVuc: 'TP. Thủ Đức'
  },
  {
    _key: 'TR_NGA_TU_THU_DUC',
    _id: 'TramDung/TR_NGA_TU_THU_DUC',
    maTram: 'TR_NGA_TU_THU_DUC',
    tenTram: 'Ngã tư Thủ Đức',
    diaChi: 'Xa lộ Hà Nội, Hiệp Phú, TP. Thủ Đức',
    latitude: 10.849200,
    longitude: 106.772500,
    khuVuc: 'TP. Thủ Đức'
  },
  {
    _key: 'TR_SUOI_TIEN',
    _id: 'TramDung/TR_SUOI_TIEN',
    maTram: 'TR_SUOI_TIEN',
    tenTram: 'Khu du lịch Suối Tiên',
    diaChi: 'Xa lộ Hà Nội, Tân Phú, TP. Thủ Đức',
    latitude: 10.865200,
    longitude: 106.802800,
    khuVuc: 'TP. Thủ Đức'
  },
  {
    _key: 'TR_DH_QUOC_GIA',
    _id: 'TramDung/TR_DH_QUOC_GIA',
    maTram: 'TR_DH_QUOC_GIA',
    tenTram: 'Đại học Quốc Gia TP.HCM',
    diaChi: 'Khu phố 6, Linh Trung, TP. Thủ Đức',
    latitude: 10.870000,
    longitude: 106.803000,
    khuVuc: 'TP. Thủ Đức'
  },
  {
    _key: 'TR_KTX_KHUA',
    _id: 'TramDung/TR_KTX_KHUA',
    maTram: 'TR_KTX_KHUA',
    tenTram: 'KTX Khu A ĐHQG TP.HCM',
    diaChi: 'Đường Tạ Quang Bửu, Đông Hòa, Dĩ An',
    latitude: 10.878500,
    longitude: 106.806200,
    khuVuc: 'ĐHQG TP.HCM'
  },
  {
    _key: 'TR_BACH_KHOA',
    _id: 'TramDung/TR_BACH_KHOA',
    maTram: 'TR_BACH_KHOA',
    tenTram: 'Đại học Bách Khoa (Cơ sở 1)',
    diaChi: '268 Lý Thường Kiệt, Phường 14, Quận 10',
    latitude: 10.772400,
    longitude: 106.657800,
    khuVuc: 'Quận 10'
  },
  {
    _key: 'TR_BX_MIEN_DONG',
    _id: 'TramDung/TR_BX_MIEN_DONG',
    maTram: 'TR_BX_MIEN_DONG',
    tenTram: 'Bến xe Miền Đông (Cũ)',
    diaChi: '292 Đinh Bộ Lĩnh, Phường 26, Bình Thạnh',
    latitude: 10.814200,
    longitude: 106.712800,
    khuVuc: 'Bình Thạnh'
  },
  {
    _key: 'TR_THANH_LOC',
    _id: 'TramDung/TR_THANH_LOC',
    maTram: 'TR_THANH_LOC',
    tenTram: 'Bến xe Thạnh Lộc',
    diaChi: 'Hà Huy Giáp, Phường Thạnh Lộc, Quận 12',
    latitude: 10.880500,
    longitude: 106.685000,
    khuVuc: 'Quận 12'
  }
];

export const coTramData = [
  // Tuyến 01
  { _from: 'TuyenXe/01', _to: 'TramDung/TR_BEN_THANH', thuTu: 1, chieuDi: 'di' },
  { _from: 'TuyenXe/01', _to: 'TramDung/TR_CHO_BEN_THANH', thuTu: 2, chieuDi: 'di' },
  { _from: 'TuyenXe/01', _to: 'TramDung/TR_CV_23_9', thuTu: 3, chieuDi: 'di' },
  { _from: 'TuyenXe/01', _to: 'TramDung/TR_DH_SP', thuTu: 4, chieuDi: 'di' },
  { _from: 'TuyenXe/01', _to: 'TramDung/TR_DH_KHTN', thuTu: 5, chieuDi: 'di' },
  { _from: 'TuyenXe/01', _to: 'TramDung/TR_AN_DUONG_VUONG', thuTu: 6, chieuDi: 'di' },
  { _from: 'TuyenXe/01', _to: 'TramDung/TR_THUAN_KIEU', thuTu: 7, chieuDi: 'di' },
  { _from: 'TuyenXe/01', _to: 'TramDung/TR_BX_CHO_LON', thuTu: 8, chieuDi: 'di' },

  // Tuyến 19
  { _from: 'TuyenXe/19', _to: 'TramDung/TR_BEN_THANH', thuTu: 1, chieuDi: 'di' },
  { _from: 'TuyenXe/19', _to: 'TramDung/TR_DINH_TIEN_HOANG', thuTu: 2, chieuDi: 'di' },
  { _from: 'TuyenXe/19', _to: 'TramDung/TR_HANG_XANH', thuTu: 3, chieuDi: 'di' },
  { _from: 'TuyenXe/19', _to: 'TramDung/TR_CAU_SAI_GON', thuTu: 4, chieuDi: 'di' },
  { _from: 'TuyenXe/19', _to: 'TramDung/TR_THAO_DIEN', thuTu: 5, chieuDi: 'di' },
  { _from: 'TuyenXe/19', _to: 'TramDung/TR_NGA_TU_THU_DUC', thuTu: 6, chieuDi: 'di' },
  { _from: 'TuyenXe/19', _to: 'TramDung/TR_SUOI_TIEN', thuTu: 7, chieuDi: 'di' },
  { _from: 'TuyenXe/19', _to: 'TramDung/TR_DH_QUOC_GIA', thuTu: 8, chieuDi: 'di' },
  { _from: 'TuyenXe/19', _to: 'TramDung/TR_KTX_KHUA', thuTu: 9, chieuDi: 'di' },

  // Tuyến 03
  { _from: 'TuyenXe/03', _to: 'TramDung/TR_BEN_THANH', thuTu: 1, chieuDi: 'di' },
  { _from: 'TuyenXe/03', _to: 'TramDung/TR_DINH_TIEN_HOANG', thuTu: 2, chieuDi: 'di' },
  { _from: 'TuyenXe/03', _to: 'TramDung/TR_HANG_XANH', thuTu: 3, chieuDi: 'di' },
  { _from: 'TuyenXe/03', _to: 'TramDung/TR_BX_MIEN_DONG', thuTu: 4, chieuDi: 'di' },
  { _from: 'TuyenXe/03', _to: 'TramDung/TR_THANH_LOC', thuTu: 5, chieuDi: 'di' },

  // Tuyến 150
  { _from: 'TuyenXe/150', _to: 'TramDung/TR_BX_CHO_LON', thuTu: 1, chieuDi: 'di' },
  { _from: 'TuyenXe/150', _to: 'TramDung/TR_THUAN_KIEU', thuTu: 2, chieuDi: 'di' },
  { _from: 'TuyenXe/150', _to: 'TramDung/TR_CV_23_9', thuTu: 3, chieuDi: 'di' },
  { _from: 'TuyenXe/150', _to: 'TramDung/TR_BEN_THANH', thuTu: 4, chieuDi: 'di' },
  { _from: 'TuyenXe/150', _to: 'TramDung/TR_HANG_XANH', thuTu: 5, chieuDi: 'di' },
  { _from: 'TuyenXe/150', _to: 'TramDung/TR_CAU_SAI_GON', thuTu: 6, chieuDi: 'di' },
  { _from: 'TuyenXe/150', _to: 'TramDung/TR_NGA_TU_THU_DUC', thuTu: 7, chieuDi: 'di' },
  { _from: 'TuyenXe/150', _to: 'TramDung/TR_SUOI_TIEN', thuTu: 8, chieuDi: 'di' },

  // Tuyến 08
  { _from: 'TuyenXe/08', _to: 'TramDung/TR_BACH_KHOA', thuTu: 1, chieuDi: 'di' },
  { _from: 'TuyenXe/08', _to: 'TramDung/TR_HANG_XANH', thuTu: 2, chieuDi: 'di' },
  { _from: 'TuyenXe/08', _to: 'TramDung/TR_NGA_TU_THU_DUC', thuTu: 3, chieuDi: 'di' },
  { _from: 'TuyenXe/08', _to: 'TramDung/TR_DH_QUOC_GIA', thuTu: 4, chieuDi: 'di' }
];

export const keTiepData = [
  // Route 01
  { _from: 'TramDung/TR_BEN_THANH', _to: 'TramDung/TR_CHO_BEN_THANH', maTuyen: '01', khoangCach: 450, thoiGian: 2, thuTu: 1 },
  { _from: 'TramDung/TR_CHO_BEN_THANH', _to: 'TramDung/TR_CV_23_9', maTuyen: '01', khoangCach: 600, thoiGian: 3, thuTu: 2 },
  { _from: 'TramDung/TR_CV_23_9', _to: 'TramDung/TR_DH_SP', maTuyen: '01', khoangCach: 1400, thoiGian: 5, thuTu: 3 },
  { _from: 'TramDung/TR_DH_SP', _to: 'TramDung/TR_DH_KHTN', maTuyen: '01', khoangCach: 350, thoiGian: 2, thuTu: 4 },
  { _from: 'TramDung/TR_DH_KHTN', _to: 'TramDung/TR_AN_DUONG_VUONG', maTuyen: '01', khoangCach: 1300, thoiGian: 4, thuTu: 5 },
  { _from: 'TramDung/TR_AN_DUONG_VUONG', _to: 'TramDung/TR_THUAN_KIEU', maTuyen: '01', khoangCach: 1500, thoiGian: 5, thuTu: 6 },
  { _from: 'TramDung/TR_THUAN_KIEU', _to: 'TramDung/TR_BX_CHO_LON', maTuyen: '01', khoangCach: 600, thoiGian: 2, thuTu: 7 },

  // Route 19
  { _from: 'TramDung/TR_BEN_THANH', _to: 'TramDung/TR_DINH_TIEN_HOANG', maTuyen: '19', khoangCach: 1900, thoiGian: 6, thuTu: 1 },
  { _from: 'TramDung/TR_DINH_TIEN_HOANG', _to: 'TramDung/TR_HANG_XANH', maTuyen: '19', khoangCach: 1800, thoiGian: 5, thuTu: 2 },
  { _from: 'TramDung/TR_HANG_XANH', _to: 'TramDung/TR_CAU_SAI_GON', maTuyen: '19', khoangCach: 1300, thoiGian: 4, thuTu: 3 },
  { _from: 'TramDung/TR_CAU_SAI_GON', _to: 'TramDung/TR_THAO_DIEN', maTuyen: '19', khoangCach: 1700, thoiGian: 4, thuTu: 4 },
  { _from: 'TramDung/TR_THAO_DIEN', _to: 'TramDung/TR_NGA_TU_THU_DUC', maTuyen: '19', khoangCach: 6200, thoiGian: 12, thuTu: 5 },
  { _from: 'TramDung/TR_NGA_TU_THU_DUC', _to: 'TramDung/TR_SUOI_TIEN', maTuyen: '19', khoangCach: 3800, thoiGian: 8, thuTu: 6 },
  { _from: 'TramDung/TR_SUOI_TIEN', _to: 'TramDung/TR_DH_QUOC_GIA', maTuyen: '19', khoangCach: 900, thoiGian: 3, thuTu: 7 },
  { _from: 'TramDung/TR_DH_QUOC_GIA', _to: 'TramDung/TR_KTX_KHUA', maTuyen: '19', khoangCach: 1100, thoiGian: 3, thuTu: 8 },

  // Route 03
  { _from: 'TramDung/TR_BEN_THANH', _to: 'TramDung/TR_DINH_TIEN_HOANG', maTuyen: '03', khoangCach: 1900, thoiGian: 6, thuTu: 1 },
  { _from: 'TramDung/TR_DINH_TIEN_HOANG', _to: 'TramDung/TR_HANG_XANH', maTuyen: '03', khoangCach: 1800, thoiGian: 5, thuTu: 2 },
  { _from: 'TramDung/TR_HANG_XANH', _to: 'TramDung/TR_BX_MIEN_DONG', maTuyen: '03', khoangCach: 1600, thoiGian: 5, thuTu: 3 },
  { _from: 'TramDung/TR_BX_MIEN_DONG', _to: 'TramDung/TR_THANH_LOC', maTuyen: '03', khoangCach: 8900, thoiGian: 20, thuTu: 4 },

  // Route 150
  { _from: 'TramDung/TR_BX_CHO_LON', _to: 'TramDung/TR_THUAN_KIEU', maTuyen: '150', khoangCach: 600, thoiGian: 2, thuTu: 1 },
  { _from: 'TramDung/TR_THUAN_KIEU', _to: 'TramDung/TR_CV_23_9', maTuyen: '150', khoangCach: 4200, thoiGian: 12, thuTu: 2 },
  { _from: 'TramDung/TR_CV_23_9', _to: 'TramDung/TR_BEN_THANH', maTuyen: '150', khoangCach: 700, thoiGian: 3, thuTu: 3 },
  { _from: 'TramDung/TR_BEN_THANH', _to: 'TramDung/TR_HANG_XANH', maTuyen: '150', khoangCach: 3800, thoiGian: 10, thuTu: 4 },
  { _from: 'TramDung/TR_HANG_XANH', _to: 'TramDung/TR_CAU_SAI_GON', maTuyen: '150', khoangCach: 1300, thoiGian: 4, thuTu: 5 },
  { _from: 'TramDung/TR_CAU_SAI_GON', _to: 'TramDung/TR_NGA_TU_THU_DUC', maTuyen: '150', khoangCach: 7900, thoiGian: 16, thuTu: 6 },
  { _from: 'TramDung/TR_NGA_TU_THU_DUC', _to: 'TramDung/TR_SUOI_TIEN', maTuyen: '150', khoangCach: 3800, thoiGian: 8, thuTu: 7 },

  // Route 08
  { _from: 'TramDung/TR_BACH_KHOA', _to: 'TramDung/TR_HANG_XANH', maTuyen: '08', khoangCach: 6500, thoiGian: 18, thuTu: 1 },
  { _from: 'TramDung/TR_HANG_XANH', _to: 'TramDung/TR_NGA_TU_THU_DUC', maTuyen: '08', khoangCach: 9200, thoiGian: 20, thuTu: 2 },
  { _from: 'TramDung/TR_NGA_TU_THU_DUC', _to: 'TramDung/TR_DH_QUOC_GIA', maTuyen: '08', khoangCach: 4700, thoiGian: 11, thuTu: 3 }
];

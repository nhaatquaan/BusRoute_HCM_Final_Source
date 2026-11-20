const STORAGE_KEYS = {
  ROUTES: 'busroute_mock_routes_v1',
  STOPS: 'busroute_mock_stops_v1',
  USERS: 'busroute_mock_users_v1',
};

const INITIAL_STOPS = [
  {
    id: 'TR_01',
    code: 'TR_01',
    name: 'Trạm trung chuyển Hàm Nghi',
    address: 'Đường Hàm Nghi, Phường Bến Nghé',
    district: 'Quận 1',
    lat: 10.7709,
    lng: 106.7009,
  },
  {
    id: 'TR_02',
    code: 'TR_02',
    name: 'Bến xe buýt Sài Gòn (Công viên 23/9)',
    address: 'Đường Phạm Ngũ Lão, Phường Phạm Ngũ Lão',
    district: 'Quận 1',
    lat: 10.7684,
    lng: 106.6934,
  },
  {
    id: 'TR_03',
    code: 'TR_03',
    name: 'Bến xe Chợ Lớn',
    address: '86 Trang Tử, Phường 14',
    district: 'Quận 5',
    lat: 10.7512,
    lng: 106.6521,
  },
  {
    id: 'TR_04',
    code: 'TR_04',
    name: 'Ngã tư Hàng Xanh',
    address: 'Điện Biên Phủ, Phường 25',
    district: 'Quận Bình Thạnh',
    lat: 10.8013,
    lng: 106.7114,
  },
  {
    id: 'TR_05',
    code: 'TR_05',
    name: 'Ngã tư Thủ Đức',
    address: 'Xa lộ Hà Nội, Phường Hiệp Phú',
    district: 'TP. Thủ Đức',
    lat: 10.8486,
    lng: 106.7736,
  },
  {
    id: 'TR_06',
    code: 'TR_06',
    name: 'Khu Công nghệ cao TP.HCM',
    address: 'Xa lộ Hà Nội, Phường Tân Phú',
    district: 'TP. Thủ Đức',
    lat: 10.8554,
    lng: 106.7859,
  },
  {
    id: 'TR_07',
    code: 'TR_07',
    name: 'Khu du lịch Suối Tiên',
    address: '120 Xa lộ Hà Nội, Phường Tân Phú',
    district: 'TP. Thủ Đức',
    lat: 10.8662,
    lng: 106.8031,
  },
  {
    id: 'TR_08',
    code: 'TR_08',
    name: 'Bến xe buýt Đại học Quốc Gia',
    address: 'Khu đô thị ĐHQG, Phường Linh Trung',
    district: 'TP. Thủ Đức',
    lat: 10.8753,
    lng: 106.8007,
  },
  {
    id: 'TR_09',
    code: 'TR_09',
    name: 'Trường ĐH Bách Khoa TP.HCM',
    address: '268 Lý Thường Kiệt, Phường 14',
    district: 'Quận 10',
    lat: 10.7721,
    lng: 106.6579,
  },
  {
    id: 'TR_10',
    code: 'TR_10',
    name: 'Bến xe Lê Hồng Phong',
    address: '232 Lê Hồng Phong, Phường 4',
    district: 'Quận 5',
    lat: 10.7586,
    lng: 106.6788,
  },
];

const INITIAL_ROUTES = [
  {
    id: 'TX_01',
    code: '01',
    name: 'Bến Thành - Bến xe Chợ Lớn',
    startPoint: 'Bến xe buýt Sài Gòn',
    endPoint: 'Bến xe Chợ Lớn',
    operatingHours: '05:00 - 20:30',
    ticketPrice: 5000,
    frequency: '10 - 15 phút/chuyến',
    status: 'active',
    stopIds: ['TR_02', 'TR_01', 'TR_10', 'TR_03'],
    updatedAt: '2026-11-18',
  },
  {
    id: 'TX_19',
    code: '19',
    name: 'Bến Thành - KCX Linh Trung - ĐH Quốc Gia',
    startPoint: 'Bến xe buýt Sài Gòn',
    endPoint: 'Đại học Quốc Gia',
    operatingHours: '05:00 - 20:00',
    ticketPrice: 7000,
    frequency: '8 - 12 phút/chuyến',
    status: 'active',
    stopIds: ['TR_02', 'TR_01', 'TR_04', 'TR_05', 'TR_07', 'TR_08'],
    updatedAt: '2026-11-19',
  },
  {
    id: 'TX_53',
    code: '53',
    name: 'Lê Hồng Phong - Đại học Quốc Gia',
    startPoint: 'Bến xe Lê Hồng Phong',
    endPoint: 'Đại học Quốc Gia',
    operatingHours: '05:15 - 19:30',
    ticketPrice: 7000,
    frequency: '12 - 18 phút/chuyến',
    status: 'active',
    stopIds: ['TR_10', 'TR_01', 'TR_04', 'TR_05', 'TR_06', 'TR_08'],
    updatedAt: '2026-11-17',
  },
  {
    id: 'TX_08',
    code: '08',
    name: 'Bến xe Quận 8 - Đại học Quốc Gia',
    startPoint: 'Bến xe Quận 8',
    endPoint: 'Đại học Quốc Gia',
    operatingHours: '04:40 - 20:30',
    ticketPrice: 7000,
    frequency: '6 - 10 phút/chuyến',
    status: 'active',
    stopIds: ['TR_03', 'TR_09', 'TR_04', 'TR_05', 'TR_08'],
    updatedAt: '2026-11-16',
  },
  {
    id: 'TX_150',
    code: '150',
    name: 'Bến xe Chợ Lớn - Ngã ba Tân Vạn',
    startPoint: 'Bến xe Chợ Lớn',
    endPoint: 'Ngã ba Tân Vạn',
    operatingHours: '04:30 - 21:00',
    ticketPrice: 7000,
    frequency: '8 - 15 phút/chuyến',
    status: 'inactive',
    stopIds: ['TR_03', 'TR_10', 'TR_04', 'TR_05', 'TR_07'],
    updatedAt: '2026-11-10',
  },
];

const INITIAL_USERS = [
  {
    id: 'USR_01',
    username: 'admin',
    fullName: 'Quản trị hệ thống',
    email: 'admin@busroute.hcm.vn',
    role: 'admin',
    status: 'active',
    createdAt: '2026-10-01',
  },
  {
    id: 'USR_02',
    username: 'dieuhanh01',
    fullName: 'Nguyễn Minh Tuấn',
    email: 'tuan.nm@busroute.hcm.vn',
    role: 'staff',
    status: 'active',
    createdAt: '2026-10-15',
  },
  {
    id: 'USR_03',
    username: 'kiemduyet02',
    fullName: 'Trần Thị Mai Anh',
    email: 'anh.ttm@busroute.hcm.vn',
    role: 'staff',
    status: 'locked',
    createdAt: '2026-11-02',
  },
];

function loadOrInit(key, initialValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore storage parse error
  }
  localStorage.setItem(key, JSON.stringify(initialValue));
  return JSON.parse(JSON.stringify(initialValue));
}

export const mockStore = {
  getStops: () => loadOrInit(STORAGE_KEYS.STOPS, INITIAL_STOPS),
  saveStops: (stops) =>
    localStorage.setItem(STORAGE_KEYS.STOPS, JSON.stringify(stops)),

  getRoutes: () => loadOrInit(STORAGE_KEYS.ROUTES, INITIAL_ROUTES),
  saveRoutes: (routes) =>
    localStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(routes)),

  getUsers: () => loadOrInit(STORAGE_KEYS.USERS, INITIAL_USERS),
  saveUsers: (users) =>
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)),

  resetAll: () => {
    localStorage.setItem(STORAGE_KEYS.STOPS, JSON.stringify(INITIAL_STOPS));
    localStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(INITIAL_ROUTES));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  },
};

export const delay = (ms = 120) =>
  new Promise((resolve) => setTimeout(resolve, ms));

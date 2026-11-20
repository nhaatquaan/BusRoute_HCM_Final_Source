# BusRoute HCM — Frontend Quản trị (Module 03)

Dự án ReactJS (Vite + Tailwind CSS) thực hiện trọn bộ **Module 03: Frontend Quản trị** theo kế hoạch đồ án Quản lý lộ trình xe buýt tại TP.HCM.

## 1. Cài đặt và chạy dự án

Yêu cầu đã cài Node.js (>= 18).

```bash
npm install
npm run dev
```

Mở trình duyệt tại địa chỉ hiển thị (mặc định `http://localhost:5173`).

- **Tài khoản đăng nhập mẫu:** `admin` / `123456`

## 2. Cấu trúc thư mục

```text
src/
├── components/           # Button, Badge, Modal, ConfirmDialog, ProtectedRoute
├── layouts/              # AdminLayout (Sidebar + Header)
├── modules/
│   ├── admin/            # Toàn bộ màn hình của Thành viên 3
│   │   ├── auth/         # Đăng nhập
│   │   ├── dashboard/    # Tổng quan & thống kê
│   │   ├── routes/       # CRUD tuyến xe + Chi tiết tuyến & sắp xếp thứ tự trạm
│   │   ├── stops/        # CRUD trạm dừng
│   │   └── users/        # CRUD & khóa/mở khóa tài khoản
│   └── route-planner/    # Thư mục giữ chỗ cho Thành viên 4
├── services/             # Cấu hình API, Axios client & Mock Data (localStorage)
└── App.jsx               # Cấu hình Router
```

## 3. Chuyển từ Mock Data sang Backend thật (Ngày 5)

Mở file `src/services/config.js`:
1. Đổi `USE_MOCK = false`.
2. Cập nhật `API_BASE_URL` sang địa chỉ server Express của Thành viên 2 (mặc định `http://localhost:5000`).

Các endpoint đã đấu nối sẵn theo đúng quy ước:
- `POST /api/auth/login`
- `GET/POST/PUT/DELETE /api/routes`
- `GET /api/routes/:id`
- `PUT /api/routes/:id/stops`
- `GET/POST/PUT/DELETE /api/stops`
- `GET/POST/PUT/DELETE /api/users`

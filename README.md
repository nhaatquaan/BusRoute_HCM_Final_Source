# BUSROUTE HCM – HỆ THỐNG QUẢN LÝ VÀ TRA CỨU LỘ TRÌNH XE BUÝT TP.HCM
## ĐỒ ÁN MÔN HỌC: DỮ LIỆU NOSQL (MONGODB DATABASE SYSTEM)

**BUSROUTE HCM** là giải pháp phần mềm toàn diện phục vụ quản lý mạng lưới giao thông công cộng, phân tích đồ thị tuyến - trạm, tìm kiếm lộ trình tối ưu và hỗ trợ hành khách bằng Trợ lý AI cục bộ (Ollama). Hệ thống lấy **MongoDB** làm trung tâm dữ liệu duy nhất, tận dụng triệt để sức mạnh của các truy vấn Aggregation Pipeline nâng cao và Graph Traversal đệ quy (`$graphLookup`).

---

## I. CẤU TRÚC KIẾN TRÚC HỆ THỐNG

```text
Người dùng / Quản trị viên
          │
          ▼
┌────────────────────────────────────────────────────────┐
│               ReactJS 18 + Tailwind CSS                │
│  - Modern Transit Design System (Navy #172B4D)         │
│  - Bản đồ tương tác Leaflet + OpenStreetMap            │
│  - Trực quan hóa Đồ thị Cytoscape.js (BusRouteGraph)   │
│  - Biểu đồ phân tích mạng lưới Recharts                │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP RESTful API (Cổng 3000)
                           ▼
┌────────────────────────────────────────────────────────┐
│            Express.js Backend API Engine               │
│  - Bảo mật JWT Authentication & Phân quyền RBAC        │
│  - Chống leo thang quyền hạn (Privilege Escalation)    │
│  - Rate Limiting chống Brute-force                     │
│  - Bộ kiểm thử tự động (13/13 tests pass)              │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  MongoDB Community Server    │ │  Trợ lý AI Ollama (Local)    │
│  - Database: BusRouteDB      │ │  - Model: qwen3.5:4b         │
│  - 6 Collections Chuẩn:      │ │  - Cổng: 11434               │
│    • TuyenXe (6 tuyến)       │ │  - Trích xuất Intent & Entity│
│    • TramDung (25 trạm)      │ │  - Diễn giải kết quả MongoDB │
│    • NguoiDung (3 tài khoản) │ │  - Tuyệt đối không bịa tuyến │
│    • CO_TRAM (92 cạnh)       │ │  - Tự động Fallback an toàn  │
│    • KE_TIEP (80 cạnh)       │ └──────────────────────────────┘
│    • BusRouteGraph           │
└──────────────────────────────┘
```

---

## II. DANH SÁCH TÀI KHOẢN ĐĂNG NHẬP MẪU

Tất cả tài khoản mẫu đều đã được mã hóa mật khẩu bằng thuật toán **bcrypt** trong MongoDB:

| Tên đăng nhập / Email | Mật khẩu | Vai trò (Role) | Quyền hạn trong hệ thống |
| :--- | :---: | :---: | :--- |
| `admin@busroute.vn` | `123456` | **Quản trị viên (Admin)** | Toàn quyền CRUD, MongoDB Explorer, Backup, Restore, Quản lý tài khoản |
| `operator@busroute.vn` | `123456` | **Quản trị viên (Admin)** | Điều hành mạng lưới, cập nhật lộ trình trạm, xem báo cáo |
| `user@busroute.vn` | `123456` | **Hành khách (Staff/User)** | Tra cứu lộ trình, bản đồ mạng lưới, trạm gần tôi, trợ lý AI |

---

## III. HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI CHẠY (QUICK START)

### 1. Khởi động MongoDB Community Server
Đảm bảo dịch vụ MongoDB đang lắng nghe tại `mongodb://127.0.0.1:27017`.
- Nạp dữ liệu mẫu vào Database `BusRouteDB`:
  ```bash
  node Nosql_tv1_Database/scripts/setup_and_import.js
  ```

### 2. Khởi động Backend API (Cổng 3000)
```bash
cd Nosql_tv2/BusRouteBackend
npm install
npm test          # Chạy kiểm thử tự động (13 bài test bảo mật, logic đồ thị & NoSQL)
npm start         # Khởi động server tại http://localhost:3000
```

### 3. Khởi động Giao diện Frontend (Cổng 5173)
Mở một cửa sổ dòng lệnh mới:
```bash
cd Nosql_tv3_tv4_Frontend
npm install
npm run dev       # Mở ứng dụng tại http://localhost:5173
```

### 4. Khởi động Trợ lý AI Ollama (Tùy chọn)
Nếu muốn sử dụng chức năng chat với AI bằng ngôn ngữ tự nhiên:
```bash
ollama run qwen3.5:4b
```
*(Nếu không chạy Ollama, hệ thống tự động kích hoạt chế độ Fallback và hiển thị thông báo thân thiện; toàn bộ các tính năng tìm đường, bản đồ và đồ thị vẫn hoạt động bình thường 100%)*

---

## IV. CÁC TÍNH NĂNG NỔI BẬT ĐÁP ỨNG YÊU CẦU MÔN HỌC NOSQL

### 1. MongoDB Explorer & Playground
- **Collection Explorer:** Xem chi tiết 6 Collections, thống kê Document, kích thước và Indexes.
- **Document Explorer:** Phân trang, tìm kiếm, xem JSON chi tiết, thêm, sửa, xóa Document có xác thực.
- **Playground (Thực thi an toàn):** Trình diễn 8 mẫu truy vấn Aggregation Pipelines chuyên sâu:
  - **A.** Tuyến xe đang hoạt động (`find`).
  - **B.** Danh sách trạm thuộc Tuyến 01 theo thứ tự (`$lookup`, `$unwind`, `$sort`).
  - **C.** Tuyến có nhiều trạm nhất (`$group`, `$lookup`, `$sort`).
  - **D.** Các trạm trung chuyển (Hubs) phục vụ nhiều tuyến nhất.
  - **E.** Các liên kết trực tiếp từ một trạm cụ thể.
  - **F.** Duyệt đồ thị mạng lưới đa tầng bằng `$graphLookup`.
  - **G.** Phân tích đa chiều điểm chuyển tuyến bằng `$facet`.
  - **H.** Thống kê độ phủ mạng lưới trạm theo Quận / Khu vực.

### 2. Import, Export, Backup & Restore
- Hỗ trợ xuất/nhập định dạng **JSON** và **CSV**.
- Cơ chế Import an toàn: *Insert only*, *Upsert (cập nhật nếu trùng)*, *Skip duplicates*.
- Quản lý bản sao lưu (Full Database Backup) và Khôi phục (Restore) có cảnh báo an toàn.

### 3. Kiểm tra Tính toàn vẹn Cơ sở dữ liệu (Database Integrity)
- Tự động phát hiện cạnh mồ côi (`CO_TRAM`, `KE_TIEP` tham chiếu đỉnh không tồn tại).
- Cảnh báo tọa độ GPS nằm ngoài phạm vi TP.HCM.
- Rà soát các tuyến chưa có trạm và trạm chưa được gán vào tuyến.

### 4. Tìm kiếm Lộ trình Tối ưu (Route Planner)
- Nguồn dữ liệu thuần MongoDB (không phụ thuộc Google Maps API).
- Hỗ trợ đi thẳng và chuyển tuyến, hiển thị chi tiết timeline từng chặng xe, cự ly và giá vé.
- Trực quan hóa lộ trình trên bản đồ OpenStreetMap (Leaflet).

### 5. Trực quan hóa Đồ thị Cytoscape.js
- Mô hình đồ thị BusRouteGraph phân biệt rõ ràng: Đỉnh Tuyến (Navy), Đỉnh Trạm (Emerald), Cạnh CO_TRAM (Blue) và Cạnh KE_TIEP (Green/Slate).
- Cho phép thu phóng, kéo thả node, lọc theo tuyến xe, tra cứu metadata đỉnh và cạnh.

### 6. Trợ lý AI Hỏi đáp Tự nhiên
- Sử dụng mô hình cục bộ **Ollama qwen3.5:4b** hoàn toàn miễn phí.
- Kiến trúc RAG có kiểm soát: AI chỉ diễn giải kết quả từ API MongoDB, không tự sáng tạo tuyến xe hay giá vé sai thực tế.

---

## V. CẤU TRÚC THƯ MỤC SOURCE CODE

```text
Nosql_tong/
├── Nosql_tv1_Database/          # Dữ liệu & Script quản trị Database
│   ├── data/                    # Dữ liệu JSON & CSV chuẩn (6 tuyến, 25 trạm, 92 CO_TRAM, 80 KE_TIEP)
│   ├── queries/                 # Bộ truy vấn mongosh & kiểm thử
│   ├── scripts/                 # Script Setup, Import, Export, Backup, Restore
│   └── backup/                  # Thư mục lưu trữ bản backup JSON
├── Nosql_tv2/BusRouteBackend/   # Máy chủ Express.js RESTful API
│   ├── src/
│   │   ├── config/              # Kết nối MongoDB Driver
│   │   ├── controllers/         # Xử lý nghiệp vụ API
│   │   ├── middleware/          # JWT Protect, AdminOnly, RateLimit
│   │   ├── modules/route-planner# Engine duyệt đồ thị $graphLookup
│   │   ├── routes/              # Định tuyến API
│   │   └── services/            # Tầng truy xuất dữ liệu MongoDB
│   ├── tests/                   # Bộ kiểm thử tự động (Unit & Integration tests)
│   └── server.js                # Điểm khởi động Backend API
└── Nosql_tv3_tv4_Frontend/      # Giao diện ReactJS (Vite + Tailwind CSS)
    ├── src/
    │   ├── components/          # Shared components (Button, Badge, Modal, ConfirmDialog)
    │   ├── layouts/             # Application Shell (AdminLayout, Sidebar, Topbar)
    │   ├── modules/
    │   │   ├── admin/           # Dashboard, Analytics, Tuyến xe, Trạm dừng, Users, Database
    │   │   └── route-planner/   # Tìm đường, Leaflet RouteMap, Cytoscape Graph
    │   └── services/            # Axios API Client kết nối Backend
    └── index.html
```

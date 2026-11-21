# BUSROUTE HCM V2.0 — HỆ THỐNG QUẢN LÝ VÀ TRA CỨU LỘ TRÌNH XE BUÝT TP.HCM

> **Đồ án Chuyên đề: Cơ sở Dữ liệu NoSQL (NoSQL Database Project)**  
> **Nền tảng công nghệ:** MongoDB Community Server (Local) & MongoDB Atlas (Cloud) + Node.js/Express + ReactJS/Vite + Leaflet OpenStreetMap + Cytoscape.js.

---

## 1. GIỚI THIỆU DỰ ÁN & MỤC TIÊU ỨNG DỤNG

**BusRoute HCM** là ứng dụng web toàn diện hỗ trợ người dân và du khách tại TP.HCM tra cứu lộ trình xe buýt thông minh, trực quan hóa mạng lưới giao thông công cộng trên nền bản đồ và đồ thị, đồng thời cung cấp cổng điều hành lộ trình hai chiều và không gian quản trị cơ sở dữ liệu NoSQL chuyên sâu.

### Mục tiêu cốt lõi:
1. **Tra cứu lộ trình tối ưu đa tiêu chí:** Ứng dụng thuật toán đồ thị duyệt mạng lưới giao thông công cộng để tìm kiếm lộ trình theo các tiêu chí: *Ít chuyển tuyến nhất*, *Thời gian nhanh nhất*, và *Ít trạm dừng nhất*.
2. **Cổng Hành khách & Cá nhân hóa:** Lưu trữ lịch sử tìm kiếm, danh bạ địa điểm quen thuộc (Nhà, Cơ quan, Trường học), tuyến xe yêu thích và tự động gợi ý hành trình dựa trên dữ liệu thống kê tra cứu thực tế.
3. **Quản trị Lộ trình 2 Chiều chuyên nghiệp:** Tách biệt và quản lý độc lập lộ trình **Lượt đi** (`luot_di`) và **Lượt về** (`luot_ve`), hỗ trợ tương tác bản đồ Leaflet để chọn tọa độ GPS và hiệu chỉnh khoảng cách/thời gian di chuyển.
4. **Không gian Quản trị NoSQL & Cloud Readiness:** Tích hợp MongoDB Explorer, Query Playground (truy vấn NoSQL an toàn), Database Integrity Audit, và cơ chế Sao lưu / Khôi phục dữ liệu trực tiếp trên trình duyệt qua tệp JSON (tương thích môi trường serverless).

---

## 2. KIẾN TRÚC MÔ HÌNH HÓA ĐỒ THỊ TRÊN MONGODB (GRAPH ON DOCUMENT DATABASE)

> [!NOTE]
> **Lưu ý kiến trúc NoSQL:** MongoDB là một **Document Database**, không phải là Native Graph Database (như Neo4j). Tuy nhiên, với tính năng mảng linh hoạt, toán tử `$lookup` và đặc biệt là `$graphLookup`, MongoDB hoàn toàn có khả năng mô hình hóa và duyệt cấu trúc Đồ thị (Graph Data Model) với hiệu năng truy vấn cao.

Hệ thống tổ chức dữ liệu thành các **Vertex Collections (Đỉnh)** và **Edge Collections (Cạnh)**:

### 2.1. Đỉnh (Vertex Collections):
- `TuyenXe` (6 tuyến mẫu): Chứa metadata về tuyến (mã tuyến, tên tuyến, giá vé, giờ hoạt động, cự ly, màu sắc nhận diện).
- `TramDung` (25 trạm dừng trọng điểm): Tên trạm, địa chỉ, quận/huyện, tọa độ địa lý GPS (`latitude`, `longitude`).
- `NguoiDung` (3 tài khoản chuẩn hóa theo vai trò): Thông tin xác thực và phân quyền RBAC.
- Các bộ sưu tập cá nhân hóa Hành khách:
  - `LichSuTimKiem`: Lịch sử tra cứu lộ trình cá nhân hóa và đồng bộ từ thiết bị.
  - `DiaDiemYeuThich`: Danh bạ địa điểm thân quen (Nhà, Cơ quan, Trường học) kèm trạm dừng gần nhất.
  - `TuyenYeuThich`: Danh sách các tuyến xe buýt được đánh dấu theo dõi thường xuyên.

### 2.2. Cạnh (Edge Collections):
- `CO_TRAM` (92 quan hệ): Cạnh nối giữa Tuyến xe và Trạm dừng đón/trả (`_from: "TuyenXe/TX_..."`, `_to: "TramDung/TR_..."`), kèm theo thuộc tính số thứ tự trạm (`thu_tu`) và chiều di chuyển (`ma_chieu`: `luot_di` hoặc `luot_ve`).
- `KE_TIEP` (80 cung có hướng): Cạnh có hướng nối trực tiếp giữa 2 trạm dừng liên tiếp của cùng một tuyến (`_from: "TramDung/TR_A"`, `_to: "TramDung/TR_B"`), kèm mã tuyến, chiều di chuyển, khoảng cách (`khoang_cach_km`) và thời gian di chuyển (`thoi_gian_di_chuyen_phut`).

### 2.3. Cấu hình Đồ thị (Graph Metadata):
- `BusRouteGraph`: Định nghĩa cấu trúc đồ thị mạng lưới xe buýt và các tham số duyệt đệ quy phục vụ `$graphLookup`.

---

## 3. PHÂN QUYỀN HỆ THỐNG (RBAC) & 4 KHÔNG GIAN TÁCH BIỆT

Hệ thống chuẩn hóa triệt để **3 vai trò người dùng** và **4 không gian hoạt động**:

| Không gian | Vai trò (`role`) | Tài khoản mẫu | Phạm vi chức năng & Quyền hạn |
| :--- | :--- | :--- | :--- |
| **Khách vãng lai** | `guest` | *(Không cần đăng nhập)* | Tra cứu lộ trình đa tiêu chí, tra cứu tuyến đi qua một trạm, xem bản đồ Leaflet và đồ thị Cytoscape.js. Lịch sử tìm kiếm lưu tạm trên LocalStorage trình duyệt (tối đa 5 lượt). |
| **Cổng Hành khách** | `passenger` | `user@busroute.vn` | **Cá nhân hóa:** Đồng bộ lịch sử từ Guest lên MongoDB, quản lý danh bạ địa điểm đã lưu (tự động phát hiện trạm dừng gần nhất), lưu tuyến xe yêu thích, nhận gợi ý lộ trình thông minh, quản lý tùy chọn di chuyển, cập nhật thông tin cá nhân và đổi mật khẩu. |
| **Cổng Điều hành** | `operator` | `operator@busroute.vn` | **Nghiệp vụ Vận hành:** Quản lý danh mục tuyến xe và trạm dừng (Leaflet marker picker); gán trạm dừng và sắp xếp thứ tự di chuyển độc lập theo 2 chiều (Lượt đi / Lượt về); hiệu chỉnh cự ly và thời gian di chuyển giữa các trạm. Bị chặn hoàn toàn khỏi khu vực quản trị tài khoản và database. |
| **Cổng Quản trị** | `admin` | `admin@busroute.vn` | **Toàn quyền Quản trị Tối cao:** Quản lý tài khoản (phân quyền, khóa/mở khóa tài khoản), MongoDB Explorer (CRUD Document, quản lý Indexes), MongoDB Playground (chạy truy vấn NoSQL an toàn), Database Integrity Audit (kiểm tra cạnh mồ côi), Sao lưu & Khôi phục dữ liệu trực tiếp trên trình duyệt qua file JSON. |

> [!CAUTION]
> **Lưu ý bảo mật về tài khoản:** 100% mật khẩu trong MongoDB đều được mã hóa bằng hàm băm `bcrypt`. Mật khẩu được thiết lập qua script khởi tạo `init_database.mongosh.js` hoặc đăng ký mới qua Cổng Hành khách. Trong môi trường Production, Quản trị viên bắt buộc phải cấu hình mật khẩu độ phức tạp cao và định danh qua biến môi trường an toàn, tuyệt đối không công khai mật khẩu trong tài liệu hoặc kho mã nguồn.

---

## 4. HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI CHẠY DỰ ÁN

### 4.1. Yêu cầu môi trường
- **Node.js:** Phiên bản 18 trở lên (khuyên dùng Node.js 20 hoặc 22/24).
- **npm:** Phiên bản 9 trở lên.
- **MongoDB Community Server:** Phiên bản 6.0, 7.0, 8.0 hoặc 9.0 (mặc định cổng 27017).

### 4.2. Khởi động dịch vụ MongoDB
Đảm bảo MongoDB Server đang chạy cục bộ:
```powershell
# Trên Windows:
net start MongoDB
# Hoặc kiểm tra cổng 27017:
Test-NetConnection -ComputerName 127.0.0.1 -Port 27017
```

### 4.3. Cài đặt Dependencies
Từ thư mục gốc dự án:
```powershell
# 1. Cài đặt Backend dependencies
cd Nosql_tv2/BusRouteBackend
npm install

# 2. Cài đặt Frontend dependencies
cd ../../Nosql_tv3_tv4_Frontend
npm install
```

### 4.4. Cấu hình Biến môi trường (.env)
Tạo file `.env` từ file mẫu `.env.example`:

**Backend (`Nosql_tv2/BusRouteBackend/.env`):**
```ini
MONGODB_URI=mongodb://127.0.0.1:27017
DB_NAME=BusRouteDB
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here_generate_with_crypto_random_bytes_64
AI_PROVIDER=disabled
```
> [!TIP]
> Tạo khóa `JWT_SECRET` an toàn bằng lệnh:  
> `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

**Frontend (`Nosql_tv3_tv4_Frontend/.env`):**
```ini
VITE_API_URL=http://localhost:3000
```

### 4.5. Khởi chạy Ứng dụng
Mở 2 cửa sổ dòng lệnh (Terminal):

**Terminal 1 (Backend API Server):**
```powershell
cd Nosql_tv2/BusRouteBackend
npm start
# Máy chủ Backend khởi chạy tại: http://localhost:3000
```

**Terminal 2 (Frontend Client):**
```powershell
cd Nosql_tv3_tv4_Frontend
npm run dev
# Giao diện web khởi chạy tại: http://localhost:5173
```

---

## 5. HƯỚNG DẪN CHẠY BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITE)

Dự án tích hợp đầy đủ bộ test tự động xác minh chức năng, bảo mật và phân quyền:

```powershell
cd Nosql_tv2/BusRouteBackend

# 1. Chạy toàn bộ Unit Tests (Node.js Test Runner tích hợp sẵn):
npm test

# 2. Chạy Live Integration & RBAC Test Suite:
node tests/live_verification/test_rbac_and_roles_phase1.js

# 3. Kiểm tra bản build Frontend:
cd ../../Nosql_tv3_tv4_Frontend
npm run build
```

---

## 6. HƯỚNG DẪN CẤU HÌNH TRỢ LÝ AI (MULTI-PROVIDER AI)

Hệ thống hỗ trợ 3 chế độ hoạt động cho Trợ lý AI (`AI_PROVIDER`):

1. **Chế độ Ngoại tuyến Heuristic (`AI_PROVIDER=disabled` - Mặc định):**
   - Trợ lý AI sử dụng bộ phân tích ý định và trích xuất dữ liệu trực tiếp từ MongoDB.
   - **Route Planner hoạt động 100% độc lập**, không bao giờ bị gián đoạn hay phụ thuộc vào mô hình AI bên ngoài.

2. **Chế độ Ollama Local (`AI_PROVIDER=ollama`):**
   - Yêu cầu cài đặt [Ollama](https://ollama.ai) và chạy mô hình `qwen3.5:4b`:
     ```powershell
     ollama run qwen3.5:4b
     ```
   - Cấu hình trong `.env`:
     ```ini
     AI_PROVIDER=ollama
     OLLAMA_BASE_URL=http://127.0.0.1:11434
     OLLAMA_MODEL=qwen3.5:4b
     ```

3. **Chế độ Google Gemini Cloud (`AI_PROVIDER=gemini`):**
   - Lấy API Key miễn phí từ [Google AI Studio](https://aistudio.google.com).
   - Cấu hình trong `.env`:
     ```ini
     AI_PROVIDER=gemini
     GEMINI_API_KEY=your_actual_gemini_api_key
     ```
   - *Nếu chưa có API Key, hệ thống tự động fallback sang chế độ Heuristic ngoại tuyến mà không gây lỗi.*

---

## 7. SAO LƯU & KHÔI PHỤC DỮ LIỆU CLOUD (TRÊN TRÌNH DUYỆT)

Nhằm đáp ứng môi trường Serverless (Vercel) không có ổ cứng lưu trữ cục bộ, hệ thống cung cấp tính năng Sao lưu / Khôi phục trực tiếp qua giao diện:
1. Đăng nhập tài khoản Admin (`admin@busroute.vn`).
2. Truy cập **"Quản trị CSDL"** ➔ **"Backup & Restore"**.
3. **Tải file JSON về máy:** Nhấn nút *"Tải file JSON về máy (Backup)"*. Trình duyệt sẽ xuất file `BusRouteDB_FullBackup_YYYY-MM-DD.json` lưu trữ toàn bộ dữ liệu 6 collections.
4. **Khôi phục từ file JSON:** Nhấn *"Tải file JSON lên (Restore)"*, chọn file JSON sao lưu. Hệ thống tự động xác thực schema, hiển thị số lượng document từng collection để bạn duyệt trước khi xác nhận ghi đè vào MongoDB.

---

## 8. HƯỚNG DẪN CHUẨN BỊ TRIỂN KHAI LÊN VERCEL VÀ MONGODB ATLAS

### Bước 1: Di chuyển dữ liệu lên MongoDB Atlas
1. Tạo một Cluster M0 miễn phí trên [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Lấy chuỗi kết nối URI dạng:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/BusRouteDB?retryWrites=true&w=majority`
3. Chạy thử nghiệm mô phỏng (Dry-run) an toàn:
   ```powershell
   node Nosql_tv1_Database/scripts/migrate_to_atlas.js "mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/BusRouteDB" --dry-run
   ```
4. Thực thi di chuyển chính thức:
   ```powershell
   node Nosql_tv1_Database/scripts/migrate_to_atlas.js "mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/BusRouteDB" --force
   ```

### Bước 2: Triển khai Backend lên Vercel Serverless Function
Backend đã có sẵn tệp cấu hình `Nosql_tv2/BusRouteBackend/vercel.json` và adapter tái sử dụng kết nối `Nosql_tv2/BusRouteBackend/api/index.js`:
```powershell
cd Nosql_tv2/BusRouteBackend
vercel login
vercel --prod
```
*Cấu hình các biến môi trường trên Vercel Project Settings:*
- `MONGODB_URI`: Connection string Atlas ở Bước 1.
- `DB_NAME`: `BusRouteDB`
- `NODE_ENV`: `production`
- `JWT_SECRET`: Chuỗi ngẫu nhiên tạo bằng crypto (tối thiểu 32 ký tự).
- `AI_PROVIDER`: `disabled` hoặc `gemini`.

### Bước 3: Triển khai Frontend lên Vercel
Frontend đã có sẵn `Nosql_tv3_tv4_Frontend/vercel.json` với rewrite rule cho React Router:
```powershell
cd Nosql_tv3_tv4_Frontend
vercel login
vercel env add VITE_API_URL production
# Nhập địa chỉ backend Vercel: https://your-backend.vercel.app
vercel --prod
```

---

## 9. LƯU Ý BẢO MẬT & NGUYÊN TẮC AN TOÀN

1. **Không commit file `.env`:** Toàn bộ thông tin mật khẩu, secret key, connection string thật chỉ được cấu hình trong file `.env` cục bộ hoặc trên Environment Variables của Vercel.
2. **Khởi động an toàn trong Production:** Nếu chạy với `NODE_ENV=production`, Backend sẽ kiểm tra biến `JWT_SECRET` và từ chối khởi động nếu thiếu hoặc sử dụng chuỗi mặc định không an toàn.
3. **Mã hóa mật khẩu:** 100% mật khẩu người dùng trong MongoDB được mã hóa bằng hàm băm một chiều `bcrypt` với muối (salt).
4. **Không để lộ Hash mật khẩu:** Mọi API trả về thông tin tài khoản đều tự động loại bỏ các trường nhạy cảm (`mat_khau`, `password`).

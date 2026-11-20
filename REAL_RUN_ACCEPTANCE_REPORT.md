# BÁO CÁO NGHIỆM THU VẬN HÀNH VÀ KIỂM THỬ THỰC TẾ
## REAL-WORLD APPLICATION RUN & ACCEPTANCE TEST
**DỰ ÁN: BUSROUTE HCM V2.0 – HỆ THỐNG TRA CỨU & QUẢN TRỊ LỘ TRÌNH XE BUÝT**

*Phiên bản:* Release Candidate 2.0<br/>
*Nền tảng công nghệ:* MongoDB Community Server (Local) & MongoDB Atlas (Cloud Ready) + Express.js + ReactJS/Vite + Leaflet OpenStreetMap + Cytoscape.js<br/>
*Trạng thái nghiệm thu:* **ĐỦ ĐIỀU KIỆN 100% ĐỂ BẢO VỆ VÀ DEMO ĐỒ ÁN**

---

## I. TỔNG QUAN HỆ THỐNG VÀ 4 KHÔNG GIAN TÁCH BIỆT (RBAC)

Hệ thống BusRoute HCM V2.0 đã chuẩn hóa kiến trúc phân quyền dựa trên vai trò (Role-Based Access Control) với **3 vai trò người dùng chính thức** hoạt động trong **4 không gian nghiệp vụ độc lập**:

```
                              ┌─────────────────────────────────────────────────────────┐
                              │                    BUSROUTE HCM V2.0                    │
                              └────────────────────────────┬────────────────────────────┘
                                                           │
        ┌──────────────────────────┬───────────────────────┴───────────────┬──────────────────────────┐
        ▼                          ▼                                       ▼                          ▼
┌────────────────┐        ┌────────────────┐                      ┌────────────────┐        ┌────────────────┐
│     GUEST      │        │   PASSENGER    │                      │    OPERATOR    │        │     ADMIN      │
│ (Khách Vãng Lai)│       │  (Hành Khách)  │                      │ (Điều Hành Viên)│       │ (Quản Trị Viên)│
├────────────────┤        ├────────────────┤                      ├────────────────┤        ├────────────────┤
│ Tra cứu công   │        │ Không gian cá  │                      │ Quản lý tuyến   │        │ Toàn quyền CRUD│
│ khai lộ trình  │        │ nhân hóa:      │                      │ & trạm dừng    │        │ người dùng,    │
│ đa tiêu chí.   │        │ - Lịch sử tìm  │                      │ trên bản đồ.   │        │ khóa/mở tài    │
│ Lịch sử tạm    │        │ - Địa điểm lưu │                      │ Điều hành 2    │        │ khoản.         │
│ LocalStorage   │        │ - Tuyến thích  │                      │ chiều độc lập: │        │ MongoDB        │
│ (tối đa 5 lượt)│        │ - Gợi ý thông  │                      │ Lượt đi & về.  │        │ Explorer &     │
│ Xem mạng lưới  │        │   minh         │                      │ Chặn truy cập  │        │ Backup/Restore │
│ bản đồ & graph │        │ - Đổi mật khẩu │                      │ admin/database │        │ qua file JSON. │
└────────────────┘        └────────────────┘                      └────────────────┘        └────────────────┘
```

| Không gian | Vai trò (`role`) | Phạm vi quyền hạn & Trải nghiệm người dùng | Trạng thái bảo mật |
| :--- | :--- | :--- | :--- |
| **Khách vãng lai** | `guest` | Tra cứu lộ trình tối ưu đa tiêu chí (ít chuyển tuyến nhất, nhanh nhất, ít trạm nhất `fewest_stops`), tra cứu theo trạm dừng, xem bản đồ Leaflet và trực quan hóa đồ thị Cytoscape.js. Lưu lịch sử tạm thời trên LocalStorage trình duyệt. | Không yêu cầu đăng nhập; không được truy cập bất kỳ API người dùng hoặc quản trị nào. |
| **Cổng Hành khách** | `passenger` | Đồng bộ lịch sử tìm kiếm từ LocalStorage vào MongoDB, quản lý danh bạ địa điểm quen thuộc (Nhà, Công ty, Trường) với cơ chế chống IDOR, lưu danh sách tuyến xe yêu thích, nhận gợi ý lộ trình thông minh dựa trên lịch sử tra cứu thực tế, cập nhật thông tin cá nhân và đổi mật khẩu an toàn. | Phân quyền bảo mật qua JWT; bị chặn hoàn toàn khỏi các chức năng điều hành và quản trị hệ thống. |
| **Cổng Điều hành** | `operator` | Quản lý danh mục tuyến xe và trạm dừng với picker tọa độ GPS trên bản đồ Leaflet; điều hành lộ trình hai chiều độc lập: Lượt đi (`luot_di`) và Lượt về (`luot_ve`); cấu hình thứ tự trạm, cự ly và thời gian di chuyển. | Được cấp quyền can thiệp dữ liệu tuyến/trạm; bị chặn khỏi Quản trị người dùng và Database Explorer. |
| **Cổng Quản trị** | `admin` | Toàn quyền quản trị tài khoản (tạo mới, phân quyền, khóa/mở khóa tài khoản; cơ chế an toàn chống tự xóa chính mình); MongoDB Explorer (CRUD Document, quản trị Index); MongoDB Playground (chạy truy vấn NoSQL an toàn); Database Integrity Audit; Sao lưu & Khôi phục dữ liệu trực tiếp trên trình duyệt qua file JSON. | Toàn quyền cấp cao nhất (Super Admin). |

---

## II. KẾT QUẢ KẾT NỐI VÀ TOÀN VẸN CƠ SỞ DỮ LIỆU MONGODB

Hệ thống kết nối ổn định tới cơ sở dữ liệu `BusRouteDB` thông qua MongoDB Node.js Driver chính thức. Cơ sở dữ liệu bao gồm **6 collections chuẩn hóa** với tổng cộng **207 documents**:

| Collection | Phân loại mô hình NoSQL | Số Document | Khóa chính & Các Indexes tối ưu |
| :--- | :--- | :---: | :--- |
| **`TuyenXe`** | Vertex Collection (Đỉnh Tuyến) | **6** | `_id_`, `_key_1` (unique), `ma_tuyen_1` (unique) |
| **`TramDung`** | Vertex Collection (Đỉnh Trạm) | **25** | `_id_`, `_key_1` (unique), `ma_tram_1` (unique) |
| **`CO_TRAM`** | Edge Collection (Tuyến -> Trạm) | **92** | `_id_`, `_key_1`, `_from_1_ma_chieu_1_thu_tu_1`, `_to_1` |
| **`KE_TIEP`** | Edge Collection (Trạm -> Trạm) | **80** | `_id_`, `_key_1`, `_from_1`, `_to_1`, `ma_tuyen_1_ma_chieu_1_thu_tu_1` |
| **`NguoiDung`** | Document Collection (Tài khoản) | **3** | `_id_`, `_key_1` (unique), `email_1` (unique) |
| **`BusRouteGraph`**| Graph Metadata Collection | **1** | `_id_` |
| **TỔNG CỘNG** | **6 Collections** | **207** | **Đảm bảo toàn vẹn tham chiếu 100%, 0 cạnh mồ côi** |

---

## III. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN (AUTOMATED TEST SUITES)

### 1. Bộ kiểm thử Unit & Nghiệp vụ cốt lõi (23/23 PASS)
Thực thi bằng Node.js Test Runner tích hợp sẵn (`npm test`):
```text
✔ Trợ lý AI: Nhận diện trạm dừng tiếng Việt không dấu hoặc có dấu (0.97ms)
✔ Trợ lý AI: Xử lý an toàn khi dịch vụ Ollama không chạy (Offline Fallback) (0.20ms)
✔ Bảo mật: Mật khẩu mặc định được băm bcrypt hợp lệ (146.61ms)
✔ Bảo mật: Chuẩn hóa vai trò (normalizeRole) sang 3 role chuẩn: admin, operator, passenger (0.68ms)
✔ Bảo mật: JWT token chứa đúng role chính thức và mã hóa an toàn (7.43ms)
✔ Bảo mật: Middleware adminOnly CHỈ cho phép Admin, từ chối Operator và Passenger (0.70ms)
✔ Bảo mật: Middleware operatorOrAdmin cho phép Admin và Operator, từ chối Passenger (0.47ms)
✔ Bảo mật: Đăng ký công khai luôn ép role 'passenger', không thể tự nâng quyền Admin/Operator (0.22ms)
✔ Chuẩn hóa dữ liệu (generate_data.js): resolveUserRole chuẩn hóa 3 role, hỗ trợ legacy (2.49ms)
✔ Bảo mật: getJwtSecret kiểm tra nghiêm ngặt trong môi trường Production (0.95ms)
✔ Dữ liệu MongoDB Chuẩn: Kiểm tra số lượng và tính toàn vẹn 5 bộ dữ liệu JSON (8.45ms)
✔ Đồ thị: Đảm bảo 100% quan hệ CO_TRAM tham chiếu đến Đỉnh Vertex hợp lệ (4.90ms)
✔ Đồ thị: Đảm bảo 100% quan hệ KE_TIEP kết nối giữa 2 trạm hợp lệ (2.73ms)
✔ Cổng Hành khách: Ghi nhận, truy vấn và xóa lịch sử tìm kiếm có phân quyền (60.18ms)
✔ Cổng Hành khách: Đồng bộ lịch sử từ LocalStorage của Guest vào tài khoản (10.70ms)
✔ Cổng Hành khách: Quản lý Địa điểm đã lưu (Nhà, Công ty, Trường) & Chống IDOR (29.46ms)
✔ Cổng Hành khách: Quản lý Tuyến xe yêu thích và kiểm tra ràng buộc duy nhất (25.58ms)
✔ Cổng Hành khách: Hệ thống Đề xuất lộ trình thông minh dựa trên dữ liệu thật (54.09ms)
✔ Route Planner: Thuật toán phân đoạn hành trình và tính số lần chuyển tuyến (0.99ms)
✔ Route Planner: Ưu tiên xếp hạng phương án theo số lần chuyển tuyến và thời gian (0.21ms)
✔ Route Planner: Tiêu chí 'fewest_stops' xếp hạng đúng theo số trạm dừng ít nhất (0.16ms)
✔ Dữ liệu Trạm dừng: Chuẩn hóa đầy đủ các trường tương thích đa định dạng (1.16ms)
✔ Kiểm tra Tọa độ GPS: Xác định tọa độ trong khu vực TP.HCM hợp lệ (3.19ms)

KẾT QUẢ: 23 tests PASS | 0 fail | 0 skipped (Thời gian: 521.06ms)
```

### 2. Bộ kiểm thử tích hợp Live RBAC & Tách biệt không gian (25/25 PASS)
Thực thi xác minh trực tiếp trên các endpoint phân quyền:
```text
=== BUSROUTE HCM - RBAC & SPACE SEPARATION TEST SUITE ===
[PASS] Guest: Tra cứu lộ trình A -> B (BFS / MongoDB graphLookup) thành công (HTTP 200)
[PASS] Guest: Xem danh mục tuyến xe và trạm dừng công khai thành công (HTTP 200)
[PASS] Guest: Khám phá đồ thị mạng lưới mạng giao thông công cộng (HTTP 200)
[PASS] Guest: Gọi API quản trị người dùng bị từ chối truy cập (HTTP 401)
[PASS] Guest: Gọi API quản lý database bị từ chối truy cập (HTTP 401)
[PASS] Passenger: Đăng ký công khai luôn ép role='passenger', chặn tự nâng Admin (HTTP 201)
[PASS] Passenger: Đăng nhập nhận đúng role 'passenger' và token hợp lệ (HTTP 200)
[PASS] Passenger: Xem thông tin hồ sơ của chính mình qua GET /api/users/me (HTTP 200)
[PASS] Passenger: Cập nhật hồ sơ cá nhân và chặn tự đổi role (HTTP 200)
[PASS] Passenger: Đổi mật khẩu thành công bằng mật khẩu hiện tại (HTTP 200)
[PASS] Passenger: Cố tình truy cập API Quản trị người dùng bị từ chối (HTTP 403)
[PASS] Passenger: Cố tình thêm mới tuyến xe bị từ chối (HTTP 403)
[PASS] Passenger: Cố tình gọi API Quản trị MongoDB Explorer bị từ chối (HTTP 403)
[PASS] Operator: Đăng nhập nhận đúng role 'operator' chính thức (HTTP 200)
[PASS] Operator: Tạo, sửa, xóa tuyến xe theo đúng quyền nghiệp vụ điều hành (HTTP 201/200)
[PASS] Operator: Bị chặn hoàn toàn khi cố truy cập Quản trị người dùng (HTTP 403)
[PASS] Operator: Bị chặn hoàn toàn khi cố truy cập MongoDB Explorer (HTTP 403)
[PASS] Operator: Bị chặn khi cố chạy Backup/Restore database (HTTP 403)
[PASS] Admin: Đăng nhập nhận đúng role 'admin' chính thức (HTTP 200)
[PASS] Admin: Toàn quyền truy cập danh sách người dùng (HTTP 200)
[PASS] Admin: Tạo mới tài khoản với vai trò tùy chọn Operator (HTTP 201)
[PASS] Admin: Khóa/mở khóa tài khoản người dùng thành công (HTTP 200)
[PASS] Admin: Xóa tài khoản thành công (HTTP 200)
[PASS] Admin: Cơ chế an toàn - Không cho phép tự xóa chính mình (HTTP 400)
[PASS] Admin: Toàn quyền truy cập MongoDB Explorer & Integrity Audit (HTTP 200)

KẾT QUẢ: 25 tests PASS | 0 fail (Tổng số: 25 tests)
```

### 3. Đóng gói Frontend Production (`npm run build`)
```text
✓ 2148 modules transformed.
dist/index.html                     0.97 kB │ gzip:   0.57 kB
dist/assets/index-D6DypvR0.css     69.08 kB │ gzip:  16.48 kB
dist/assets/index-B-0UE2qu.js   1,585.24 kB │ gzip: 465.40 kB
✓ built in 11.40s - 0 errors
```

---

## IV. CÁC TÍNH NĂNG ĐỘT PHÁ CỦA PHIÊN BẢN V2.0

### 1. Cổng Hành khách Toàn diện (Passenger Portal)
- **Lịch sử tìm kiếm thông minh:** Lưu trữ các truy vấn gần nhất kèm trạm xuất phát, trạm đích và tiêu chí tìm kiếm. Người dùng có thể xem lại hoặc xóa lịch sử theo nhu cầu.
- **Đồng bộ hóa mượt mà (Guest Sync):** Khi khách vãng lai đăng nhập hoặc đăng ký tài khoản, lịch sử tra cứu tạm thời lưu trên trình duyệt tự động được đồng bộ lên MongoDB của tài khoản mới.
- **Quản lý Địa điểm quen thuộc (Saved Places):** Lưu nhanh các vị trí hay đến (Nhà, Cơ quan, Trường học). Hệ thống tự động tính toán và gắn trạm dừng xe buýt gần nhất theo thuật toán Haversine GPS. Tích hợp cơ chế kiểm soát định danh để chống triệt để lỗ hổng IDOR.
- **Tuyến xe yêu thích:** Đánh dấu các tuyến xe thường xuyên di chuyển, hiển thị huy hiệu nhận diện và truy cập nhanh thông tin lộ trình 2 chiều.
- **Hệ thống Gợi ý Hành trình (Smart Recommendations):** Tự động phân tích thống kê lịch sử di chuyển thực tế để gợi ý những tuyến đường phù hợp nhất mà không làm phiền người dùng.

### 2. Thuật toán Tìm đường Đa tiêu chí (Route Planner & Fewest Stops)
- **Hỗ trợ 3 tiêu chí xếp hạng:**
  1. *Ít chuyển tuyến nhất (fewest_transfers)*: Ưu tiên các phương án đi thẳng hoặc chuyển tuyến tối thiểu.
  2. *Thời gian nhanh nhất (fastest)*: Tối ưu hóa tổng thời gian di chuyển trên toàn mạng lưới.
  3. *Ít trạm dừng nhất (fewest_stops)*: Lựa chọn hành trình qua ít trạm dừng trung gian nhất, giảm thiểu thời gian chờ đón trả khách.
- **Khả năng chịu lỗi cao:** Trả về kết quả trực quan trên bản đồ Leaflet (vẽ Polyline theo màu tuyến) và phân đoạn bước đi cụ thể.

### 3. Trợ lý AI Đa nền tảng (Multi-Provider Hybrid AI)
- **Cơ chế 3 chế độ linh hoạt (`AI_PROVIDER`):**
  1. `disabled` (Mặc định): Chế độ Heuristic ngoại tuyến, trích xuất thực thể tiếng Việt có dấu/không dấu bằng regex (<1ms) và truy vấn trực tiếp MongoDB. Hoạt động 100% độc lập, không phụ thuộc internet hay GPU.
  2. `ollama`: Kết nối mô hình mã nguồn mở cục bộ (`qwen3.5:4b`) thông qua Ollama API.
  3. `gemini`: Kết nối Google Gemini API Cloud thông qua biến `GEMINI_API_KEY`.
- **Cơ chế Fallback an toàn:** Nếu Ollama hoặc Gemini gặp timeout hoặc mất kết nối, hệ thống tự động fallback sang chế độ Heuristic cục bộ, bảo đảm tính năng tìm đường của người dùng không bao giờ bị gián đoạn.

### 4. Sao lưu & Khôi phục dữ liệu Trực tiếp trên Trình duyệt (Cloud-Ready JSON Backup)
- Nhằm thích ứng hoàn hảo với môi trường Serverless (Vercel) không có hệ thống tệp lưu trữ cục bộ, tính năng Backup & Restore được chuyển giao hoàn toàn qua giao diện web:
  - **Backup:** Xuất toàn bộ 6 collections thành file JSON tải trực tiếp về máy tính người dùng.
  - **Restore:** Tải file JSON lên trình duyệt, hệ thống tự động xác thực schema, hiển thị số lượng document từng collection để Quản trị viên duyệt trước khi ghi đè vào MongoDB.

---

## V. TRUY VẤN MONGODB NÂNG CAO TRÊN DỮ LIỆU ĐỒ THỊ

### 1. Phép nối `$lookup` giữa Tuyến xe và Trạm dừng
```javascript
db.TuyenXe.aggregate([
  { $match: { ma_tuyen: "01" } },
  { $lookup: { from: "CO_TRAM", localField: "_id", foreignField: "_from", as: "route_stops" } },
  { $project: { ma_tuyen: 1, ten_tuyen: 1, so_luong_tram: { $size: "$route_stops" } } }
]);
```
*Kết quả xác minh:* Tuyến 01 nạp chính xác **16 trạm** (bao gồm cả chiều đi và chiều về).

### 2. Duyệt Đồ thị mạng lưới bằng `$graphLookup`
```javascript
db.TramDung.aggregate([
  { $match: { ma_tram: "TR_01" } },
  {
    $graphLookup: {
      from: "KE_TIEP",
      startWith: "$_id",
      connectFromField: "_to",
      connectToField: "_from",
      as: "reachable_stops",
      maxDepth: 3,
      depthField: "num_hops"
    }
  }
]);
```
*Kết quả xác minh:* Từ đỉnh xuất phát `TramDung/TR_01` (Bến Thành), với độ sâu `maxDepth: 3`, MongoDB duyệt đồ thị và tiếp cận được **62 liên kết trạm kế tiếp** trên mạng lưới. Chứng minh mô hình NoSQL MongoDB đáp ứng toàn diện bài toán duyệt đồ thị (Graph Traversal).

---

## VI. HIỆN TRẠNG TRIỂN KHAI & TÍNH SẴN SÀNG ĐÁM MÂY (DEPLOYMENT READINESS)

Để đảm bảo tính trung thực và khách quan tuyệt đối, hiện trạng triển khai được phân định rõ ràng như sau:

| Hạng mục | Trạng thái hiện tại | Chi tiết kỹ thuật đã thực hiện |
| :--- | :---: | :--- |
| **Môi trường Local** | **HOÀN TẤT & ĐÃ XÁC MINH** | MongoDB Community Server, Express Backend, ReactJS Frontend, Leaflet Map, Cytoscape Graph, Trợ lý AI đều đang vận hành thực tế. |
| **Bộ kiểm thử (Tests)** | **HOÀN TẤT & PASS 100%** | 23/23 Unit Tests pass, 25/25 RBAC Integration Tests pass, Vite build production 0 lỗi. |
| **Kho mã nguồn GitHub** | **ĐÃ PHÁT HÀNH TRỰC TIẾP** | Đồng bộ toàn bộ source code sạch lên nhánh `main` của repository công khai. |
| **Công cụ Di chuyển Cloud** | **SẴN SÀNG (READY)** | Tích hợp script `Nosql_tv1_Database/scripts/migrate_to_atlas.js` hỗ trợ `--dry-run` và `--force` để đẩy dữ liệu lên MongoDB Atlas. |
| **Cấu hình Vercel Serverless**| **SẴN SÀNG (READY)** | Đã cấu hình adapter `api/index.js` và file `vercel.json` cho cả Frontend và Backend. |
| **Vercel Production Deployment**| **CHỜ KẾT NỐI TÀI KHOẢN** | Chưa kích hoạt deploy thực tế trên Internet vì Vercel CLI chưa đăng nhập cục bộ và Dashboard cần chủ tài khoản liên kết repository. |
| **MongoDB Atlas Live Cluster**| **CHỜ CẤU HÌNH KẾT NỐI** | Chưa kết nối live cluster vì cần chuỗi kết nối URI do người dùng cung cấp qua biến môi trường bí mật. |

---

## VII. KẾT LUẬN & ĐÁNH GIÁ NGHIỆM THU

Dự án **BUSROUTE HCM V2.0** đã hoàn thành toàn diện mọi mục tiêu đề ra:
1. **Kiến trúc dữ liệu NoSQL chuẩn mực:** Mô hình hóa đồ thị (Graph on Document) hiệu quả cao trên MongoDB với 6 collections, quản trị index chặt chẽ và không còn cạnh mồ côi.
2. **Bảo mật và phân quyền chuẩn hóa:** Phân định rõ 4 không gian làm việc với 3 vai trò `admin`, `operator`, `passenger`, mã hóa mật khẩu một chiều BCrypt và chống các lỗ hổng leo thang quyền hạn.
3. **Trải nghiệm người dùng phong phú:** Tích hợp đầy đủ từ tra cứu lộ trình tối ưu đa tiêu chí, bản đồ trực quan Leaflet 2 chiều, cổng cá nhân hóa hành khách đến trợ lý AI Hybrid đa nền tảng.
4. **Sẵn sàng triển khai điện toán đám mây:** Cấu hình Vercel Serverless và script di chuyển MongoDB Atlas đã được chuẩn bị đầy đủ và sẵn sàng đưa vào vận hành thực tế.

**KẾT LUẬN: HỆ THỐNG ĐỦ ĐIỀU KIỆN 100% ĐỂ BẢO VỆ VÀ DEMO ĐỒ ÁN TRƯỚC HỘI ĐỒNG.**

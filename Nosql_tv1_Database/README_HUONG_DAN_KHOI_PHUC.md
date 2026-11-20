# MODULE 01 - THÀNH VIÊN 1: XÂY DỰNG CƠ SỞ DỮ LIỆU MONGODB (`BusRouteDB`) & HƯỚNG DẪN KHÔI PHỤC

Tài liệu này là hồ sơ bàn giao hoàn chỉnh của **Thành viên 1 (Phụ trách toàn bộ Database)** theo đúng quy ước chung của nhóm cho hệ thống **Quản lý lộ trình xe buýt tại TP.HCM** trên nền tảng **MongoDB (`mongodb://localhost:27017`)**.

---

## 1. Cấu trúc Database theo Quy ước chung (Mục 3.1)

| Thành phần | Tên thống nhất | Loại trên MongoDB | Số lượng dữ liệu mẫu | Mô tả |
| :--- | :--- | :--- | :---: | :--- |
| **Database** | `BusRouteDB` | Database | 6 Collections | Cơ sở dữ liệu chính của toàn hệ thống |
| **Vertex** | `TuyenXe` | Collection | 6 tuyến | Thông tin tuyến xe buýt TP.HCM (`01`, `03`, `04`, `08`, `19`, `152`) |
| **Vertex** | `TramDung` | Collection | 25 trạm | Thông tin trạm dừng và tọa độ GPS (`TR_01` .. `TR_25`) |
| **Vertex** | `NguoiDung` | Collection | 3 tài khoản | Tài khoản quản trị và người dùng (mật khẩu mẫu: `123456`) |
| **Edge** | `CO_TRAM` | Edge Collection | 92 cạnh | Liên kết từ `TuyenXe/<_key>` đến `TramDung/<_key>` theo chiều & thứ tự |
| **Edge** | `KE_TIEP` | Edge Collection | 80 cạnh | Liên kết có hướng giữa 2 trạm liên tiếp `TramDung/<A>` -> `TramDung/<B>` kèm khoảng cách (`khoang_cach_km`) và thời gian (`thoi_gian_di_chuyen_phut`) |
| **Graph** | `BusRouteGraph` | Graph Metadata / `$graphLookup` | 1 Graph Def | Đồ thị lộ trình xe buýt kết nối `TuyenXe`, `TramDung` qua `CO_TRAM` và `KE_TIEP` |

> **Quy ước định danh tương thích 100% giữa các Module:**
> Mỗi document Vertex đều lưu `_key` (ví dụ `"TX_01"`, `"TR_01"`) và `_id` dạng `<Collection>/<Key>` (ví dụ `"TuyenXe/TX_01"`, `"TramDung/TR_01"`). Các document trong Edge Collections (`CO_TRAM`, `KE_TIEP`) sử dụng trường `_from` và `_to` trỏ trực tiếp tới `_id` của Vertex, giúp giữ nguyên cấu trúc đồ thị chuẩn và tương thích hoàn toàn với các truy vấn `$lookup` và `$graphLookup` của MongoDB.

---

## 2. Cấu trúc thư mục bàn giao của Thành viên 1 (`Nosql_tv1_Database`)

```text
Nosql_tv1_Database/
├── data/
│   ├── json/                        # Dữ liệu mẫu định dạng JSON
│   │   ├── TuyenXe.json
│   │   ├── TramDung.json
│   │   ├── NguoiDung.json
│   │   ├── CO_TRAM.json
│   │   └── KE_TIEP.json
│   └── csv/                         # Dữ liệu mẫu định dạng CSV
│       ├── TuyenXe.csv
│       ├── TramDung.csv
│       ├── NguoiDung.csv
│       ├── CO_TRAM.csv
│       └── KE_TIEP.csv
├── scripts/
│   ├── init_database.mongosh.js     # Script mongosh khởi tạo DB, Collections, Indexes & BusRouteGraph
│   ├── setup_and_import.js          # Script khởi tạo DB & Import toàn bộ JSON vào localhost:27017
│   ├── import_csv.js                # Script Import dữ liệu từ bộ file CSV vào localhost:27017
│   ├── backup_export.js             # Script Export & Backup toàn bộ BusRouteDB ra file JSON
│   ├── restore_database.js          # Script Restore (Khôi phục) BusRouteDB từ file Backup
│   └── generate_data.js             # Script sinh dữ liệu mẫu đồng bộ JSON & CSV
├── queries/
│   ├── bus_route_queries.mongosh.js # Bộ câu lệnh truy vấn mongosh (CRUD, Lấy trạm thuộc tuyến, Duyệt đồ thị)
│   └── run_queries.js               # Script thực thi & kiểm thử toàn bộ truy vấn + thuật toán tìm đường Graph
├── backup/
│   ├── BusRouteDB_FullBackup.json   # File Full Backup toàn bộ Database
│   └── collections/                 # Các file backup rời từng Collection
└── README_HUONG_DAN_KHOI_PHUC.md    # Tài liệu hướng dẫn sử dụng, backup & khôi phục Database
```

---

## 3. Hướng dẫn Khởi tạo, Import, Backup và Khôi phục (Restore) Database

### Cách 1: Sử dụng Node.js Script (Khuyên dùng – Tự động 100%, không cần cài thêm CLI ngoài)

Đảm bảo dịch vụ MongoDB đang chạy tại `localhost:27017`, mở terminal tại thư mục gốc và chạy:

1. **Khởi tạo mới Database `BusRouteDB` và Import dữ liệu chuẩn từ JSON:**
   ```bash
   node Nosql_tv1_Database/scripts/setup_and_import.js
   ```

2. **Import dữ liệu từ bộ file CSV (`data/csv/*.csv`):**
   ```bash
   node Nosql_tv1_Database/scripts/import_csv.js
   ```

3. **Chạy kiểm thử bộ câu lệnh truy vấn (CRUD, Lấy trạm thuộc tuyến, Duyệt đồ thị `$graphLookup` & Tìm đường ngắn nhất):**
   ```bash
   node Nosql_tv1_Database/queries/run_queries.js
   ```

4. **Thực hiện Export / Backup Database:**
   ```bash
   node Nosql_tv1_Database/scripts/backup_export.js
   ```
   *(Dữ liệu sẽ được xuất ra `Nosql_tv1_Database/backup/BusRouteDB_FullBackup.json` và thư mục `backup/collections/`)*

5. **Khôi phục (Restore) Database từ bản Backup:**
   ```bash
   node Nosql_tv1_Database/scripts/restore_database.js
   ```

---

### Cách 2: Sử dụng trực tiếp trên `mongosh` hoặc MongoDB Compass

Nếu chạy trong `mongosh` (hoặc tab ` >_MONGOSH ` tích hợp sẵn trong **MongoDB Compass** đang kết nối `mongodb://localhost:27017`):

1. **Khởi tạo Database và Graph:**
   Copy nội dung file `Nosql_tv1_Database/scripts/init_database.mongosh.js` dán vào cửa sổ `mongosh`, hoặc chạy lệnh:
   ```bash
   mongosh "mongodb://localhost:27017/BusRouteDB" Nosql_tv1_Database/scripts/init_database.mongosh.js
   ```

2. **Chạy bộ truy vấn trên `mongosh`:**
   Copy nội dung file `Nosql_tv1_Database/queries/bus_route_queries.mongosh.js` dán vào `mongosh`, hoặc chạy:
   ```bash
   mongosh "mongodb://localhost:27017/BusRouteDB" Nosql_tv1_Database/queries/bus_route_queries.mongosh.js
   ```

3. **Sử dụng công cụ `mongoimport` / `mongoexport` / `mongodump` / `mongorestore` (nếu máy có cài MongoDB Database Tools):**
   ```bash
   # Export từng collection
   mongoexport --uri="mongodb://localhost:27017/BusRouteDB" --collection=TuyenXe --out=TuyenXe.json --jsonArray

   # Import từng collection
   mongoimport --uri="mongodb://localhost:27017/BusRouteDB" --collection=TuyenXe --file=Nosql_tv1_Database/data/json/TuyenXe.json --jsonArray --drop

   # Backup & Restore nhị phân
   mongodump --uri="mongodb://localhost:27017/BusRouteDB" --out=Nosql_tv1_Database/backup/dump
   mongorestore --uri="mongodb://localhost:27017/BusRouteDB" --drop Nosql_tv1_Database/backup/dump/BusRouteDB
   ```

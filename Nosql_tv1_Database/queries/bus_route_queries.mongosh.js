/**
 * ============================================================================
 * MODULE 01 - THÀNH VIÊN 1: BỘ TRUY VẤN MONGODB (MONGOSH / AGGREGATION / GRAPH)
 * Bộ câu lệnh chuẩn MongoDB: CRUD, Aggregation Pipelines ($lookup, $graphLookup, $facet)
 *  1. Truy vấn Thêm, Sửa, Xóa, Tìm kiếm (CRUD) trên TuyenXe, TramDung, NguoiDung
 *  2. Truy vấn lấy các trạm thuộc tuyến (theo chiều và thứ tự kèm khoảng cách/thời gian)
 *  3. Truy vấn tìm các tuyến xe đi qua một trạm dừng
 *  4. Truy vấn duyệt đồ thị ($graphLookup) và tìm đường đi ngắn nhất giữa 2 trạm
 * ============================================================================
 */

db = db.getSiblingDB("BusRouteDB");

print("==================================================================");
print("PHẦN 1: TRUY VẤN THÊM, SỬA, XÓA, TÌM KIẾM (CRUD)");
print("==================================================================");

// 1.1. [THÊM] Thêm một tuyến xe mới và trạm dừng mới (demo rồi xóa để giữ nguyên dữ liệu chuẩn)
db.TuyenXe.insertOne({
  _id: "TuyenXe/TX_99",
  _key: "TX_99",
  ma_tuyen: "99",
  ten_tuyen: "Chợ Bến Thành - Khu đô thị Sala",
  diem_dau: "Bến xe buýt Sài Gòn",
  diem_cuoi: "Khu đô thị Sala",
  cu_ly_km: 9.5,
  thoi_gian_hoat_dong: { bat_dau: "05:30", ket_thuc: "20:00" },
  gia_ve: 6000,
  trang_thai: "active"
});
print("+ [THÊM] Đã thêm tuyến mẫu TX_99:");
printjson(db.TuyenXe.findOne({ _key: "TX_99" }));

// 1.2. [SỬA] Cập nhật giá vé và cự ly tuyến TX_99
db.TuyenXe.updateOne(
  { _key: "TX_99" },
  { $set: { gia_ve: 7000, cu_ly_km: 10.2 } }
);
print("+ [SỬA] Tuyến TX_99 sau khi cập nhật:");
printjson(db.TuyenXe.findOne({ _key: "TX_99" }));

// 1.3. [XÓA] Xóa tuyến TX_99 vừa tạo thử nghiệm
db.TuyenXe.deleteOne({ _key: "TX_99" });
print("+ [XÓA] Đã xóa tuyến thử nghiệm TX_99.");

// 1.4. [TÌM KIẾM] Tìm kiếm tuyến xe có tên chứa "Bến Thành" và đang hoạt động
print("+ [TÌM KIẾM] Danh sách các tuyến xe đi qua 'Bến Thành':");
printjson(
  db.TuyenXe.find(
    {
      ten_tuyen: { $regex: "Bến Thành", $options: "i" },
      trang_thai: "active"
    },
    { _key: 1, ma_tuyen: 1, ten_tuyen: 1, gia_ve: 1 }
  )
    .sort({ ma_tuyen: 1 })
    .toArray()
);

// 1.5. [TÌM KIẾM] Tìm kiếm trạm dừng ở "Quận 1" hoặc "Quận 5"
print("+ [TÌM KIẾM] Các trạm dừng tại Quận 1:");
printjson(
  db.TramDung.find(
    { dia_chi: { $regex: "Quận 1,", $options: "i" } },
    { _key: 1, ma_tram: 1, ten_tram: 1, dia_chi: 1 }
  )
    .sort({ ma_tram: 1 })
    .toArray()
);

print("\n==================================================================");
print("PHẦN 2: TRUY VẤN LẤY CÁC TRẠM THUỘC TUYẾN (JOIN CO_TRAM -> TramDung -> KE_TIEP)");
print("==================================================================");

// Lấy danh sách trạm theo thứ tự của Tuyến 01 (TuyenXe/TX_01) chiều lượt đi (luot_di)
const danhSachTramTuyen01 = db.CO_TRAM.aggregate([
  {
    $match: {
      _from: "TuyenXe/TX_01",
      ma_chieu: "luot_di"
    }
  },
  { $sort: { thu_tu: 1 } },
  {
    $lookup: {
      from: "TramDung",
      localField: "_to",
      foreignField: "_id",
      as: "tram"
    }
  },
  { $unwind: "$tram" },
  {
    $lookup: {
      from: "KE_TIEP",
      let: {
        maTuyen: "$ma_tuyen",
        maChieu: "$ma_chieu",
        thuTu: "$thu_tu"
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$ma_tuyen", "$$maTuyen"] },
                { $eq: ["$ma_chieu", "$$maChieu"] },
                { $eq: ["$thu_tu", "$$thuTu"] }
              ]
            }
          }
        },
        { $limit: 1 }
      ],
      as: "ke_tiep"
    }
  },
  {
    $project: {
      _id: 0,
      thu_tu: 1,
      ma_chieu: 1,
      ma_tram: "$tram.ma_tram",
      ten_tram: "$tram.ten_tram",
      khoang_cach_den_tram_tiep_theo: {
        $ifNull: [{ $arrayElemAt: ["$ke_tiep.khoang_cach_km", 0] }, null]
      },
      thoi_gian_den_tram_tiep_theo: {
        $ifNull: [{ $arrayElemAt: ["$ke_tiep.thoi_gian_di_chuyen_phut", 0] }, null]
      }
    }
  }
]).toArray();

print("+ Lộ trình chi tiết Tuyến 01 (Lượt đi):");
printjson(danhSachTramTuyen01);

print("\n==================================================================");
print("PHẦN 3: TRUY VẤN TÌM CÁC TUYẾN XE ĐI QUA MỘT TRẠM DỪNG (/api/search/by-stop/:id)");
print("==================================================================");

// Tìm tất cả các tuyến xe đi qua trạm TR_01 (Bến xe buýt Sài Gòn)
const tuyenQuaTramTR01 = db.CO_TRAM.aggregate([
  { $match: { _to: "TramDung/TR_01" } },
  {
    $lookup: {
      from: "TuyenXe",
      localField: "_from",
      foreignField: "_id",
      as: "tuyen"
    }
  },
  { $unwind: "$tuyen" },
  {
    $group: {
      _id: "$tuyen._id",
      ma_tuyen: { $first: "$tuyen.ma_tuyen" },
      ten_tuyen: { $first: "$tuyen.ten_tuyen" },
      cac_chieu_di_qua: {
        $push: {
          ma_chieu: "$ma_chieu",
          thu_tu_tram: "$thu_tu"
        }
      }
    }
  },
  { $sort: { ma_tuyen: 1 } }
]).toArray();

print("+ Các tuyến xe đi qua trạm TR_01 (Bến xe buýt Sài Gòn):");
printjson(tuyenQuaTramTR01);

print("\n==================================================================");
print("PHẦN 4: TRUY VẤN DUYỆT ĐỒ THỊ ($graphLookup) VÀ TÌM ĐƯỜNG GIỮA 2 TRẠM");
print("==================================================================");

// 4.1. Duyệt đồ thị ($graphLookup) trên BusRouteGraph:
// Tìm tất cả các trạm có thể đi tới được từ trạm TR_01 trong tối đa 3 chặng (depth <= 2)
const duyetDoThiTuTR01 = db.TramDung.aggregate([
  { $match: { _id: "TramDung/TR_01" } },
  {
    $graphLookup: {
      from: "KE_TIEP",
      startWith: "$_id",
      connectFromField: "_to",
      connectToField: "_from",
      as: "cac_canh_ke_tiep",
      maxDepth: 2,
      depthField: "bac_do_thi"
    }
  },
  {
    $project: {
      _id: 1,
      ten_tram_xuat_phat: "$ten_tram",
      so_canh_duyet_duoc: { $size: "$cac_canh_ke_tiep" },
      danh_sach_canh_bac_0: {
        $filter: {
          input: "$cac_canh_ke_tiep",
          as: "edge",
          cond: { $eq: ["$$edge.bac_do_thi", 0] }
        }
      }
    }
  }
]).toArray();

print("+ Kết quả duyệt đồ thị ($graphLookup) từ trạm TR_01 (Bến Thành):");
printjson(duyetDoThiTuTR01);

const { MongoClient } = require("mongodb");

async function verify() {
    const client = new MongoClient("mongodb://127.0.0.1:27017");
    try {
        await client.connect();
        const db = client.db("BusRouteDB");
        console.log("LIVE VERIFIED: Connected to MongoDB BusRouteDB successfully!");
        
        const cols = await db.listCollections().toArray();
        console.log(`Total collections: ${cols.length}`);
        
        for (const col of cols) {
            const count = await db.collection(col.name).countDocuments();
            const indexes = await db.collection(col.name).indexes();
            console.log(`- Collection [${col.name}]: ${count} docs | Indexes: [${indexes.map(i => i.name).join(", ")}]`);
        }

        const sampleRoute = await db.collection("TuyenXe").findOne({ ma_tuyen: "01" });
        console.log(`Sample Route: [${sampleRoute.ma_tuyen}] ${sampleRoute.ten_tuyen} (Giá: ${sampleRoute.gia_ve} VNĐ)`);

        const sampleStop = await db.collection("TramDung").findOne({ ma_tram: "TR_01" });
        console.log(`Sample Stop: [${sampleStop.ma_tram}] ${sampleStop.ten_tram} (GPS: ${sampleStop.kinh_do}, ${sampleStop.vi_do})`);

        const sampleCoTram = await db.collection("CO_TRAM").findOne({ ma_tuyen: "01" });
        console.log(`Sample CO_TRAM: ${sampleCoTram._from} -> ${sampleCoTram._to} (Thứ tự: ${sampleCoTram.thu_tu})`);

        const sampleKeTiep = await db.collection("KE_TIEP").findOne({ ma_tuyen: "01" });
        console.log(`Sample KE_TIEP: ${sampleKeTiep._from} -> ${sampleKeTiep._to} (Khoảng cách: ${sampleKeTiep.khoang_cach_km} km)`);

        const graphDef = await db.collection("BusRouteGraph").findOne();
        console.log(`Sample BusRouteGraph: ${graphDef.graph_name} with ${graphDef.vertex_collections.length} vertices & ${graphDef.edge_definitions.length} edge definitions`);
    } finally {
        await client.close();
    }
}

verify().catch(console.error);

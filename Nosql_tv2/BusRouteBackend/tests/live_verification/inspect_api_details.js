const http = require('http');

async function get(path, headers = {}) {
    return new Promise((resolve, reject) => {
        http.get({ hostname: 'localhost', port: 3000, path, headers }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

(async () => {
    // 1. Path result details
    const pathData = await get('/api/path?from=TR_01&to=TR_04');
    console.log('--- PATH DETAILS ---');
    console.log('Source:', pathData.source, '| Traversal:', pathData.traversalMode);
    console.log('Total paths found:', pathData.data?.paths?.length);
    if (pathData.data?.paths?.[0]) {
        const p = pathData.data.paths[0];
        console.log('Path 0:', p.summary?.totalTimeMinutes, 'mins | Transfers:', p.summary?.transfers, '| Segments:', p.segments?.length);
        p.segments?.forEach((s, idx) => {
            console.log(`  Seg ${idx+1}: [${s.route?.code}] ${s.fromStop?.name} -> ${s.toStop?.name} (${s.stopsCount} trạm, ${s.travelTimeMinutes} phút)`);
        });
    }

    // 2. Graph result details
    const graphData = await get('/api/graph');
    console.log('\n--- GRAPH DETAILS ---');
    console.log('Source:', graphData.source);
    console.log('Vertices/Nodes count:', graphData.data?.nodes?.length);
    console.log('Edges count:', graphData.data?.edges?.length);
    console.log('Sample Node:', graphData.data?.nodes?.[0]);
    console.log('Sample Edge:', graphData.data?.edges?.[0]);

    // 3. Analytics
    const analytics = await get('/api/analytics/network');
    console.log('\n--- ANALYTICS DETAILS ---');
    console.log('Analytics keys:', Object.keys(analytics));
    console.log('Data:', JSON.stringify(analytics.data || analytics).substring(0, 300));
})();

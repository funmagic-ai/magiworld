/**
 * 将点云数据转换为DXF格式并触发下载
 * @param {Float32Array|Array} positions - 点云位置数据 (x, y, z 坐标交替排列)
 * @param {string} filename - 下载文件名
 */
function exportPointCloudToDXF(positions, filename = 'pointcloud.dxf') {
    if (!positions || positions.length === 0) {
        throw new Error('点云数据为空');
    }

    // 确保点的数量是3的倍数
    if (positions.length % 3 !== 0) {
        throw new Error('点云数据格式不正确，坐标数必须是3的倍数');
    }

    // 计算边界值用于HEADER段
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    // DXF文件头部
    let dxfContent = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1006
9
$INSBASE
10
0.0
20
0.0
30
0.0
`;

    // 创建点对象数组以便排序
    const points = [];
    const pointCount = positions.length / 3;
    for (let i = 0; i < pointCount; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        
        points.push({x, y, z});
        
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        minZ = Math.min(minZ, z);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        maxZ = Math.max(maxZ, z);
    }

    // 按Z坐标排序点 (从低到高)
    points.sort((a, b) => a.z - b.z);

    // 添加边界信息
    dxfContent += `9
$EXTMIN
10
${minX.toFixed(2)}
20
${minY.toFixed(2)}
30
${minZ.toFixed(2)}
9
$EXTMAX
10
${maxX.toFixed(2)}
20
${maxY.toFixed(2)}
30
${maxZ.toFixed(2)}
0
ENDSEC
0
SECTION
2
ENTITIES
`;

    // 添加点实体 (已按Z坐标排序)
    for (let i = 0; i < points.length; i++) {
        const {x, y, z} = points[i];
        
        dxfContent += `0
POINT
8
0
10
${x.toFixed(2)}
20
${y.toFixed(2)}
30
${z.toFixed(2)}
`;
    }

    // 结束实体段和文件
    dxfContent += `0
ENDSEC
0
EOF`;

    // 创建Blob对象并触发下载
    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
    
    return true;
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { exportPointCloudToDXF };
}
/**
 * 导出管理模块
 * 负责点云数据的导出功能
 */

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

/**
 * 导出项目数据为JSON格式并触发下载
 * @param {Object} projectData - 项目数据
 * @param {string} filename - 下载文件名
 */
function exportProjectData(projectData, filename = 'pointcloud_project.json') {
    if (!projectData) {
        throw new Error('项目数据为空');
    }

    try {
        // 将项目数据转换为JSON字符串
        const jsonString = JSON.stringify(projectData, (key, value) => {
            // 处理Float32Array等特殊类型
            if (value instanceof Float32Array) {
                return {
                    _type: 'Float32Array',
                    data: Array.from(value)
                };
            }
            if (value instanceof Uint8Array) {
                return {
                    _type: 'Uint8Array',
                    data: Array.from(value)
                };
            }
            if (value instanceof Int32Array) {
                return {
                    _type: 'Int32Array',
                    data: Array.from(value)
                };
            }
            // 处理File对象
            if (value instanceof File) {
                return {
                    _type: 'File',
                    name: value.name,
                    type: value.type,
                    size: value.size
                };
            }
            // 处理Blob对象
            if (value instanceof Blob) {
                return {
                    _type: 'Blob',
                    type: value.type,
                    size: value.size
                };
            }
            return value;
        }, 2);

        // 创建Blob对象并触发下载
        const blob = new Blob([jsonString], { type: 'application/json' });
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
    } catch (error) {
        console.error('导出项目数据时出错:', error);
        throw new Error('导出项目数据失败: ' + error.message);
    }
}

/**
 * 从JSON数据导入项目
 * @param {string} jsonString - JSON字符串
 * @returns {Object} 解析后的项目数据
 */
function importProjectData(jsonString) {
    if (!jsonString) {
        throw new Error('JSON数据为空');
    }

    try {
        const projectData = JSON.parse(jsonString, (key, value) => {
            // 恢复特殊类型
            if (value && typeof value === 'object' && value._type) {
                switch (value._type) {
                    case 'Float32Array':
                        return new Float32Array(value.data);
                    case 'Uint8Array':
                        return new Uint8Array(value.data);
                    case 'Int32Array':
                        return new Int32Array(value.data);
                    case 'File':
                    case 'Blob':
                        // 无法直接恢复File/Blob对象，返回null
                        return null;
                }
            }
            return value;
        });

        return projectData;
    } catch (error) {
        console.error('导入项目数据时出错:', error);
        throw new Error('导入项目数据失败: ' + error.message);
    }
}

export class ExportManager {
    /**
     * 使用网格采样降低点云密度
     * @param {Array} positions - 点云位置数据 [x1, y1, z1, x2, y2, z2, ...]
     * @param {number} gridSize - 网格大小
     * @returns {Array} 采样后的点云位置数据
     */
    gridSamplePoints(positions, gridSize = 1.0) {
        if (!positions || positions.length === 0) {
            return [];
        }

        // 创建网格映射
        const grid = new Map();

        let repeatedPoints = 0;

        // 遍历所有点
        for (let i = 0; i < positions.length; i += 3) {
            const x = Math.round(positions[i] * 100) / 100;
            const y = Math.round(positions[i + 1] * 100) / 100;
            const z = Math.round(positions[i + 2] * 100) / 100;

            // 计算网格坐标
            const gridX = Math.round(x / gridSize);
            const gridY = Math.round(y / gridSize);
            const gridZ = Math.round(z / gridSize);

            // 创建网格键
            const gridKey = `${gridX},${gridY},${gridZ}`;

            // 如果该网格还没有点，则添加当前点
            if (!grid.has(gridKey)) {
                grid.set(gridKey, [x, y, z]);
            }
            else {
                repeatedPoints++;
                console.log('重复点:', x, y, z, '网格坐标:', gridX * gridSize, gridY * gridSize, gridZ * gridSize);
            }
            // 如果需要随机采样，可以在这里添加随机选择逻辑
            // 例如：以一定概率替换当前网格中的点
        }
        console.log('重复点数:', repeatedPoints);

        // 收集采样后的点
        const sampledPositions = [];
        for (const point of grid.values()) {
            sampledPositions.push(point[0], point[1], point[2]);
        }

        return sampledPositions;
    }

    /**
     * 直接导出当前点云数据（无重采样）
     */
    exportCurrentPointCloud(pointCloud, texts, brightnessLevel, pix) {
        console.log('开始直接导出当前点云数据');

        // 强制更新点云的世界矩阵，确保所有变换都已应用
        pointCloud.updateMatrixWorld(true);

        // 获取当前点云的位置数据（这些数据已经包含了裁剪效果）
        const positions = pointCloud.geometry.attributes.position.array;
        console.log(`原始点云包含 ${positions.length/3} 个点`);

        // 创建变换后的位置数据数组
        const transformedPositions = [];

        // 直接使用点云的世界矩阵来获取完整的变换（包含TransformControls的实时变换）
        const pointCloudMatrix = pointCloud.matrixWorld;

        // 遍历所有点并应用变换
        for (let i = 0; i < positions.length; i += 3) {
            const point = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);

            // 应用完整的世界变换（自动包含旋转、缩放、位置以及TransformControls的实时变换）
            point.applyMatrix4(pointCloudMatrix);

            transformedPositions.push(point.x, point.y, point.z);
        }
        console.log(`变换后点云包含 ${transformedPositions.length/3} 个点`);

        console.log(`当前亮度等级: ${brightnessLevel}`);

        // 如果亮度等级大于1，则添加额外的点云层
        if (brightnessLevel > 1) {
            // 计算Z轴偏移量，每级降低0.12
            const zOffset = -0.12;

            // 保存原始点的数量，避免在添加点的过程中修改遍历的数组
            const originalLength = transformedPositions.length;

            // 为每个额外等级添加一层点云
            for (let level = 2; level <= brightnessLevel; level++) {
                const currentZOffset = zOffset * (level - 1);
                // 添加偏移后的点
                for (let i = 0; i < originalLength; i += 3) {
                    transformedPositions.push(
                        transformedPositions[i],     // x
                        transformedPositions[i + 1], // y
                        transformedPositions[i + 2] + currentZOffset  // z + offset
                    );
                }
            }
        }

        // 添加文字点云数据
        if (texts && texts.length > 0) {
            console.log(`添加文字点云数据，共 ${texts.length} 个文字对象`);
            
            // 遍历所有文字对象
            for (const textObj of texts) {
                if (textObj.textObject) {
                    // 获取文字点云数据（已包含世界变换）
                    const textPositions = textObj.textObject.getPointCloudData();
                    console.log(`文字 "${textObj.text}" 包含 ${textPositions.length/3} 个点`);
                    
                    // 直接添加到结果中（无需再次应用变换）
                    for (let i = 0; i < textPositions.length; i += 3) {
                        transformedPositions.push(
                            textPositions[i], 
                            textPositions[i + 1], 
                            textPositions[i + 2]
                        );
                    }
                }
            }
        }

        // 使用网格采样降低点云密度，网格大小为0.5
        const sampledPositions = this.gridSamplePoints(transformedPositions, pix);
        console.log(`采样后点云包含 ${sampledPositions.length/3} 个点`);

        // 计算点云的边界框
        if (sampledPositions.length > 0) {
            let minX = Infinity, minY = Infinity, minZ = Infinity;
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

            for (let i = 0; i < sampledPositions.length; i += 3) {
                const x = sampledPositions[i];
                const y = sampledPositions[i + 1];
                const z = sampledPositions[i + 2];

                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                minZ = Math.min(minZ, z);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
                maxZ = Math.max(maxZ, z);
            }

            console.log('点云边界框:', {
                minX: minX,
                minY: minY,
                minZ: minZ,
                maxX: maxX,
                maxY: maxY,
                maxZ: maxZ,
                width: maxX - minX,
                height: maxY - minY,
                depth: maxZ - minZ
            });
        }

        return sampledPositions;
    }

    /**
     * 导出点云到DXF文件
     */
    exportToDXF(positions, filename = 'pointcloud.dxf') {
        return exportPointCloudToDXF(positions, filename);
    }

    /**
     * 导出完整项目数据
     */
    exportProject(projectData, filename = 'pointcloud_project.json') {
        return exportProjectData(projectData, filename);
    }

    /**
     * 导入项目数据
     */
    importProject(jsonString) {
        return importProjectData(jsonString);
    }
}
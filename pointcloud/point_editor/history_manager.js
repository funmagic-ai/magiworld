/**
 * 历史管理模块
 * 负责点云操作的历史记录管理
 */

export class HistoryManager {
    constructor() {
        this.pointCloudHistory = [];
        this.currentPointCloudIndex = -1;
        this.maxHistoryLength = 50; // 限制历史记录数量
    }

    /**
     * 保存点云到历史记录
     */
    saveToHistory(pointCloud) {
        if (!pointCloud) return;

        // 如果当前索引不是最后一个，则删除后面的历史记录
        if (this.currentPointCloudIndex < this.pointCloudHistory.length - 1) {
            this.pointCloudHistory = this.pointCloudHistory.slice(0, this.currentPointCloudIndex + 1);
        }

        // 克隆当前点云并保存到历史记录
        const clonedPointCloud = this.clonePointCloud(pointCloud);
        
        this.pointCloudHistory.push(clonedPointCloud);
        this.currentPointCloudIndex++;

        // 如果历史记录超过最大长度，则移除最旧的记录
        if (this.pointCloudHistory.length > this.maxHistoryLength) {
            this.pointCloudHistory.shift();
            this.currentPointCloudIndex--;
        }
    }

    /**
     * 克隆点云对象
     */
    clonePointCloud(pointCloud) {
        // 克隆几何体
        const clonedGeometry = pointCloud.geometry.clone();
        
        // 克隆材质
        const clonedMaterial = pointCloud.material.clone();
        
        // 创建新的点云对象
        const clonedPointCloud = new THREE.Points(clonedGeometry, clonedMaterial);
        
        // 复制位置、旋转和缩放
        clonedPointCloud.position.copy(pointCloud.position);
        clonedPointCloud.rotation.copy(pointCloud.rotation);
        clonedPointCloud.scale.copy(pointCloud.scale);
        
        return clonedPointCloud;
    }

    /**
     * 恢复到上一步点云状态
     */
    restorePreviousPointCloud(scene, pointCloudManager, originalDepthData, originalConfidenceData, originalDitherData, transformControls, mouseControlEnabled) {
        // 检查是否有历史记录可以恢复
        if (this.currentPointCloudIndex <= 0 || this.pointCloudHistory.length === 0) {
            throw new Error('没有更早的历史记录');
        }

        // 减少当前索引
        this.currentPointCloudIndex--;

        // 获取历史记录中的点云
        const previousPointCloud = this.pointCloudHistory[this.currentPointCloudIndex];

        // 移除当前点云
        const currentPointCloud = pointCloudManager.getPointCloud();
        if (currentPointCloud) {
            if (transformControls && transformControls.object === currentPointCloud) {
                transformControls.detach();
            }
            scene.remove(currentPointCloud);
        }

        // 添加历史记录中的点云
        scene.add(previousPointCloud);

        // 更新点云管理器中的点云引用
        // 注意：这里我们直接替换引用，但在实际应用中可能需要更复杂的同步
        pointCloudManager.pointCloud = previousPointCloud;

        // 如果鼠标控制已启用，附加TransformControls
        if (mouseControlEnabled && transformControls) {
            transformControls.attach(previousPointCloud);
        }

        return true;
    }

    /**
     * 恢复到原始点云状态
     */
    restoreOriginalPointCloud(scene, pointCloudManager, originalDepthData, originalConfidenceData, originalDitherData, transformControls, mouseControlEnabled) {
        // 检查是否有原始数据
        if (!originalDepthData || !originalConfidenceData) {
            throw new Error('没有原始点云数据');
        }

        // 移除当前点云
        const currentPointCloud = pointCloudManager.getPointCloud();
        if (currentPointCloud) {
            if (transformControls && transformControls.object === currentPointCloud) {
                transformControls.detach();
            }
            scene.remove(currentPointCloud);
        }

        // 重新创建原始点云
        const { points, confidences } = pointCloudManager.createPointCloudFromData(
            originalDepthData,
            originalConfidenceData,
            originalDitherData
        );

        pointCloudManager.createRealPointCloud(
            scene,
            points,
            confidences,
            transformControls,
            mouseControlEnabled
        );

        // 重置历史记录
        this.pointCloudHistory = [];
        this.currentPointCloudIndex = -1;

        return true;
    }

    /**
     * 获取当前索引
     */
    getCurrentIndex() {
        return this.currentPointCloudIndex;
    }

    /**
     * 获取历史记录长度
     */
    getHistoryLength() {
        return this.pointCloudHistory.length;
    }

    /**
     * 清空历史记录
     */
    clearHistory() {
        this.pointCloudHistory = [];
        this.currentPointCloudIndex = -1;
    }
}
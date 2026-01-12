/**
 * 点云管理模块
 * 负责点云的创建、更新和操作
 */

import { loadAndProcessImage } from './image_processor.js';

export class PointCloudManager {
    constructor() {
        this.pointCloud = null;
        this.pointCloudPosition = { x: 0, y: 0, z: 0 };
        this.pointCloudScale = 1.0;
        this.material_size_rate = 0.0003;
        this.pixelSpacing = 0.07;
        
        // 缩放相关变量
        this.isResampled = true;
        this.pendingScale = { x: 1.0, y: 1.0, z: 1.0 };
        this.sampledScale = { x: 1.0, y: 1.0, z: 1.0 };
        this.uniformScale = 1.0;
        this.transformScale = { x: 1.0, y: 1.0, z: 1.0 };
        
        // 原始数据
        this.originalDepthData = null;
        this.originalConfidenceData = null;
        this.originalDitherData = null;
        this.originalPointCloudData = null;
        this.originalPointCloudConfidences = null;
    }

    /**
     * 创建示例点云
     */
    createSamplePointCloud(scene, transformControls, mouseControlEnabled) {
        // 如果已有点云，先移除
        if (this.pointCloud) {
            // 如果TransformControls附加了该点云，先分离
            if (transformControls && transformControls.object === this.pointCloud) {
                transformControls.detach();
            }
            scene.remove(this.pointCloud);
        }

        // 生成示例点
        const points = [];
        const colors = [];
        const geometry = new THREE.BufferGeometry();

        // 创建一个简单的3D形状作为示例点云
        for (let i = 0; i < 5000; i++) {
            const x = (Math.random() - 0.5) * 2;
            const y = (Math.random() - 0.5) * 2;
            const z = (Math.random() - 0.5) * 2;

            // 创建一个球形点云
            const distance = Math.sqrt(x * x + y * y + z * z);
            const scale = 20;
            if (distance < 1.0 && distance > 0.8) {
                points.push(x * scale, y * scale, z * scale);

                // 设置为白色
                colors.push(1, 1, 1);
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: this.material_size_rate,  // 根据缩放率调整点大小（与缩放率成正比）
            vertexColors: true,
            transparent: true,
            opacity: 0.9
        });

        this.pointCloud = new THREE.Points(geometry, material);
        scene.add(this.pointCloud);

        // 如果鼠标控制已启用，附加TransformControls
        if (mouseControlEnabled && transformControls) {
            transformControls.attach(this.pointCloud);
        }

        return this.pointCloud;
    }

    /**
     * 更新点云位置
     */
    updatePointCloudPosition() {
        if (!this.pointCloud) return;

        // 更新位置
        this.pointCloud.position.set(
            this.pointCloudPosition.x,
            this.pointCloudPosition.y,
            this.pointCloudPosition.z
        );

        // 更新点的大小（与缩放率成正比）
        if (this.pointCloud.material) {
            this.pointCloud.material.size = this.material_size_rate * this.uniformScale;
        }
    }

    /**
     * 获取点云对象
     */
    getPointCloud() {
        return this.pointCloud;
    }

    /**
     * 获取点云位置
     */
    getPointCloudPosition() {
        return this.pointCloudPosition;
    }

    /**
     * 获取点云缩放
     */
    getPointCloudScale() {
        return this.pointCloudScale;
    }

    /**
     * 获取重采样状态
     */
    getResampleStatus() {
        return this.isResampled;
    }

    /**
     * 移动点云
     */
    movePointCloud(dx, dy, dz) {
        // 使用固定移动量，不随缩放级别变化
        const moveStep = 10.0 * this.pixelSpacing; // 增加移动步长，提高操作体验
        this.pointCloudPosition.x += dx * moveStep;
        this.pointCloudPosition.y += dy * moveStep;
        this.pointCloudPosition.z += dz * moveStep;
        this.updatePointCloudPosition();
    }

    /**
     * 更新点云缩放
     */
    updatePointCloudScale(scale, transformControls) {
        // 更新统一缩放值
        this.uniformScale = scale;

        // 更新重采样状态为未应用
        this.isResampled = false;

        if (this.pointCloud) {
            // 应用统一缩放（相对于重采样缩放）
            const effectiveScaleX = this.uniformScale / this.sampledScale.x;
            const effectiveScaleY = this.uniformScale / this.sampledScale.y;
            const effectiveScaleZ = this.uniformScale / this.sampledScale.z;
            const scaleX = this.transformScale.x * effectiveScaleX;
            const scaleY = this.transformScale.y * effectiveScaleY;
            const scaleZ = this.transformScale.z * effectiveScaleZ;
            this.pointCloud.scale.set(scaleX, scaleY, scaleZ);

            // 强制更新世界矩阵以确保变换立即生效
            this.pointCloud.updateMatrixWorld(true);
        }

        // 同步更新TransformControls的缩放敏感度
        if (transformControls && transformControls.object === this.pointCloud) {
            transformControls.setScaleSnap(scale * 0.1);
        }
    }

    /**
     * 执行重采样操作
     * @param {THREE.Scene} scene - Three.js场景对象
     * @param {TransformControls} transformControls - 变换控制器
     * @param {boolean} mouseControlEnabled - 是否启用鼠标控制
     * @returns {number} 重采样后生成的点数
     * @throws {Error} 当没有可重采样的点云数据或缺少原始数据时抛出错误
     */
    async applyResampling(scene, transformControls, mouseControlEnabled) {
        console.log('开始执行重采样操作');
        if (!this.pointCloud) {
            console.error('没有可重采样的点云数据');
            throw new Error('没有可重采样的点云数据');
        }

        if (!this.originalDepthData || !this.originalConfidenceData || !this.originalDitherData) {
            console.error('缺少原始数据，无法进行重采样', {
                hasDepthData: !!this.originalDepthData,
                hasConfidenceData: !!this.originalConfidenceData,
                hasDitherData: !!this.originalDitherData
            });
            throw new Error('缺少原始数据，无法进行重采样');
        }

        try {
            // 获取待应用的缩放值
            this.pendingScale.x = this.uniformScale * this.transformScale.x;
            this.pendingScale.y = this.uniformScale * this.transformScale.y;
            this.pendingScale.z = this.uniformScale * this.transformScale.z;
            console.log('计算待应用的缩放值:', this.pendingScale);

            // 获取原始图像尺寸（从原始数据推断）
            const originalSize = Math.sqrt(this.originalDepthData.length);
            const originalWidth = originalSize;
            const originalHeight = originalSize;
            console.log('原始图像尺寸:', { originalSize, originalWidth, originalHeight });

            // 计算目标尺寸
            const targetWidth = Math.floor(originalWidth * this.pendingScale.x);
            const targetHeight = Math.floor(originalHeight * this.pendingScale.y);
            console.log('目标尺寸:', { targetWidth, targetHeight });

            // 重新生成点云数据 - 使用改进的重采样方法
            const resampledData = await this.resamplePointCloudImproved(
                this.originalDepthData,
                this.originalConfidenceData,
                this.originalDitherData,
                targetWidth,
                targetHeight,
                this.pendingScale.z
            );
            console.log('点云数据重新生成完成，点数:', resampledData.points.length);

            console.log('使用重采样后的数据创建新的点云');
            // 使用重采样后的数据创建新的点云
            this.createPointCloudFromPoints(scene, resampledData.points, transformControls, mouseControlEnabled);

            // 更新重采样状态为已应用
            this.isResampled = true;

            // 记录当前重采样的缩放值
            this.sampledScale.x = this.pendingScale.x;
            this.sampledScale.y = this.pendingScale.y;
            this.sampledScale.z = this.pendingScale.z;
            
            // 重置统一缩放值为1.0，因为缩放已经被"烘焙"到数据中
            this.uniformScale = 1.0;
            return resampledData.points.length;
        } catch (error) {
            console.error('重采样过程中发生错误:', error);
            throw new Error(`重采样失败: ${error.message}`);
        }
    }

    /**
     * 重采样点云数据 - 改进版本
     * 使用image_processor提供的方法处理三种图像
     */
    async resamplePointCloudImproved(depthData, confidenceData, ditherData, targetWidth, targetHeight, depthScale) {
        console.log('输入参数:', { targetWidth, targetHeight, depthScale });
        
        // 获取过滤阈值
        const confidenceThreshold = parseFloat(document.getElementById('confidenceThreshold').value);

        // 假设原始数据是正方形的
        const originalSize = Math.sqrt(depthData.length);
        const originalWidth = originalSize;
        const originalHeight = originalSize;
        console.log('原始图像尺寸:', { originalSize, originalWidth, originalHeight });

        // 直接处理数据而不是通过图像转换，避免精度损失
        // 创建目标尺寸的数组
        const targetSize = targetWidth * targetHeight;
        const scaledDepthData = new Float32Array(targetSize);
        const scaledConfidenceData = new Float32Array(targetSize);
        
        // 计算缩放因子
        const scaleX = originalWidth / targetWidth;
        const scaleY = originalHeight / targetHeight;
        
        // 使用双线性插值进行重采样
        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                // 计算在原始图像中的位置
                const origX = x * scaleX;
                const origY = y * scaleY;
                
                // 获取最近的四个点
                const x1 = Math.floor(origX);
                const y1 = Math.floor(origY);
                const x2 = Math.min(x1 + 1, originalWidth - 1);
                const y2 = Math.min(y1 + 1, originalHeight - 1);
                
                // 计算权重
                const wx = origX - x1;
                const wy = origY - y1;
                
                // 边界检查
                if (x1 >= 0 && y1 >= 0 && x2 < originalWidth && y2 < originalHeight) {
                    // 双线性插值深度数据
                    const idx11 = y1 * originalWidth + x1;
                    const idx12 = y1 * originalWidth + x2;
                    const idx21 = y2 * originalWidth + x1;
                    const idx22 = y2 * originalWidth + x2;
                    
                    const depth11 = depthData[idx11];
                    const depth12 = depthData[idx12];
                    const depth21 = depthData[idx21];
                    const depth22 = depthData[idx22];
                    
                    const interpolatedDepth = 
                        depth11 * (1 - wx) * (1 - wy) +
                        depth12 * wx * (1 - wy) +
                        depth21 * (1 - wx) * wy +
                        depth22 * wx * wy;
                    
                    // 双线性插值置信度数据
                    const conf11 = confidenceData[idx11];
                    const conf12 = confidenceData[idx12];
                    const conf21 = confidenceData[idx21];
                    const conf22 = confidenceData[idx22];
                    
                    const interpolatedConf = 
                        conf11 * (1 - wx) * (1 - wy) +
                        conf12 * wx * (1 - wy) +
                        conf21 * (1 - wx) * wy +
                        conf22 * wx * wy;
                    
                    // 存储插值结果
                    const targetIdx = y * targetWidth + x;
                    scaledDepthData[targetIdx] = interpolatedDepth;
                    scaledConfidenceData[targetIdx] = interpolatedConf;
                } else {
                    // 边界外的点使用最近邻
                    const targetIdx = y * targetWidth + x;
                    const origIdx = Math.min(Math.floor(origY) * originalWidth + Math.floor(origX), depthData.length - 1);
                    scaledDepthData[targetIdx] = depthData[origIdx];
                    scaledConfidenceData[targetIdx] = confidenceData[origIdx];
                }
            }
        }
        
        // 处理Dither图 - 使用image_processor中的方法处理原始图像
        // 注意：这里应该使用原始图像而不是从ditherData生成的图像
        let scaledDitherData = null;
        try {
            // 尝试获取原始图像数据
            const app = window.app;
            if (app && (app.editedImageData || app.currentFile || app.originalImageData)) {
                let imageSource;
                let objectUrl = null;
                
                // 优先使用编辑后的图像数据
                // editedImageData是Blob对象而不是字符串，所以需要特殊处理
                if (app.editedImageData && app.editedImageData instanceof Blob) {
                    console.log('使用编辑后的图像数据');
                    try {
                        objectUrl = URL.createObjectURL(app.editedImageData);
                        imageSource = objectUrl;
                    } catch (error) {
                        console.error('创建编辑后图像的URL失败:', error);
                        imageSource = null;
                    }
                } else if (app.originalImageData && typeof app.originalImageData === 'string') {
                    console.log('使用原始图像数据');
                    imageSource = app.originalImageData;
                } else if (app.currentFile) {
                    console.log('使用当前文件');
                    try {
                        objectUrl = URL.createObjectURL(app.currentFile);
                        imageSource = objectUrl;
                    } catch (error) {
                        console.error('创建对象URL失败:', error);
                        imageSource = null;
                    }
                }
                
                if (imageSource) {
                    // 创建新的图像对象并等待其加载完成
                    const processedDither = await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = async () => {
                            try {
                                // 检查图像是否有效
                                if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                                    reject(new Error('图像尺寸无效'));
                                    return;
                                }
                                console.log('原始图像加载完成，尺寸:', { width: img.naturalWidth, height: img.naturalHeight });
                                
                                // 将图像添加到DOM中以确保其有效性
                                img.style.display = 'none';
                                document.body.appendChild(img);
                                
                                // 处理完成后移除图像
                                const cleanup = () => {
                                    if (img.parentNode) {
                                        document.body.removeChild(img);
                                    }
                                    if (objectUrl) {
                                        try {
                                            URL.revokeObjectURL(objectUrl);
                                        } catch (revokeError) {
                                            console.warn('释放对象URL时出错:', revokeError);
                                        }
                                    }
                                };
                                
                                try {
                                    const result = await loadAndProcessImage(img, {width: targetWidth, height: targetHeight}, false);
                                    cleanup();
                                    resolve(result);
                                } catch (error) {
                                    cleanup();
                                    reject(error);
                                }
                            } catch (error) {
                                if (img.parentNode) {
                                    document.body.removeChild(img);
                                }
                                if (objectUrl) {
                                    try {
                                        URL.revokeObjectURL(objectUrl);
                                    } catch (revokeError) {
                                        console.warn('释放对象URL时出错:', revokeError);
                                    }
                                }
                                reject(error);
                            }
                        };
                        img.onerror = () => {
                            if (img.parentNode) {
                                document.body.removeChild(img);
                            }
                            if (objectUrl) {
                                try {
                                    URL.revokeObjectURL(objectUrl);
                                } catch (revokeError) {
                                    console.warn('释放对象URL时出错:', revokeError);
                                }
                            }
                            reject(new Error('无法加载原始图像'));
                        };
                        img.src = imageSource;
                    });
                    
                    scaledDitherData = processedDither.ditheredBinary;
                    console.log('Dither图处理完成，尺寸:', {width: processedDither.width, height: processedDither.height});
                }
            }
        } catch (error) {
            console.error('处理原始图像时出错:', error);
        }
        
        // 如果无法获取原始图像，回退到原来的方法
        if (!scaledDitherData) {
            console.log('无法获取原始图像，回退到原来的方法处理Dither数据');
            // 创建一个基于原始dither数据缩放的版本
            scaledDitherData = this.scaleDitherDataFallback(
                this.originalDitherData || ditherData,
                originalWidth,
                originalHeight,
                targetWidth,
                targetHeight
            );
        }

        // 从重采样后的数据中提取值并生成点云
        const points = [];
        const cx = targetWidth / 2;
        const cy = targetHeight / 2;

        let validPoints = 0;
        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                const idx = y * targetWidth + x;
                
                // 直接使用重采样后的浮点数据，避免精度损失
                const scaledDepthValue = scaledDepthData[idx];
                const scaledConfidenceValue = scaledConfidenceData[idx];

                // 检查有效性 - 添加对scaledDitherData的检查
                if (scaledDitherData && 
                    ((Array.isArray(scaledDitherData) && scaledDitherData[y] && scaledDitherData[y][x] !== 0) ||
                     (scaledDitherData instanceof Uint8Array && scaledDitherData[idx] !== 0)) &&
                    scaledConfidenceValue >= confidenceThreshold &&
                    scaledDepthValue > 0) {

                    // 生成固定间距的坐标
                    const pointX = (x - cx) * this.pixelSpacing;
                    const pointY = (y - cy) * this.pixelSpacing;
                    const pointZ = scaledDepthValue * depthScale; // 应用深度缩放

                    points.push(pointX, pointY, pointZ);
                    validPoints++;
                }
            }
        }
        
        console.log(`点云生成完成，有效点数: ${validPoints}`);

        return {
            points: points
        };
    }

    /**
     * 当无法获取原始图像时，使用此方法回退处理Dither数据
     */
    scaleDitherDataFallback(originalDitherData, originalWidth, originalHeight, targetWidth, targetHeight) {
        if (!originalDitherData) {
            console.warn('原始Dither数据为空');
            return null;
        }

        try {
            // 创建目标尺寸的dither数据
            const scaledDitherData = new Uint8Array(targetWidth * targetHeight);
            
            // 计算缩放因子
            const scaleX = originalWidth / targetWidth;
            const scaleY = originalHeight / targetHeight;
            
            // 使用最近邻插值缩放dither数据
            for (let y = 0; y < targetHeight; y++) {
                for (let x = 0; x < targetWidth; x++) {
                    // 计算在原始数据中的位置
                    const origX = Math.min(Math.floor(x * scaleX), originalWidth - 1);
                    const origY = Math.min(Math.floor(y * scaleY), originalHeight - 1);
                    
                    // 计算索引
                    const origIdx = origY * originalWidth + origX;
                    const targetIdx = y * targetWidth + x;
                    
                    // 复制值
                    scaledDitherData[targetIdx] = originalDitherData[origIdx];
                }
            }
            
            console.log('Dither数据回退处理完成');
            return scaledDitherData;
        } catch (error) {
            console.error('Dither数据回退处理失败:', error);
            return null;
        }
    }

    /**
     * 重采样点云数据
     */
    resamplePointCloud(depthData, confidenceData, ditherData, targetWidth, targetHeight, depthScale) {
        // 获取过滤阈值
        const confidenceThreshold = parseFloat(document.getElementById('confidenceThreshold').value);

        // 假设原始数据是正方形的
        const originalSize = Math.sqrt(depthData.length);

        // 计算采样步长
        const stepX = originalSize / targetWidth;
        const stepY = originalSize / targetHeight;

        // 生成新的点云
        const points = [];

        const cx = targetWidth / 2;
        const cy = targetHeight / 2;

        // 重采样生成点云
        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                // 计算在原始数据中的位置
                const origX = Math.floor(x * stepX);
                const origY = Math.floor(y * stepY);

                // 边界检查
                if (origX >= originalSize || origY >= originalSize) continue;

                // 计算索引
                const idx = origY * originalSize + origX;

                // 检查有效性
                if (ditherData[idx] !== 0 &&
                    confidenceData[idx] >= confidenceThreshold &&
                    depthData[idx] > 0) {

                    // 生成固定间距的坐标
                    const pointX = (x - cx) * this.pixelSpacing;
                    const pointY = (y - cy) * this.pixelSpacing;
                    const pointZ = depthData[idx] * depthScale; // 应用深度缩放

                    points.push(pointX, pointY, pointZ);
                }
            }
        }

        return {
            points: points
        };
    }

    /**
     * 根据重采样后的点云数据创建点云对象
     */
    createPointCloudFromPoints(scene, points, transformControls, mouseControlEnabled) {
        // 如果已有点云，先移除
        if (this.pointCloud) {
            // 如果TransformControls附加了该点云，先分离
            if (transformControls && transformControls.object === this.pointCloud) {
                transformControls.detach();
            }
            scene.remove(this.pointCloud);
        }

        // 检查points数据结构
        if (!points || points.length === 0) {
            throw new Error('没有可用的点云数据');
        }

        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];

        // 处理点云数据
        for (let i = 0; i < points.length; i += 3) {
            positions.push(points[i], points[i + 1], points[i + 2]);

            // 设置为白色
            colors.push(1, 1, 1);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: this.material_size_rate * this.pointCloudScale,  // 根据缩放率调整点大小（与缩放率成正比）
            vertexColors: true,
            transparent: true,
            opacity: 0.9
        });

        this.pointCloud = new THREE.Points(geometry, material);

        // 应用180度旋转
        this.pointCloud.rotation.x = Math.PI;

        scene.add(this.pointCloud);
        this.updatePointCloudPosition();

        // 强制更新世界矩阵以确保所有变换立即生效
        this.pointCloud.updateMatrixWorld(true);

        // 如果鼠标控制已启用，重新附加TransformControls
        if (mouseControlEnabled && transformControls) {
            transformControls.attach(this.pointCloud);
        }

        return this.pointCloud;
    }

    /**
     * 根据深度图、置信度图和抖动掩码生成点云
     */
    createPointCloudFromData(depthData, confidenceData, ditherData, intrinsicData = null) {
        try {
            // 保存原始数据用于重采样
            this.originalDepthData = depthData.data.slice(); // 创建副本
            this.originalConfidenceData = confidenceData.data.slice();
            this.originalDitherData = ditherData.data.slice();

            // 重置缩放状态
            this.uniformScale = 1.0;
            this.sampledScale.x = 1.0;
            this.sampledScale.y = 1.0;
            this.sampledScale.z = 1.0;
            this.pendingScale.x = 1.0;
            this.pendingScale.y = 1.0;
            this.pendingScale.z = 1.0;
            this.isResampled = true;

            // 提取数据
            const depthMap = depthData.data;
            const depthShape = depthData.shape;
            const confidenceMap = confidenceData.data;
            const confidenceShape = confidenceData.shape;
            const ditherMask = ditherData.data;
            const ditherShape = ditherData.shape;

            console.log('深度图形状:', depthShape);
            console.log('置信度图形状:', confidenceShape);
            console.log('抖动掩码形状:', ditherShape);

            // 确保所有数据具有相同的形状
            if (depthShape[0] !== confidenceShape[0] || depthShape[1] !== confidenceShape[1] ||
                depthShape[0] !== ditherShape[0] || depthShape[1] !== ditherShape[1]) {
                throw new Error('深度图、置信度图和抖动掩码的尺寸不匹配');
            }

            const height = depthShape[0];
            const width = depthShape[1];

            // 获取过滤阈值
            const confidenceThreshold = parseFloat(document.getElementById('confidenceThreshold').value);

            // 存储点云数据
            const points = [];
            const confidences = [];

            // 获取相机内参
            let fx, fy, cx, cy;
            if (intrinsicData && intrinsicData.shape && intrinsicData.shape.length >= 2) {
                // 从相机内参矩阵中提取参数
                const intrinsic = intrinsicData.data;
                const intrinsicShape = intrinsicData.shape;

                // 假设内参矩阵是3x3的形式，以9个元素的形式存储
                if (intrinsic.length >= 9) {
                    fx = intrinsic[0];  // fx = intrinsic[0, 0]
                    fy = intrinsic[4];  // fy = intrinsic[1, 1]

                    // cx cy 会变化不采用内参
                    cx = width / 2;
                    cy = height / 2;
                } else {
                    // 使用默认参数
                    fx = fy = 1000;
                    cx = width / 2;
                    cy = height / 2;
                }
            } else {
                // 使用默认参数
                fx = fy = 1000;
                cx = width / 2;
                cy = height / 2;
            }

            console.log(`相机参数: fx=${fx}, fy=${fy}, cx=${cx}, cy=${cy}`);

            // 生成点云 - 使用类型化数组避免栈溢出
            // 预估最大点数（最坏情况：所有像素都有效）
            const maxPoints = height * width;
            const positions = new Float32Array(maxPoints * 3); // 存储x,y,z坐标
            const pointConfidences = new Float32Array(maxPoints); // 存储置信度

            let pointCount = 0; // 实际有效的点数

            // 单层循环遍历所有像素，提高性能
            for (let idx = 0; idx < height * width; idx++) {
                // 检查抖动掩码、置信度和深度值的有效性
                if (ditherMask[idx] !== 0 &&
                    confidenceMap[idx] >= confidenceThreshold &&
                    depthMap[idx] > 0) {

                    // 计算像素坐标
                    const u = idx % width;
                    const v = Math.floor(idx / width);

                    // 获取深度值
                    const depth = depthMap[idx];

                    // 将像素坐标转换为3D坐标 
                    const x = (u - cx) * this.pixelSpacing;
                    const y = (v - cy) * this.pixelSpacing;
                    const z = depth;

                    // 直接存储到类型化数组中
                    positions[pointCount * 3] = x;
                    positions[pointCount * 3 + 1] = y;
                    positions[pointCount * 3 + 2] = z;
                    pointConfidences[pointCount] = confidenceMap[idx];

                    pointCount++;
                }
            }

            // 如果没有有效点
            if (pointCount === 0) {
                throw new Error('没有符合阈值条件的点');
            }

            // 创建最终的points数组，只包含有效点
            for (let i = 0; i < pointCount; i++) {
                points.push([
                    positions[i * 3],
                    positions[i * 3 + 1],
                    positions[i * 3 + 2]
                ]);
            }

            // 创建最终的confidences数组，只包含有效点
            for (let i = 0; i < pointCount; i++) {
                confidences.push(pointConfidences[i]);
            }

            console.log(`共生成 ${points.length} 个点`);

            if (points.length === 0) {
                throw new Error('没有符合阈值条件的点');
            }

            // 保存原始点云数据
            this.originalPointCloudData = new Float32Array(pointCount * 3);
            this.originalPointCloudConfidences = new Float32Array(pointCount);
            
            for (let i = 0; i < pointCount; i++) {
                this.originalPointCloudData[i * 3] = points[i][0];
                this.originalPointCloudData[i * 3 + 1] = points[i][1];
                this.originalPointCloudData[i * 3 + 2] = points[i][2];
                this.originalPointCloudConfidences[i] = confidences[i];
            }

            return { points, confidences };

        } catch (error) {
            console.error('从数据生成点云时出错:', error);
            throw error;
        }
    }

    /**
     * 创建真实的点云
     */
    createRealPointCloud(scene, points, confidences = null, transformControls, mouseControlEnabled) {
        // 如果已有点云，先移除
        if (this.pointCloud) {
            // 如果TransformControls附加了该点云，先分离
            if (transformControls && transformControls.object === this.pointCloud) {
                transformControls.detach();
            }
            scene.remove(this.pointCloud);
        }

        // 检查points数据结构
        if (!points || points.length === 0) {
            throw new Error('没有可用的点云数据');
        }

        // 根据当前置信度阈值过滤点
        const confidenceThreshold = parseFloat(document.getElementById('confidenceThreshold').value);
        const validPoints = [];
        const validConfidences = [];

        for (let i = 0; i < points.length; i++) {
            const currentConfidence = confidences ? confidences[i] : 1.0;
            if (currentConfidence >= confidenceThreshold) {
                validPoints.push(points[i]);
                validConfidences.push(currentConfidence);
            }
        }

        // 如果没有有效点
        if (validPoints.length === 0) {
            throw new Error('没有符合阈值条件的点');
        }

        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];

        // 处理点云数据
        for (let i = 0; i < validPoints.length; i++) {
            const point = validPoints[i];
            positions.push(point[0], point[1], point[2]);

            // 设置为白色
            colors.push(1, 1, 1);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: this.material_size_rate * this.uniformScale,  // 根据统一缩放率调整点大小（与缩放率成正比）
            vertexColors: true,
            transparent: true,
            opacity: 0.9
        });

        this.pointCloud = new THREE.Points(geometry, material);

        // 应用180度旋转
        this.pointCloud.rotation.x = Math.PI;

        // 应用当前的缩放（相对于重采样缩放）
        const effectiveScaleX = this.uniformScale / this.sampledScale.x;
        const effectiveScaleY = this.uniformScale / this.sampledScale.y;
        const effectiveScaleZ = this.uniformScale / this.sampledScale.z;
        const scaleX = this.transformScale.x * effectiveScaleX;
        const scaleY = this.transformScale.y * effectiveScaleY;
        const scaleZ = this.transformScale.z * effectiveScaleZ;
        this.pointCloud.scale.set(scaleX, scaleY, scaleZ);

        scene.add(this.pointCloud);
        this.updatePointCloudPosition();

        // 强制更新世界矩阵以确保所有变换立即生效
        this.pointCloud.updateMatrixWorld(true);

        // 如果鼠标控制已启用，重新附加TransformControls
        if (mouseControlEnabled && transformControls) {
            transformControls.attach(this.pointCloud);
        }

        return this.pointCloud;
    }

    /**
     * 裁剪点云
     */
    clipPointCloud(scene, crystalBoxDimensions, transformControls, mouseControlEnabled) {
        if (!this.pointCloud) {
            throw new Error('没有可裁剪的点云');
        }

        // 检查是否需要重采样
        if (!this.isResampled) {
            throw new Error('检测到缩放操作但未应用重采样，请先点击"应用重采样"按钮');
        }

        // 保存当前点云的变换信息
        const currentPosition = {
            x: this.pointCloud.position.x,
            y: this.pointCloud.position.y,
            z: this.pointCloud.position.z
        };

        const currentScale = {
            x: this.pointCloud.scale.x,
            y: this.pointCloud.scale.y,
            z: this.pointCloud.scale.z
        };

        const currentQuaternion = {
            x: this.pointCloud.quaternion.x,
            y: this.pointCloud.quaternion.y,
            z: this.pointCloud.quaternion.z,
            w: this.pointCloud.quaternion.w
        };

        // 获取水晶框尺寸
        const width = crystalBoxDimensions.width;
        const height = crystalBoxDimensions.height;
        const depth = crystalBoxDimensions.depth;

        // 计算水晶框边界（以点云中心为基准）
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const halfDepth = depth / 2;

        // 获取点云的几何数据
        const positions = this.pointCloud.geometry.attributes.position.array;
        const colors = this.pointCloud.geometry.attributes.color ?
            this.pointCloud.geometry.attributes.color.array : null;

        // 创建新的点数组
        const clippedPoints = [];
        const clippedColors = [];

        // 创建旋转矩阵（180度绕X轴旋转）
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationX(Math.PI);

        // 遍历所有点，检查是否在水晶框内
        for (let i = 0; i < positions.length; i += 3) {
            // 获取点的原始坐标
            const point = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);

            // 应用点云的完整变换（旋转、缩放、位置）
            point.applyMatrix4(rotationMatrix);
            point.x = point.x * currentScale.x + currentPosition.x;
            point.y = point.y * currentScale.y + currentPosition.y;
            point.z = point.z * currentScale.z + currentPosition.z;

            // 检查点是否在水晶框内
            if (point.x >= -halfWidth && point.x <= halfWidth &&
                point.y >= -halfHeight && point.y <= halfHeight &&
                point.z >= -halfDepth && point.z <= halfDepth) {
                // 保留在框内的点
                clippedPoints.push(positions[i], positions[i + 1], positions[i + 2]);

                // 如果有颜色数据，也保留颜色
                if (colors) {
                    clippedColors.push(colors[i], colors[i + 1], colors[i + 2]);
                } else {
                    // 默认白色
                    clippedColors.push(1, 1, 1);
                }
            }
        }

        // 如果没有点在框内
        if (clippedPoints.length === 0) {
            throw new Error('裁剪后没有点保留在框内');
        }

        // 创建新的几何体
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(clippedPoints, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(clippedColors, 3));

        // 创建新的材质，保持当前的点大小设置
        const material = new THREE.PointsMaterial({
            size: this.material_size_rate, // 保持原有的缩放系数
            vertexColors: true,
            transparent: true,
            opacity: 0.9
        });

        // 移除旧的点云
        if (transformControls && transformControls.object === this.pointCloud) {
            transformControls.detach();
        }
        scene.remove(this.pointCloud);

        // 创建新的点云
        this.pointCloud = new THREE.Points(geometry, material);
        this.pointCloud.rotation.x = Math.PI; // 应用180度旋转

        // 恢复之前的位置和缩放
        this.pointCloud.position.set(currentPosition.x, currentPosition.y, currentPosition.z);
        this.pointCloud.scale.set(currentScale.x, currentScale.y, currentScale.z);
        this.pointCloud.quaternion.set(currentQuaternion.x, currentQuaternion.y, currentQuaternion.z, currentQuaternion.w);
        scene.add(this.pointCloud);

        // 更新全局变量
        this.pointCloudPosition.x = currentPosition.x;
        this.pointCloudPosition.y = currentPosition.y;
        this.pointCloudPosition.z = currentPosition.z;

        // 更新transformScale变量
        this.transformScale.x = currentScale.x;
        this.transformScale.y = currentScale.y;
        this.transformScale.z = currentScale.z;

        // 裁剪后重置重采样状态
        this.isResampled = true;

        // 如果鼠标控制已启用，重新附加TransformControls
        if (mouseControlEnabled && transformControls) {
            transformControls.attach(this.pointCloud);
        }

        return clippedPoints.length / 3;
    }

    /**
     * 设置重采样状态
     */
    setResampleStatus(status) {
        this.isResampled = status;
    }
}
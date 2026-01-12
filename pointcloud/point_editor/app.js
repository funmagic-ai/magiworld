/**
 * 主应用模块
 * 整合所有模块并处理模块间的通信与依赖
 */

// 导入所有模块
import { SceneManager } from './scene_manager.js';
import { PointCloudManager } from './pointcloud_manager.js';
import { UIManager } from './ui_manager.js';
import { TextManager } from './text_manager.js';
import { ExportManager } from './export_manager.js';
import { HistoryManager } from './history_manager.js';


class PointCloudApp {
    constructor() {
        // 初始化所有管理器
        this.sceneManager = new SceneManager();
        this.pointCloudManager = new PointCloudManager();
        this.uiManager = new UIManager();
        this.textManager = new TextManager();
        this.exportManager = new ExportManager();
        this.historyManager = new HistoryManager();

        // 应用状态变量
        this.currentFile = null;
        this.mouseControlEnabled = false;
        this.cropper = null;
        this.isEditingImage = false;
        this.editedImageData = null;
        this.originalImageData = null;
        this.crystalBox = null;
        this.projectFile = null; // 添加项目文件变量
    }

    /**
     * 初始化应用
     */
    init() {
        // 获取场景容器
        const container = document.getElementById('scene-container');
        if (!container) {
            console.error('无法找到场景容器');
            return;
        }

        // 初始化场景
        const { scene, camera, renderer, controls, transformControls } = this.sceneManager.initScene(container);

        // 保存引用
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;
        this.transformControls = transformControls;

        // 创建示例点云
        this.pointCloudManager.createSamplePointCloud(this.scene, this.transformControls, this.mouseControlEnabled);

        // 创建水晶框
        this.createCrystalBox();

        // 绑定事件监听器
        this.bindEventListeners();

        // 初始大小调整
        this.onWindowResize();

        // 更新UI初始状态
        this.uiManager.updateConfidenceValue();
        this.uiManager.updateBrightnessLevelValue();
        this.uiManager.updatePointCloudScaleDisplay(1.0);

        console.log('PointCloudApp 初始化完成');
    }

    /**
     * 绑定事件监听器
     */
    bindEventListeners() {
        // 获取元素 - 使用可选链安全绑定事件，无需提前报错
        const uploadArea = document.getElementById('uploadArea');
        const imageUpload = document.getElementById('imageUpload');
        const removeImage = document.getElementById('removeImage');
        const toggleMouseControlBtn = document.getElementById('toggleMouseControl');

        // 绑定事件监听器
        document.getElementById('generateBtn')?.addEventListener('click', () => {
            this.generatePointCloud();
        });
        document.getElementById('updateCrystalBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.createCrystalBox();
            return false;
        });
        document.getElementById('clipPointCloudBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.clipPointCloud();
            return false;
        });
        document.getElementById('restorePreviousBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.restorePreviousPointCloud();
            return false;
        });
        document.getElementById('restoreOriginalBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.restoreOriginalPointCloud();
            return false;
        });
        document.getElementById('pointCloudScale')?.addEventListener('input', (e) => {
            e.preventDefault();
            this.updatePointCloudScale(e);
        });
        document.getElementById('resampleBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.applyResampling();
            return false;
        });
        document.getElementById('addTextBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.addText();
            return false;
        });
        document.getElementById('exportBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.exportDXF();
            return false;
        });

        // 添加导出项目按钮事件监听器
        document.getElementById('exportProjectBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.exportProject();
            return false;
        });

        // 添加导入项目按钮事件监听器
        document.getElementById('importProjectBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.importProject();
            return false;
        });

        // 添加项目文件选择事件
        document.getElementById('projectFileInput')?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.projectFile = e.target.files[0];
                this.uiManager.updateStatus(`已选择项目文件: ${this.projectFile.name}`, 'success');
            }
        });

        // 参数控制
        document.getElementById('confidenceThreshold')?.addEventListener('input', (e) => {
            e.preventDefault();
            this.uiManager.updateConfidenceValue();
            // 如果已有原始点云数据，则重新渲染点云（基于原始数据重新过滤）
            if (this.pointCloudManager.originalPointCloudData && this.pointCloudManager.originalPointCloudConfidences) {
                // 重新创建点云，应用新的置信度阈值
                this.recreatePointCloudWithConfidence();
            }
        });

        // 亮度等级控制
        document.getElementById('brightnessLevel')?.addEventListener('input', (e) => {
            e.preventDefault();
            this.uiManager.updateBrightnessLevelValue();
        });

        // 移动按钮事件
        document.getElementById('moveUpBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.pointCloudManager.movePointCloud(0, 1, 0);
            return false;
        });
        document.getElementById('moveDownBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.pointCloudManager.movePointCloud(0, -1, 0);
            return false;
        });
        document.getElementById('moveLeftBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.pointCloudManager.movePointCloud(-1, 0, 0);
            return false;
        });
        document.getElementById('moveRightBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.pointCloudManager.movePointCloud(1, 0, 0);
            return false;
        });
        document.getElementById('moveForwardBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.pointCloudManager.movePointCloud(0, 0, -1);
            return false;
        });
        document.getElementById('moveBackwardBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.pointCloudManager.movePointCloud(0, 0, 1);
            return false;
        });

        // 鼠标控制切换
        toggleMouseControlBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleMouseControl();
            return false;
        });

        // 键盘控制事件
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));

        // 文件上传处理
        if (uploadArea && imageUpload) {
            uploadArea.addEventListener('click', () => {
                imageUpload.click();
            });
        }
        
        // 浏览按钮事件
        const browseBtn = document.querySelector('.browse-btn');
        if (browseBtn && imageUpload) {
            browseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                imageUpload.click();
            });
        }

        // 文件选择事件
        if (imageUpload) {
            imageUpload.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.currentFile = e.target.files[0];
                    // 重置所有与旧图片相关的数据
                    this.originalImageData = null;
                    this.editedImageData = null;
                    this.uiManager.showImagePreview(this.currentFile);
                    this.uiManager.updateStatus(`已选择文件: ${this.currentFile.name}`, 'success');
                }
            });
        }

        // 图片编辑按钮事件
        document.getElementById('editImageBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleImageEdit();
            return false;
        });

        // 拖拽事件
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleFileDrop(e);
        });

        // 移除图片事件
        removeImage.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.uiManager.hideImagePreview();
            this.uiManager.updateStatus('已移除图片', 'success');
            return false;
        });

        // 窗口大小调整事件
        window.addEventListener('resize', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.onWindowResize();
        });

        // TransformControls事件监听
        this.transformControls.addEventListener("objectChange", (e) => {
            if (this.pointCloudManager.getPointCloud()) {
                const pointCloud = this.pointCloudManager.getPointCloud();
                const position = this.pointCloudManager.getPointCloudPosition();
                position.x = Math.round(pointCloud.position.x / this.pointCloudManager.pixelSpacing) * this.pointCloudManager.pixelSpacing;
                position.y = Math.round(pointCloud.position.y / this.pointCloudManager.pixelSpacing) * this.pointCloudManager.pixelSpacing;
                position.z = pointCloud.position.z;
                // 同步更新TransformControls独立轴缩放值
                this.pointCloudManager.transformScale.x = pointCloud.scale.x / this.pointCloudManager.uniformScale;
                this.pointCloudManager.transformScale.y = pointCloud.scale.y / this.pointCloudManager.uniformScale;
                this.pointCloudManager.transformScale.z = pointCloud.scale.z / this.pointCloudManager.uniformScale;
            }
        });

        // 监听拖拽结束事件，保存变换结果到历史记录
        this.transformControls.addEventListener("mouseUp", (e) => {
            if (this.pointCloudManager.getPointCloud()) {
                const pointCloud = this.pointCloudManager.getPointCloud();
                const position = this.pointCloudManager.getPointCloudPosition();
                // 更新位置信息
                position.x = pointCloud.position.x;
                position.y = pointCloud.position.y;
                position.z = pointCloud.position.z;

                // 同步更新TransformControls独立轴缩放值
                this.pointCloudManager.transformScale.x = pointCloud.scale.x / this.pointCloudManager.uniformScale;
                this.pointCloudManager.transformScale.y = pointCloud.scale.y / this.pointCloudManager.uniformScale;
                this.pointCloudManager.transformScale.z = pointCloud.scale.z / this.pointCloudManager.uniformScale;
                // 保存到历史记录
                this.historyManager.saveToHistory(pointCloud);
            }
        });
    }

    /**
     * 创建水晶框
     */
    createCrystalBox() {
        // 如果已有水晶框，先移除
        if (this.crystalBox) {
            this.scene.remove(this.crystalBox);
        }

        // 获取尺寸
        const dimensions = this.uiManager.getCrystalBoxDimensions();
        const width = dimensions.width;
        const height = dimensions.height;
        const depth = dimensions.depth;

        const geometry = new THREE.BoxGeometry(width, height, depth);
        const edges = new THREE.EdgesGeometry(geometry);
        this.crystalBox = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x00ffff })
        );
        this.crystalBox.material.transparent = true;
        this.crystalBox.material.opacity = 0.7;
        this.scene.add(this.crystalBox);
    }

    /**
     * 生成点云 - 调用API
     */
    generatePointCloud() {
        if (!this.currentFile && !this.editedImageData) {
            this.uiManager.updateStatus('请先选择或编辑一张图片', 'error');
            return;
        }

        this.uiManager.updateStatus('正在生成点云...', 'processing');

        const formData = new FormData();

        // 优先使用编辑后的图片数据
        if (this.editedImageData) {
            formData.append('image', this.editedImageData, 'edited_image.jpg');
        } else if (this.currentFile) {
            formData.append('image', this.currentFile);
        } else {
            this.uiManager.updateStatus('没有可用的图片数据', 'error');
            return;
        }

        // 调用API获取文件ID
        fetch('http://localhost:5001/pointcloud', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data || !data.file_id) {
                throw new Error('无效的响应数据格式');
            }

            this.uiManager.updateStatus(`数据处理完成！正在下载深度图数据...`, 'processing');

            // 使用文件ID下载点云数据
            return fetch(`http://localhost:5001/pointcloud/data/${data.file_id}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(jsonData => {
                    // 创建模拟的NPZ数据结构，手动展平数组以避免栈溢出
                    const parsedData = {
                        depth_map: {
                            data: new Float32Array(this.flattenArray(jsonData.depth_map)),
                            shape: jsonData.depth_map_shape
                        },
                        confidence_map: {
                            data: new Float32Array(this.flattenArray(jsonData.confidence_map)),
                            shape: jsonData.confidence_map_shape
                        },
                        dither_mask: {
                            data: new Uint8Array(this.flattenArray(jsonData.dither_mask)),
                            shape: jsonData.dither_mask_shape
                        },
                        intrinsic: {
                            data: new Float32Array(this.flattenArray(jsonData.intrinsic)),
                            shape: jsonData.intrinsic_shape
                        }
                    };

                    // 生成点云
                    const { points, confidences } = this.pointCloudManager.createPointCloudFromData(
                        parsedData.depth_map,
                        parsedData.confidence_map,
                        parsedData.dither_mask,
                        parsedData.intrinsic  // 传递相机内参
                    );

                    // 创建点云对象
                    this.pointCloudManager.createRealPointCloud(
                        this.scene,
                        points,
                        confidences,
                        this.transformControls,
                        this.mouseControlEnabled
                    );

                    // 保存到历史记录
                    this.historyManager.saveToHistory(this.pointCloudManager.getPointCloud());

                    this.uiManager.updateStatus(`点云生成完成！`, 'success');

                    // 可选：清理服务端文件
                    fetch(`http://localhost:5001/pointcloud/cleanup/${data.file_id}`, {
                        method: 'DELETE'
                    }).catch(error => {
                        console.warn('清理服务端文件时出错:', error);
                    });
                });
        })
        .catch(error => {
            console.error('生成点云时出错:', error);
            this.uiManager.updateStatus(`生成点云失败: ${error.message}`, 'error');
        });
    }

    /**
     * 手动展平多维数组以避免栈溢出
     */
    flattenArray(arr) {
        const result = [];
        const stack = [arr];

        while (stack.length > 0) {
            const current = stack.pop();

            if (Array.isArray(current)) {
                // 从后往前添加到栈中，以保持原始顺序
                for (let i = current.length - 1; i >= 0; i--) {
                    stack.push(current[i]);
                }
            } else {
                result.push(current);
            }
        }

        return result;
    }

    /**
     * 根据当前置信度阈值重新创建点云
     */
    recreatePointCloudWithConfidence() {
        if (!this.pointCloudManager.originalPointCloudData || !this.pointCloudManager.originalPointCloudConfidences) return;

        // 获取当前置信度阈值
        const confidenceThreshold = this.uiManager.getConfidenceThreshold();

        // 从原始数据创建点和置信度数组
        const points = [];

        // 从原始点云数据中提取点坐标和置信度
        for (let i = 0; i < this.pointCloudManager.originalPointCloudData.length; i += 3) {
            const pointIndex = i / 3;

            // 检查置信度是否满足阈值
            if (this.pointCloudManager.originalPointCloudConfidences[pointIndex] >= confidenceThreshold) {
                points.push([
                    this.pointCloudManager.originalPointCloudData[i],
                    this.pointCloudManager.originalPointCloudData[i + 1],
                    this.pointCloudManager.originalPointCloudData[i + 2]
                ]);
            }
        }

        try {
            // 使用createRealPointCloud重新创建点云
            this.pointCloudManager.createRealPointCloud(
                this.scene,
                points,
                null, // confidences will be generated in the function
                this.transformControls,
                this.mouseControlEnabled
            );

            // 保存到历史记录
            this.historyManager.saveToHistory(this.pointCloudManager.getPointCloud());

            this.uiManager.updateStatus(`点云已根据置信度阈值重新生成！共 ${points.length} 个点`, 'success');
        } catch (error) {
            console.error('重新创建点云时出错:', error);
            this.uiManager.updateStatus('重新创建点云失败: ' + error.message, 'error');
        }
    }

    /**
     * 更新点云缩放
     */
    updatePointCloudScale(event) {
        const scale = parseFloat(event.target.value);
        this.uiManager.updatePointCloudScaleDisplay(scale);
        this.pointCloudManager.updatePointCloudScale(scale, this.transformControls);
    }

    /**
     * 执行重采样操作
     */
    async applyResampling() {
        console.log('开始执行重采样操作（应用层面）');
        this.uiManager.updateStatus('正在执行重采样...', 'processing');
        
        try {
            console.log('调用pointCloudManager.applyResampling');
            const pointCount = await this.pointCloudManager.applyResampling(
                this.scene,
                this.transformControls,
                this.mouseControlEnabled
            );
            console.log('pointCloudManager.applyResampling执行完成，点数:', pointCount);

            // 保存到历史记录
            console.log('保存到历史记录');
            this.historyManager.saveToHistory(this.pointCloudManager.getPointCloud());

            console.log('更新状态为成功');
            this.uiManager.updateStatus(`重采样完成！采样点数：${pointCount}`, 'success');
            console.log('重采样操作完全完成');
        } catch (error) {
            console.error('重采样过程中发生错误:', error);
            this.uiManager.updateStatus(`重采样失败: ${error.message}`, 'error');
        }
    }

    /**
     * 添加文字
     */
    addText() {
        const textValue = document.getElementById('textInput').value;
        if (!textValue) {
            this.uiManager.updateStatus('请输入文字内容', 'error');
            return;
        }

        try {
            // 获取选中的字体
            const selectedFont = document.getElementById('fontSelector').value;

            // 添加文字
            const textObj = this.textManager.addText(
                textValue,
                selectedFont,
                this.scene,
                this.transformControls,
                this.mouseControlEnabled
            );

            // 创建文字元素的视觉表示
            const textItem = this.textManager.createTextElement(textValue, this.textManager.getTexts().length - 1);
            textObj.element = textItem;
            document.getElementById('textList').appendChild(textItem);

            // 清空输入框
            document.getElementById('textInput').value = '';
            this.uiManager.updateStatus(`已添加文字: ${textValue} (字体: ${selectedFont})`, 'success');

        } catch (error) {
            console.error('添加文字时出错:', error);
            this.uiManager.updateStatus('添加文字时出错: ' + error.message, 'error');
        }
    }

    /**
     * 裁剪点云
     */
    clipPointCloud() {
        try {
            const dimensions = this.uiManager.getCrystalBoxDimensions();
            const pointCount = this.pointCloudManager.clipPointCloud(
                this.scene,
                dimensions,
                this.transformControls,
                this.mouseControlEnabled
            );

            // 保存裁剪后的状态到历史记录
            this.historyManager.saveToHistory(this.pointCloudManager.getPointCloud());

            this.uiManager.updateStatus(`点云裁剪完成！保留 ${pointCount} 个点`, 'success');
        } catch (error) {
            this.uiManager.updateStatus(error.message, 'error');
        }
    }

    /**
     * 恢复上一步点云
     */
    restorePreviousPointCloud() {
        try {
            const result = this.historyManager.restorePreviousPointCloud(
                this.scene,
                this.pointCloudManager,
                this.pointCloudManager.originalDepthData,
                this.pointCloudManager.originalConfidenceData,
                this.pointCloudManager.originalDitherData,
                this.transformControls,
                this.mouseControlEnabled
            );

            if (result) {
                this.uiManager.updateStatus('已恢复到上一步点云状态', 'success');
            }
        } catch (error) {
            this.uiManager.updateStatus(error.message, 'error');
        }
    }

    /**
     * 恢复原始点云
     */
    restoreOriginalPointCloud() {
        try {
            const result = this.historyManager.restoreOriginalPointCloud(
                this.scene,
                this.pointCloudManager,
                this.pointCloudManager.originalDepthData,
                this.pointCloudManager.originalConfidenceData,
                this.pointCloudManager.originalDitherData,
                this.transformControls,
                this.mouseControlEnabled
            );

            if (result) {
                this.uiManager.updateStatus('已恢复到原始点云状态', 'success');
            }
        } catch (error) {
            this.uiManager.updateStatus(error.message, 'error');
        }
    }

    /**
     * 导出DXF文件
     */
    exportDXF() {
        this.uiManager.updateStatus('正在导出DXF文件...', 'processing');

        if (!this.pointCloudManager.getPointCloud()) {
            this.uiManager.updateStatus('没有可导出的点云数据', 'error');
            return;
        }

        // 检查是否需要重采样
        if (!this.pointCloudManager.getResampleStatus()) {
            this.uiManager.updateStatus('检测到缩放操作但未应用重采样，请先点击"应用重采样"按钮', 'error');
            return;
        }

        try {
            console.log('开始导出DXF文件...');

            // 直接导出当前点云数据（确保应用所有效果包括裁剪）
            const brightnessLevel = this.uiManager.getBrightnessLevel();
            const positions = this.exportManager.exportCurrentPointCloud(
                this.pointCloudManager.getPointCloud(),
                this.textManager.getTexts(),
                brightnessLevel,
                this.pointCloudManager.pixelSpacing,
            );

            // 使用新的DXF导出功能
            this.exportManager.exportToDXF(positions, 'pointcloud.dxf');
            this.uiManager.updateStatus('DXF文件导出完成！', 'success');
            console.log('DXF文件导出完成');

        } catch (error) {
            console.error('导出DXF时出错:', error);
            this.uiManager.updateStatus('导出DXF文件时出错: ' + error.message, 'error');
        }
    }

    /**
     * 收集项目数据用于导出
     */
    async collectProjectData() {
        const projectData = {
            // 基本信息
            version: '1.0',
            exportDate: new Date().toISOString(),
            
            // 点云数据
            pointCloud: null,
            
            // 文字数据
            texts: [],
            
            // UI设置
            uiSettings: {
                confidenceThreshold: this.uiManager.getConfidenceThreshold(),
                brightnessLevel: this.uiManager.getBrightnessLevel(),
                crystalBoxDimensions: this.uiManager.getCrystalBoxDimensions(),
                pointCloudScale: parseFloat(document.getElementById('pointCloudScale')?.value || 1.0)
            },
            
            // 点云管理器状态
            pointCloudManagerState: {
                pointCloudPosition: this.pointCloudManager.getPointCloudPosition(),
                pointCloudScale: this.pointCloudManager.getPointCloudScale(),
                pixelSpacing: this.pointCloudManager.pixelSpacing,
                uniformScale: this.pointCloudManager.uniformScale,
                transformScale: this.pointCloudManager.transformScale,
                isResampled: this.pointCloudManager.getResampleStatus(),
                // 添加原始数据用于重采样
                originalDepthData: this.pointCloudManager.originalDepthData,
                originalConfidenceData: this.pointCloudManager.originalConfidenceData,
                originalDitherData: this.pointCloudManager.originalDitherData
            },
            
            // 原始数据（如果存在）
            originalData: {
                depthData: this.pointCloudManager.originalDepthData,
                confidenceData: this.pointCloudManager.originalConfidenceData,
                ditherData: this.pointCloudManager.originalDitherData
            },
            
            // 原始图像数据（如果存在）
            originalImageData: this.originalImageData,
            currentFile: this.currentFile ? {
                name: this.currentFile.name,
                type: this.currentFile.type,
                size: this.currentFile.size
            } : null,
            editedImageData: this.editedImageData ? true : false // 只标记是否存在编辑后的图像
        };

        // 如果有currentFile但没有originalImageData，尝试读取文件内容
        if (this.currentFile && !this.originalImageData) {
            try {
                const dataUrl = await this.fileToDataUrl(this.currentFile);
                projectData.originalImageData = dataUrl;
            } catch (error) {
                console.error('无法读取原始图像文件:', error);
            }
        }

        // 如果有editedImageData，读取编辑后的图像内容
        if (this.editedImageData) {
            try {
                const dataUrl = await this.blobToDataUrl(this.editedImageData);
                projectData.editedImageData = dataUrl;
            } catch (error) {
                console.error('无法读取编辑后的图像文件:', error);
                projectData.editedImageData = true; // 回退到标记模式
            }
        }

        // 收集点云数据
        if (this.pointCloudManager.getPointCloud()) {
            const pointCloud = this.pointCloudManager.getPointCloud();
            projectData.pointCloud = {
                positions: Array.from(pointCloud.geometry.attributes.position.array),
                colors: pointCloud.geometry.attributes.color ? 
                    Array.from(pointCloud.geometry.attributes.color.array) : null,
                position: {
                    x: pointCloud.position.x,
                    y: pointCloud.position.y,
                    z: pointCloud.position.z
                },
                scale: {
                    x: pointCloud.scale.x,
                    y: pointCloud.scale.y,
                    z: pointCloud.scale.z
                },
                rotation: {
                    x: pointCloud.rotation.x,
                    y: pointCloud.rotation.y,
                    z: pointCloud.rotation.z
                }
            };
        }

        // 收集文字数据
        const texts = this.textManager.getTexts();
        for (const textObj of texts) {
            projectData.texts.push({
                value: textObj.value,
                font: textObj.textObject.options.font,
                position: textObj.textObject.options.position,
                size: textObj.textObject.options.size,
                color: textObj.textObject.options.color
            });
        }

        return projectData;
    }

    /**
     * 将File对象转换为DataURL
     */
    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * 将Blob对象转换为DataURL
     */
    blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }

    /**
     * 导出完整项目文件
     */
    async exportProject() {
        this.uiManager.updateStatus('正在导出项目文件...', 'processing');

        try {
            // 收集项目数据
            const projectData = await this.collectProjectData();
            
            // 导出项目数据
            this.exportManager.exportProject(projectData, 'pointcloud_project.json');
            
            this.uiManager.updateStatus('项目文件导出完成！', 'success');
        } catch (error) {
            console.error('导出项目时出错:', error);
            this.uiManager.updateStatus('导出项目文件时出错: ' + error.message, 'error');
        }
    }

    /**
     * 导入项目文件
     */
    importProject() {
        if (!this.projectFile) {
            // 创建文件选择输入框
            const fileInput = document.getElementById('projectFileInput') || document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'projectFileInput';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            
            // 添加change事件监听器
            fileInput.onchange = (e) => {
                if (e.target.files.length > 0) {
                    this.projectFile = e.target.files[0];
                    this.processProjectImport();
                }
            };
            
            document.body.appendChild(fileInput);
            fileInput.click();
            return;
        }
        
        this.processProjectImport();
    }

    /**
     * 处理项目导入
     */
    processProjectImport() {
        if (!this.projectFile) {
            this.uiManager.updateStatus('请选择一个项目文件', 'error');
            return;
        }

        this.uiManager.updateStatus('正在导入项目文件...', 'processing');

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target.result;
                const projectData = this.exportManager.importProject(jsonString);
                
                // 应用导入的项目数据
                this.applyImportedProjectData(projectData);
                
                this.uiManager.updateStatus('项目导入完成！', 'success');
            } catch (error) {
                console.error('导入项目时出错:', error);
                this.uiManager.updateStatus('导入项目文件时出错: ' + error.message, 'error');
            }
        };
        
        reader.onerror = () => {
            this.uiManager.updateStatus('读取项目文件时出错', 'error');
        };
        
        reader.readAsText(this.projectFile);
    }

    /**
     * 应用导入的项目数据
     */
    applyImportedProjectData(projectData) {
        // 检查项目数据版本
        if (projectData.version !== '1.0') {
            console.warn('项目文件版本不匹配，可能会出现兼容性问题');
        }

        // 恢复UI设置
        if (projectData.uiSettings) {
            const ui = projectData.uiSettings;
            document.getElementById('confidenceThreshold').value = ui.confidenceThreshold || 0.3;
            document.getElementById('brightnessLevel').value = ui.brightnessLevel || 3;
            document.getElementById('pointCloudScale').value = ui.pointCloudScale || 1.0;
            
            // 更新UI显示
            this.uiManager.updateConfidenceValue();
            this.uiManager.updateBrightnessLevelValue();
            this.uiManager.updatePointCloudScaleDisplay(ui.pointCloudScale || 1.0);
            
            // 更新水晶框尺寸
            if (ui.crystalBoxDimensions) {
                document.getElementById('crystalWidth').value = ui.crystalBoxDimensions.width || 80;
                document.getElementById('crystalHeight').value = ui.crystalBoxDimensions.height || 100;
                document.getElementById('crystalDepth').value = ui.crystalBoxDimensions.depth || 50;
                this.createCrystalBox();
            }
        }

        // 恢复点云管理器状态
        if (projectData.pointCloudManagerState) {
            const state = projectData.pointCloudManagerState;
            this.pointCloudManager.pixelSpacing = state.pixelSpacing || 0.07;
            this.pointCloudManager.uniformScale = state.uniformScale || 1.0;
            this.pointCloudManager.transformScale = state.transformScale || { x: 1.0, y: 1.0, z: 1.0 };
            this.pointCloudManager.isResampled = state.isResampled !== undefined ? state.isResampled : true;
            
            // 恢复原始数据（用于重采样）
            if (state.originalDepthData) {
                this.pointCloudManager.originalDepthData = state.originalDepthData;
            }
            if (state.originalConfidenceData) {
                this.pointCloudManager.originalConfidenceData = state.originalConfidenceData;
            }
            if (state.originalDitherData) {
                this.pointCloudManager.originalDitherData = state.originalDitherData;
            }
        }

        // 恢复原始图像数据
        if (projectData.originalImageData && typeof projectData.originalImageData === 'string') {
            this.originalImageData = projectData.originalImageData;
            // 显示预览图像
            const previewImage = document.getElementById('previewImage');
            if (previewImage) {
                previewImage.src = this.originalImageData;
            }
        }
        
        if (projectData.currentFile) {
            this.currentFile = projectData.currentFile;
        }
        
        // 恢复编辑后的图像数据
        if (projectData.editedImageData && typeof projectData.editedImageData === 'string') {
            // 创建Blob URL
            try {
                // 这里我们只保存数据URL，在需要时再创建Blob
                this.editedImageData = projectData.editedImageData;
            } catch (error) {
                console.error('无法恢复编辑后的图像数据:', error);
            }
        } else if (projectData.editedImageData === true) {
            // 标记存在编辑后的图像，但实际数据需要用户重新选择文件
            console.log('项目包含编辑后的图像数据，需要重新选择原始文件');
        }

        // 恢复点云数据
        if (projectData.pointCloud) {
            const pc = projectData.pointCloud;
            
            // 创建点云几何体
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(pc.positions, 3));
            if (pc.colors) {
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(pc.colors, 3));
            }

            // 创建点云材质
            const material = new THREE.PointsMaterial({
                size: this.pointCloudManager.material_size_rate,
                vertexColors: !!pc.colors,
                transparent: true,
                opacity: 0.9
            });

            // 创建点云对象
            const pointCloud = new THREE.Points(geometry, material);
            
            // 设置位置、缩放和旋转
            pointCloud.position.set(pc.position.x, pc.position.y, pc.position.z);
            pointCloud.scale.set(pc.scale.x, pc.scale.y, pc.scale.z);
            pointCloud.rotation.set(pc.rotation.x, pc.rotation.y, pc.rotation.z);
            
            // 如果已有点云，先移除
            if (this.pointCloudManager.getPointCloud()) {
                if (this.transformControls.object === this.pointCloudManager.getPointCloud()) {
                    this.transformControls.detach();
                }
                this.scene.remove(this.pointCloudManager.getPointCloud());
            }
            
            // 添加新点云到场景
            this.scene.add(pointCloud);
            this.pointCloudManager.pointCloud = pointCloud;
            this.pointCloudManager.pointCloudPosition = { ...pc.position };
            
            // 如果鼠标控制已启用，附加TransformControls
            if (this.mouseControlEnabled && this.transformControls) {
                this.transformControls.attach(pointCloud);
            }
            
            // 保存到历史记录
            this.historyManager.saveToHistory(pointCloud);
        }

        // 恢复文字数据
        if (projectData.texts && projectData.texts.length > 0) {
            // 清除现有文字
            const textList = document.getElementById('textList');
            if (textList) {
                textList.innerHTML = '';
            }
            this.textManager.clearTexts();
            
            // 添加导入的文字
            for (const textData of projectData.texts) {
                try {
                    // 创建文字对象
                    const textObject = new TextObject(textData.value, {
                        size: textData.size,
                        position: textData.position,
                        color: textData.color,
                        font: textData.font
                    });
                    
                    // 设置场景引用
                    textObject.setScene(this.scene);
                    
                    // 添加到场景
                    this.scene.add(textObject.getMesh());
                    
                    // 如果鼠标控制已启用，附加TransformControls到新添加的文字对象
                    if (this.mouseControlEnabled && this.transformControls) {
                        this.transformControls.attach(textObject.getMesh());
                    }
                    
                    // 保存到texts数组
                    const textObj = {
                        id: Date.now() + Math.random(), // 生成唯一ID
                        value: textData.value,
                        textObject: textObject,
                        element: null,
                        transformControls: this.transformControls,
                        mouseControlEnabled: this.mouseControlEnabled
                    };
                    
                    this.textManager.texts.push(textObj);
                    
                    // 创建文字元素的视觉表示
                    const textItem = this.textManager.createTextElement(textData.value, this.textManager.getTexts().length - 1);
                    textObj.element = textItem;
                    if (textList) {
                        textList.appendChild(textItem);
                    }
                } catch (error) {
                    console.error('恢复文字时出错:', error);
                }
            }
        }
        
        // 更新UI显示
        if (this.originalImageData || this.editedImageData) {
            const imagePreview = document.getElementById('imagePreview');
            const uploadArea = document.getElementById('uploadArea');
            const editImageBtn = document.getElementById('editImageBtn');
            
            if (imagePreview) imagePreview.style.display = 'block';
            if (uploadArea) uploadArea.style.display = 'none';
            if (editImageBtn) editImageBtn.style.display = 'block';
        }
    }

    /**
     * 切换鼠标控制
     */
    toggleMouseControl() {
        this.mouseControlEnabled = !this.mouseControlEnabled;
        this.uiManager.updateMouseControlStatus(this.mouseControlEnabled);

        if (this.mouseControlEnabled) {
            // 禁用OrbitControls，启用TransformControls
            this.controls.enabled = false;
            if (this.pointCloudManager.getPointCloud()) {
                this.transformControls.attach(this.pointCloudManager.getPointCloud());
            }
        } else {
            // 启用OrbitControls，禁用TransformControls
            this.controls.enabled = true;
            if (this.transformControls.object) {
                this.transformControls.detach();
            }
        }

        // 更新鼠标样式
        this.uiManager.updatePointCloudCursor(this.renderer, this.mouseControlEnabled, this.pointCloudManager.getPointCloud());
    }

    /**
     * 处理键盘按下事件
     */
    handleKeyDown(event) {
        // 只有当焦点不在输入框上时才响应键盘事件
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            // 如果TransformControls已启用，处理其键盘控制
            if (this.mouseControlEnabled && this.transformControls) {
                switch (event.key) {
                    case 'q':
                    case 'Q':
                        this.transformControls.setMode("translate");
                        event.preventDefault();
                        break;
                    case 'w':
                    case 'W':
                        this.transformControls.setMode("rotate");
                        event.preventDefault();
                        break;
                    case 'e':
                    case 'E':
                        this.transformControls.setMode("scale");
                        event.preventDefault();
                        break;
                    case 'x':
                    case 'X':
                        this.transformControls.showX = !this.transformControls.showX;
                        event.preventDefault();
                        break;
                    case 'y':
                    case 'Y':
                        this.transformControls.showY = !this.transformControls.showY;
                        event.preventDefault();
                        break;
                    case 'z':
                    case 'Z':
                        this.transformControls.showZ = !this.transformControls.showZ;
                        event.preventDefault();
                }
            } else {
                // 原有的键盘控制点云移动
                switch (event.key) {
                    case 'ArrowUp':
                        this.pointCloudManager.movePointCloud(0, 1, 0);
                        event.preventDefault();
                        break;
                    case 'ArrowDown':
                        this.pointCloudManager.movePointCloud(0, -1, 0);
                        event.preventDefault();
                        break;
                    case 'ArrowLeft':
                        this.pointCloudManager.movePointCloud(-1, 0, 0);
                        event.preventDefault();
                        break;
                    case 'ArrowRight':
                        this.pointCloudManager.movePointCloud(1, 0, 0);
                        event.preventDefault();
                    case 'w':
                    case 'W':
                        this.pointCloudManager.movePointCloud(0, 0, -1);
                        event.preventDefault();
                        break;
                    case 's':
                    case 'S':
                        this.pointCloudManager.movePointCloud(0, 0, 1);
                        event.preventDefault();
                    case 'a':
                    case 'A':
                        this.pointCloudManager.movePointCloud(-1, 0, 0);
                        event.preventDefault();
                    case 'd':
                    case 'D':
                        this.pointCloudManager.movePointCloud(1, 0, 0);
                        event.preventDefault();
                }
            }
        }
    }

    /**
     * 处理文件选择
     */
    handleFileSelect(e) {
        if (e.target.files.length > 0) {
            this.currentFile = e.target.files[0];
            // 重置原始图片数据
            this.originalImageData = null;
            this.uiManager.showImagePreview(this.currentFile);
            this.uiManager.updateStatus(`已选择文件: ${this.currentFile.name}`, 'success');
        }
    }

    /**
     * 切换图片编辑模式
     */
    toggleImageEdit() {
        const previewImage = document.getElementById('previewImage');

        if (!this.isEditingImage) {
            // 开始编辑
            if (this.cropper) {
                this.cropper.destroy();
            }

            // 始终基于原始图片创建cropper，如果没有原始图片数据则使用当前图片
            if (this.originalImageData) {
                previewImage.src = this.originalImageData;
            }

            // 确保图片已加载完成再初始化cropper
            const initCropper = () => {
                this.cropper = new Cropper(previewImage, {
                    aspectRatio: 1, // 正方形裁剪
                    viewMode: 0,    // 允许裁剪框超出图片边界
                    dragMode: 'move',
                    autoCropArea: 0.8,
                    restore: false,
                    guides: true,
                    center: true,
                    highlight: true,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleDragModeOnDblclick: true,
                    ready: function () {
                        // 获取图片的自然尺寸
                        const image = this.cropper.image;
                        const naturalWidth = image.naturalWidth;
                        const naturalHeight = image.naturalHeight;

                        // 获取容器尺寸
                        const containerData = this.cropper.getContainerData();
                        const containerWidth = containerData.width;
                        const containerHeight = containerData.height;

                        // 计算正方形裁剪框的尺寸（取容器的较小边）
                        const cropBoxSize = Math.min(containerWidth, containerHeight) * 0.8; // 80% 的容器大小

                        // 计算缩放比例，使图片的长边等于裁剪框的边长
                        const scale = cropBoxSize / Math.max(naturalWidth, naturalHeight);

                        // 设置图片的缩放
                        this.cropper.zoomTo(scale);

                        // 设置裁剪框大小
                        this.cropper.setCropBoxData({
                            width: cropBoxSize,
                            height: cropBoxSize
                        });
                    }
                });
            };

            // 检查图片是否已经加载完成
            if (previewImage.complete && previewImage.naturalWidth !== 0) {
                initCropper();
            } else {
                previewImage.onload = () => {
                    initCropper();
                };
                
                previewImage.onerror = (err) => {
                    console.error('图片加载失败:', err);
                    this.uiManager.updateStatus('图片加载失败，无法编辑', 'error');
                };
            }

            this.isEditingImage = true;
            document.getElementById('editImageBtn').textContent = '完成';
            this.uiManager.updateStatus('正在编辑图片，拖拽移动图片，滚轮缩放，调整裁剪框，完成后点击"完成"按钮', 'success');
        } else {
            // 完成编辑
            if (this.cropper) {
                // 获取裁剪后的图片数据
                const canvas = this.cropper.getCroppedCanvas({
                    width: 518 * 4,
                    height: 518 * 4,
                    fillColor: '#ffffff' // 设置填充颜色为白色
                });

                // 显示编辑后的图片
                previewImage.src = canvas.toDataURL('image/jpeg', 0.9);

                canvas.toBlob((blob) => {
                    this.editedImageData = blob;
                    this.uiManager.updateStatus('图片编辑完成', 'success');
                }, 'image/jpeg', 0.9);

                this.cropper.destroy();
                this.cropper = null;
            }

            this.isEditingImage = false;
            document.getElementById('editImageBtn').textContent = '编辑';
        }
    }


    /**
     * 窗口大小调整事件处理
     */
    onWindowResize() {
        this.sceneManager.onWindowResize();
    }
}

// 创建应用实例并初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已经存在app实例，避免重复初始化
    if (window.app) {
        console.warn('应用实例已存在，跳过初始化');
        return;
    }
    
    window.app = new PointCloudApp();
    window.textManager = window.app.textManager; // 使textManager全局可访问
    window.app.init();
});

// 导出模块供其他模块使用
export { PointCloudApp };
/**
 * UI管理模块
 * 负责处理所有用户界面交互
 */

export class UIManager {
    constructor() {
        this.currentStatus = '';
    }

    /**
     * 更新状态信息
     */
    updateStatus(message, type = '') {
        const status = document.getElementById('status');
        if (status) {
            status.textContent = message;
            status.className = 'status ' + type;
            this.currentStatus = message;
        }
    }

    /**
     * 更新置信度显示
     */
    updateConfidenceValue() {
        const confidenceThreshold = document.getElementById('confidenceThreshold');
        const confidenceValue = document.getElementById('confidenceValue');
        if (confidenceThreshold && confidenceValue) {
            confidenceValue.textContent = parseFloat(confidenceThreshold.value).toFixed(2);
        }
    }

    /**
     * 获取置信度阈值
     */
    getConfidenceThreshold() {
        const confidenceThreshold = document.getElementById('confidenceThreshold');
        return confidenceThreshold ? parseFloat(confidenceThreshold.value) : 0.3;
    }

    /**
     * 更新亮度等级显示
     */
    updateBrightnessLevelValue() {
        const brightnessLevel = document.getElementById('brightnessLevel');
        const brightnessLevelValue = document.getElementById('brightnessLevelValue');
        if (brightnessLevel && brightnessLevelValue) {
            brightnessLevelValue.textContent = brightnessLevel.value;
        }
    }

    /**
     * 获取亮度等级
     */
    getBrightnessLevel() {
        const brightnessLevel = document.getElementById('brightnessLevel');
        return brightnessLevel ? parseInt(brightnessLevel.value) : 3;
    }

    /**
     * 显示图片预览
     */
    showImagePreview(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewImage = document.getElementById('previewImage');
                const imagePreview = document.getElementById('imagePreview');
                const uploadArea = document.getElementById('uploadArea');
                const editImageBtn = document.getElementById('editImageBtn');

                if (previewImage) previewImage.src = e.target.result;
                if (imagePreview) imagePreview.style.display = 'block';
                if (uploadArea) uploadArea.style.display = 'none';

                // 显示编辑按钮
                if (editImageBtn) {
                    editImageBtn.style.display = 'block';
                }

                resolve(e.target.result);
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * 隐藏图片预览
     */
    hideImagePreview() {
        const imagePreview = document.getElementById('imagePreview');
        const uploadArea = document.getElementById('uploadArea');
        const imageUpload = document.getElementById('imageUpload');
        const editImageBtn = document.getElementById('editImageBtn');

        if (imagePreview) imagePreview.style.display = 'none';
        if (uploadArea) uploadArea.style.display = 'block';
        if (imageUpload) imageUpload.value = '';
        if (editImageBtn) editImageBtn.style.display = 'none';
    }

    /**
     * 获取水晶框尺寸
     */
    getCrystalBoxDimensions() {
        const width = parseFloat(document.getElementById('crystalWidth')?.value) || 80;
        const height = parseFloat(document.getElementById('crystalHeight')?.value) || 100;
        const depth = parseFloat(document.getElementById('crystalDepth')?.value) || 50;
        return { width, height, depth };
    }

    /**
     * 更新点云缩放显示
     */
    updatePointCloudScaleDisplay(scale) {
        const pointCloudScale = document.getElementById('pointCloudScale');
        const pointCloudScaleValue = document.getElementById('pointCloudScaleValue');
        if (pointCloudScale && pointCloudScaleValue) {
            pointCloudScaleValue.textContent = parseFloat(scale).toFixed(2);
        }
    }

    /**
     * 更新鼠标控制状态显示
     */
    updateMouseControlStatus(enabled) {
        const status = document.getElementById('mouseControlStatus');
        if (status) {
            status.textContent = enabled ? '当前状态: 启用' : '当前状态: 禁用';
            status.className = 'status ' + (enabled ? 'enabled' : '');
        }
    }

    /**
     * 更新点云光标样式
     */
    updatePointCloudCursor(renderer, mouseControlEnabled, pointCloud) {
        if (renderer && renderer.domElement) {
            if (mouseControlEnabled && pointCloud) {
                renderer.domElement.style.cursor = 'pointer';
            } else {
                renderer.domElement.style.cursor = 'default';
            }
        }
    }
}
/**
 * 文字对象生成模块
 * 用于创建和管理3D文字对象
 */

class TextObject {
    /**
     * 创建文字对象
     * @param {string} text - 要显示的文字
     * @param {Object} options - 配置选项
     */
    constructor(text, options = {}) {
        this.text = text;
        this.options = {
            size: options.size || 1,
            height: options.height || 0.1,
            curveSegments: options.curveSegments || 12,
            position: options.position || { x: 0, y: 0, z: 0 },
            color: options.color || 0xffffff,
            font: options.font || 'Arial',  // 添加字体选项，默认为Arial
            ...options
        };
        
        this.mesh = null;
        this.createTextObject();
    }
    
    /**
     * 创建文字对象（使用Canvas纹理而不是依赖字体文件）
     */
    createTextObject() {
        // 创建一个组来包含所有字符
        const group = new THREE.Group();
        
        // 为整个文字创建一个canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 设置高分辨率
        canvas.width = 4096;
        canvas.height = 512;
        
        // 设置背景透明
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 设置文字样式，使用指定的字体
        ctx.font = `bold 256px ${this.options.font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.text, canvas.width / 2, canvas.height / 2);
        
        // 创建纹理
        const texture = new THREE.CanvasTexture(canvas);
        
        // 创建材质
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        // 创建平面几何体
        const geometry = new THREE.PlaneGeometry(this.options.size * (this.text.length * 0.5), this.options.size);
        
        // 创建网格对象
        const mesh = new THREE.Mesh(geometry, material);
        
        // 添加到组中
        group.add(mesh);
        
        // 设置位置
        group.position.set(
            this.options.position.x,
            this.options.position.y,
            this.options.position.z
        );
        
        this.mesh = group;
    }
    
    /**
     * 获取文字对象
     * @returns {THREE.Group} 文字组对象
     */
    getMesh() {
        return this.mesh;
    }
    
    /**
     * 获取文字对象的点云数据（用于DXF导出）
     * @returns {Array} 点云位置数据 [x1, y1, z1, x2, y2, z2, ...]
     */
    getPointCloudData() {
        const positions = [];
        
        // 为文字创建点云表示
        // 创建一个canvas来获取文字形状
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 4096;  // 提高分辨率以获得更清晰的文字
        canvas.height = 1024;
        
        // 绘制文字，使用指定的字体
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';  // 透明背景
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `bold 256px ${this.options.font}`;  // 使用指定的字体
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText(this.text, canvas.width / 2, canvas.height / 2);
        
        // 读取像素数据并生成点云
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 计算文字在3D空间中的实际尺寸
        // 这应该与createTextObject中创建的平面几何体尺寸一致
        const width = this.options.size * (this.text.length * 0.5);
        const height = this.options.size;
        
        // 采样步长，控制点云密度 (减小步长以增加密度)
        const step = 1;  // 从2减小到1以增加点云密度
        
        // 获取文字对象的世界矩阵，用于正确变换点云坐标
        const worldMatrix = this.mesh ? this.mesh.matrixWorld : new THREE.Matrix4().makeTranslation(
            this.options.position.x,
            this.options.position.y,
            this.options.position.z
        );
        
        // 创建与主点云相同的变换矩阵（包括180度X轴旋转、缩放和位置）
        const fullTransform = new THREE.Matrix4();
        
        // 应用180度X轴旋转
        const rotationMatrix = new THREE.Matrix4().makeRotationX(Math.PI);
        
        // 应用缩放
        const scaleMatrix = new THREE.Matrix4().makeScale(1, 1, 1); // 如果需要缩放可以修改这里的值
        
        // 应用位置偏移（如果需要额外的位置偏移）
        const positionMatrix = new THREE.Matrix4();
        
        // 组合变换矩阵
        // fullTransform.multiply(rotationMatrix);
        fullTransform.multiply(worldMatrix);
        
        for (let y = 0; y < canvas.height; y += step) {
            for (let x = 0; x < canvas.width; x += step) {
                const index = (y * canvas.width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                
                // 检查是否为白色像素（文字部分）
                if (r > 200 && g > 200 && b > 200) {
                    // 将2D坐标转换为3D坐标，保持与3D场景中文字大小一致
                    // 将Canvas坐标映射到文字平面的3D坐标
                    let px = ((x / canvas.width) - 0.5) * width;
                    let py = (0.5 - (y / canvas.height)) * height;
                    let pz = 0;
                    
                    // 创建一个三维向量
                    const point = new THREE.Vector3(px, py, pz);
                    
                    // 应用完整变换矩阵
                    point.applyMatrix4(fullTransform);
                    
                    positions.push(point.x, point.y, point.z);
                }
            }
        }
        
        return positions;
    }
    
    /**
     * 更新文字对象位置
     * @param {Object} position - 新的位置 {x, y, z}
     */
    setPosition(position) {
        if (this.mesh) {
            this.mesh.position.set(position.x, position.y, position.z);
            this.options.position = { ...position };
        }
    }
    
    /**
     * 获取文字对象位置
     * @returns {Object} 当前位置 {x, y, z}
     */
    getPosition() {
        if (this.mesh) {
            return {
                x: this.mesh.position.x,
                y: this.mesh.position.y,
                z: this.mesh.position.z
            };
        }
        return { ...this.options.position };
    }
    
    /**
     * 更新文字内容
     * @param {string} newText - 新的文字内容
     */
    updateText(newText) {
        this.text = newText;
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        this.createTextObject();
    }
    
    /**
     * 设置颜色
     * @param {number} color - 新的颜色值 (十六进制)
     */
    setColor(color) {
        this.options.color = color;
        this.updateText(this.text);
    }
    
    /**
     * 设置大小
     * @param {number} size - 新的大小
     */
    setSize(size) {
        this.options.size = size;
        this.updateText(this.text);
    }
    
    /**
     * 设置字体
     * @param {string} font - 新的字体
     */
    setFont(font) {
        this.options.font = font;
        this.updateText(this.text);
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TextObject };
}
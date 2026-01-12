/**
 * 文字对象生成模块
 * 用于创建和管理3D文字对象
 */

export class TextObject {
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
        this.scene = null; // 保存场景引用
        this.createTextObject();
    }
    
    /**
     * 设置场景引用
     * @param {THREE.Scene} scene - Three.js场景对象
     */
    setScene(scene) {
        this.scene = scene;
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
        canvas.width = 2048;
        canvas.height = 512;
        
        // 设置背景透明
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 设置文字样式，使用指定的字体
        ctx.font = `Bold 256px ${this.options.font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.text, canvas.width / 2, canvas.height / 2);
        
        // 创建纹理
        const texture = new THREE.CanvasTexture(canvas);
        texture.premultiplyAlpha = true; // 预乘alpha以获得更好的透明度效果
        
        // 创建材质，使用透明度测试避免黑色背景
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.1, // 丢弃透明度低于0.1的像素
            depthWrite: true // 确保正确的深度写入
        });
        
        // 创建平面几何体，使用更合理的尺寸计算方式
        const geometry = new THREE.PlaneGeometry(this.options.size, this.options.size * 0.3);
        
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
        
        // 如果有场景引用，将新创建的mesh添加到场景中
        if (this.scene) {
            this.scene.add(this.mesh);
        }
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
        canvas.width = 2048;  // 调整分辨率以匹配新的采样策略
        canvas.height = 512;
        
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
        
        // 获取文字对象的世界矩阵，用于正确变换点云坐标
        const worldMatrix = this.mesh ? this.mesh.matrixWorld : new THREE.Matrix4().makeTranslation(
            this.options.position.x,
            this.options.position.y,
            this.options.position.z
        );
        
        // 计算文字在3D空间中的实际尺寸
        const width = this.options.size;
        const height = this.options.size * 0.3;
        
        // 固定点之间的间隔为0.07单位
        const pointSpacing = 0.07;
        
        // 根据固定的点间隔计算采样步长
        const sampleStepX = Math.max(1, Math.floor((canvas.width * pointSpacing) / width));
        const sampleStepY = Math.max(1, Math.floor((canvas.height * pointSpacing) / height));
        
        // 遍历像素数据生成点云
        for (let y = 0; y < canvas.height; y += sampleStepY) {
            for (let x = 0; x < canvas.width; x += sampleStepX) {
                const index = (y * canvas.width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3];
                
                // 如果像素不透明，则添加点
                if (a > 128) {
                    // 将canvas坐标转换为3D坐标
                    // 计算文字在3D空间中的实际尺寸
                    const width = this.options.size;
                    const height = this.options.size * 0.3;
                    
                    // 将Canvas坐标映射到文字平面的3D坐标
                    let px = ((x / canvas.width) - 0.5) * width;
                    let py = (0.5 - (y / canvas.height)) * height;
                    let pz = 0;
                    
                    // 创建一个三维向量
                    const point = new THREE.Vector3(px, py, pz);
                    
                    // 应用完整的世界变换矩阵
                    point.applyMatrix4(worldMatrix);
                    
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
     * 获取世界矩阵
     * @returns {THREE.Matrix4} 世界变换矩阵
     */
    getWorldMatrix() {
        if (this.mesh) {
            return this.mesh.matrixWorld;
        }
        // 返回单位矩阵
        return new THREE.Matrix4();
    }
    
    /**
     * 获取位置
     * @returns {Object} 位置对象 {x, y, z}
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
        // 保存当前位置
        const position = this.getPosition();
        
        // 保存场景引用
        const scene = this.scene;
        
        // 如果mesh已经添加到场景中，先从场景中移除
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        
        this.text = newText;
        this.createTextObject();
        
        // 恢复位置
        this.setPosition(position);
        
        // 如果之前有场景引用，确保新mesh也添加到场景中
        if (scene && this.mesh) {
            scene.add(this.mesh);
        }
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
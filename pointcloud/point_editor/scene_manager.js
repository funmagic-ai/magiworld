/**
 * 场景管理模块
 * 负责Three.js场景的初始化和基本管理
 */

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.transformControls = null;
        this.axesHelper = null;
        this.material_size_rate = 0.0003;
    }

    initScene(container) {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // 创建相机
        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.z = 200;

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setClearColor(0x000000, 1);
        container.appendChild(this.renderer.domElement);

        // 添加光源
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);

        // 添加控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        // 默认启用控制器
        this.controls.enabled = true;

        // 添加变换控制器
        this.transformControls = new THREE.TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.setMode("translate"); // 设置为移动模式
        this.transformControls.setSize(0.75); // 设置控件大小
        this.transformControls.addEventListener("dragging-changed", (event) => {
            this.controls.enabled = !event.value;
        });

        // 设置TransformControls的敏感度
        this.transformControls.setTranslationSnap(0.1);
        this.transformControls.setRotationSnap(Math.PI / 36); // 5度
        this.transformControls.setScaleSnap(0.1);
        this.scene.add(this.transformControls);

        // 添加坐标轴辅助
        this.axesHelper = new THREE.AxesHelper(5);
        this.scene.add(this.axesHelper);

        // 开始渲染循环
        this.animate();

        return {
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer,
            controls: this.controls,
            transformControls: this.transformControls
        };
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        const container = this.renderer.domElement.parentElement;
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
}
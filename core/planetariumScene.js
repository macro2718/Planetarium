import * as THREE from '../three.module.js';
import { OrbitControls } from '../vendor/three/addons/controls/OrbitControls.js';
import { setupPhotoCaptureButton } from '../ui/photoAlbum.js';
import { getActivePlanetarium } from '../ui/planetariumContext.js';

export function setupScene(ctx) {
    ctx.scene = new THREE.Scene();
    ctx.scene.fog = new THREE.FogExp2(0x000011, 0.00008);
}

export function setupCamera(ctx) {
    ctx.camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        20000
    );
    ctx.camera.position.set(0, 0, 0.1);
}

export function setupRenderer(ctx) {
    ctx.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true  // 写真撮影のために必要
    });
    resizeRenderer(ctx);
    ctx.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    ctx.renderer.toneMappingExposure = 1.2;
    const container = document.getElementById(ctx.containerId) || document.body;
    container.appendChild(ctx.renderer.domElement);

    window.addEventListener('resize', ctx.resizeRenderer);

    setupPhotoCaptureButton(
        () => getActivePlanetarium()?.renderer || ctx.renderer,
        () => getActivePlanetarium() || ctx
    );
}

export function resizeRenderer(ctx) {
    if (!ctx.renderer || !ctx.camera) return;

    const container = document.getElementById(ctx.containerId);
    const width = container?.clientWidth || window.innerWidth;
    const height = container?.clientHeight || window.innerHeight || 1;

    ctx.camera.aspect = width / height;
    ctx.camera.updateProjectionMatrix();
    ctx.renderer.setSize(width, height, false);
    ctx.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

export function setupControls(ctx) {
    ctx.controls = new OrbitControls(ctx.camera, ctx.renderer.domElement);
    ctx.controls.enableDamping = true;
    ctx.controls.dampingFactor = 0.05;
    ctx.controls.enableZoom = true;
    ctx.controls.zoomSpeed = 0.5;
    ctx.controls.minDistance = 0.1;
    ctx.controls.maxDistance = 100;
    ctx.controls.enablePan = false;
    ctx.controls.rotateSpeed = -0.3;
    ctx.controls.autoRotate = false;
    ctx.controls.autoRotateSpeed = 0.1;
    ctx.controls.maxPolarAngle = Math.PI - 0.001;
}

export function disposeScene(ctx) {
    if (!ctx.scene) return;
    ctx.scene.traverse((obj) => {
        if (obj.geometry?.dispose) {
            obj.geometry.dispose();
        }
        const mat = obj.material;
        if (Array.isArray(mat)) {
            mat.forEach((m) => m?.dispose?.());
        } else if (mat?.dispose) {
            mat.dispose();
        }
        if (obj.texture?.dispose) {
            obj.texture.dispose();
        }
    });
    ctx.scene.clear();
}

export function enforceCameraAboveWater(ctx) {
    if (!ctx.controls || !ctx.camera) return;
    const minHeight = ctx.minCameraHeight ?? -4;
    const epsilon = 0.001;
    const target = ctx.controls.target;
    const distance = ctx.camera.position.distanceTo(target);
    if (distance === 0 || distance <= Math.abs(minHeight)) {
        ctx.controls.maxPolarAngle = Math.PI - epsilon;
        return;
    }
    const ratio = THREE.MathUtils.clamp(minHeight / distance, -1, 0.999);
    const limit = Math.acos(ratio);
    const minLimit = ctx.controls.minPolarAngle + 0.001;
    ctx.controls.maxPolarAngle = Math.min(Math.max(limit, minLimit), Math.PI - epsilon);
}

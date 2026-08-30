import * as THREE from '../three.module.js';
import { OrbitControls } from '../vendor/three/addons/controls/OrbitControls.js';

const DEFAULTS = Object.freeze({
    cameraFar: 50,
    dampingFactor: 0.06,
    rotateSpeed: 0.5,
    polarInset: 0.16,
    starCount: 900,
    starRadius: 4,
    starRadiusSpread: 2.5,
    globeRotationSpeed: 0.0008,
    starRotationSpeed: 0.0002,
    ambientIntensity: 0.6,
    rimIntensity: 1.2,
    bottomFillIntensity: 0.35,
    fallbackWidth: 600,
    fallbackHeight: 400
});

export function latLonToVector(lat, lon, radius = 0.9) {
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon + 180);
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

export class GlobePreview {
    constructor(containerOrId, options = {}) {
        this.options = { ...DEFAULTS, ...options };
        this.document = options.documentRef ?? globalThis.document;
        this.window = options.windowRef ?? globalThis.window;
        this.container = typeof containerOrId === 'string'
            ? this.document?.getElementById(containerOrId)
            : containerOrId;
        this.frameId = null;
        this.running = false;
        this.disposed = false;

        if (!this.container) return;
        this.setupScene();
        this.animate = this.animate.bind(this);
        this.resizeHandler = () => this.onResize();
        this.onResize();
        if (options.autoStart) this.start();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setPixelRatio(Math.min(this.window?.devicePixelRatio || 1, 2));
        this.container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, this.options.cameraFar);
        this.camera.position.set(0, 0, 3.8);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = this.options.dampingFactor;
        this.controls.rotateSpeed = this.options.rotateSpeed;
        this.controls.enablePan = false;
        this.controls.enableZoom = false;
        this.controls.minPolarAngle = Math.PI * this.options.polarInset;
        this.controls.maxPolarAngle = Math.PI - Math.PI * this.options.polarInset;

        this.globeGroup = new THREE.Group();
        this.scene.add(this.globeGroup);
        this.addLights();
        this.addStars();
        this.addGlobe();
        this.pin = this.createPin();
        this.globeGroup.add(this.pin);
    }

    addLights() {
        const ambient = new THREE.AmbientLight(0xa7bfdc, this.options.ambientIntensity);
        const rim = new THREE.DirectionalLight(0xffffff, this.options.rimIntensity);
        rim.position.set(4, 2, 3);
        const bottomFill = new THREE.DirectionalLight(0x1c2f52, this.options.bottomFillIntensity);
        bottomFill.position.set(-2, -3, -2);
        this.scene.add(ambient, rim, bottomFill);
    }

    addStars() {
        const positions = new Float32Array(this.options.starCount * 3);
        for (let index = 0; index < this.options.starCount; index += 1) {
            const radius = this.options.starRadius + Math.random() * this.options.starRadiusSpread;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[index * 3 + 1] = radius * Math.cos(phi);
            positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: new THREE.Color('#cde6ff'),
            size: 0.01,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
            sizeAttenuation: true
        });
        this.starField = new THREE.Points(geometry, material);
        this.scene.add(this.starField);
    }

    addGlobe() {
        const earthTexture = new THREE.TextureLoader().load(
            'assets/textures/earth-day.jpg',
            (texture) => {
                if (this.disposed) {
                    texture.dispose();
                    return;
                }
                texture.anisotropy = this.renderer?.capabilities.getMaxAnisotropy?.() || 1;
            }
        );
        earthTexture.colorSpace = THREE.SRGBColorSpace;
        const surface = new THREE.Mesh(
            new THREE.SphereGeometry(0.9, 48, 48),
            new THREE.MeshStandardMaterial({
                map: earthTexture,
                roughness: 0.85,
                metalness: 0.05,
                emissive: new THREE.Color('#0b1a30'),
                emissiveIntensity: 0.18
            })
        );
        this.globeGroup.add(surface);
    }

    createPin() {
        return new THREE.Mesh(
            new THREE.SphereGeometry(0.035, 32, 32),
            new THREE.MeshStandardMaterial({
                color: new THREE.Color('#f0b9ff'),
                emissive: new THREE.Color('#f0b9ff'),
                emissiveIntensity: 0.8,
                roughness: 0.4,
                metalness: 0.2
            })
        );
    }

    focusLocation(location) {
        if (!location || !this.pin) return;
        this.pin.position.copy(latLonToVector(location.lat, location.lon));
        this.controls?.target.set(0, 0, 0);
    }

    onResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        const width = this.container.clientWidth
            || this.container.offsetWidth
            || this.options.fallbackWidth;
        const height = this.container.clientHeight
            || this.container.offsetHeight
            || this.options.fallbackHeight;
        this.camera.aspect = width / Math.max(height, 1);
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, Math.max(height, 1));
    }

    start() {
        if (this.running || this.disposed || !this.renderer) return;
        this.running = true;
        this.window?.addEventListener('resize', this.resizeHandler);
        this.onResize();
        this.animate();
    }

    stop() {
        if (!this.running) return;
        this.running = false;
        if (this.frameId !== null) {
            this.window?.cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
        this.window?.removeEventListener('resize', this.resizeHandler);
    }

    animate() {
        if (!this.running || this.disposed) return;
        this.frameId = this.window?.requestAnimationFrame(this.animate) ?? null;
        this.controls?.update();
        if (this.globeGroup) this.globeGroup.rotation.y += this.options.globeRotationSpeed;
        if (this.starField) this.starField.rotation.y += this.options.starRotationSpeed;
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        if (this.disposed) return;
        this.stop();
        this.disposed = true;
        this.controls?.dispose();
        this.scene?.traverse((object) => {
            object.geometry?.dispose?.();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.filter(Boolean).forEach((material) => {
                material.map?.dispose?.();
                material.dispose?.();
            });
        });
        this.scene?.clear();
        this.renderer?.dispose();
        this.renderer?.forceContextLoss?.();
        this.renderer?.domElement?.remove();
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.globeGroup = null;
        this.starField = null;
        this.pin = null;
    }
}

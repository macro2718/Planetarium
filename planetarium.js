import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AstroCatalog } from './astroCatalog.js';
import { createSkyEnvironment } from './systems/skyEnvironment.js';
import { createStarFieldSystem } from './systems/starFieldSystem.js';
import { createMilkyWaySystem } from './systems/milkyWaySystem.js';
import { createConstellationSystem } from './systems/constellationSystem.js';
import { createNebulaSystem } from './systems/nebulaSystem.js';
import { createMoonSystem } from './systems/moonSystem.js';
import { createAuroraSystem } from './systems/auroraSystem.js';
import { createCosmicDustSystem } from './systems/cosmicDustSystem.js';
import { createWaterSurfaceSystem } from './systems/waterSurfaceSystem.js';
import { createShootingStarSystem } from './systems/shootingStarSystem.js';
import { attachUIInteractions } from './ui/interactionController.js';
import { setupTimeDisplay } from './ui/timeDisplay.js';
import { calculateLocalSiderealTime } from './utils/astronomy.js';

// ========================================
// プラネタリウム - 美しい星空シミュレーション
// ========================================
class Planetarium {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.minCameraHeight = -4;
        this.settings = {
            showStars: true,
            showMilkyWay: true,
            showConstellations: true,
            showShootingStars: true,
            showMoon: true,
            showAurora: true,
            autoRotate: false,
            playMusic: false
        };
        this.audioContext = null;
        this.audioTones = null;
        this.isPlaying = false;
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Points.threshold = 50;
        this.raycaster.params.Mesh = { threshold: 30 };
        this.mouse = new THREE.Vector2();
        this.clickableObjects = [];
        this.catalogPickables = [];
        this.catalog = AstroCatalog.createDefault();
        this.starCatalog = this.catalog.getStars();
        this.starCatalogMap = this.catalog.getStarMap();
        this.observer = { lat: 35.6895, lon: 139.6917 };
        this.localSiderealTime = calculateLocalSiderealTime(new Date(), this.observer.lon);
        this.infoTimeout = null;
        this.currentMoonState = null;
        this.updaters = [];
        this.lastTime = performance.now() * 0.001;
        this.animate = this.animate.bind(this);
        this.init();
    }

    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();

        this.registerUpdater(createSkyEnvironment(this));
        this.registerUpdater(createStarFieldSystem(this));
        this.registerUpdater(createMilkyWaySystem(this));
        this.constellationSystem = createConstellationSystem(this);
        createNebulaSystem(this);
        this.moonSystem = createMoonSystem(this);
        this.registerUpdater(this.moonSystem);
        this.registerUpdater(createAuroraSystem(this));
        this.registerUpdater(createCosmicDustSystem(this));
        this.registerUpdater(createWaterSurfaceSystem(this, () => this.moonSystem.getCurrentState()));
        this.registerUpdater(createShootingStarSystem(this));

        attachUIInteractions(this);
        setupTimeDisplay(this, this.moonSystem);
        this.hideLoading();
        this.animate();
    }

    registerUpdater(system) {
        if (system?.update) {
            this.updaters.push(system.update);
        }
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000011, 0.00008);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            20000
        );
        this.camera.position.set(0, 0, 0.1);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.zoomSpeed = 0.5;
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 100;
        this.controls.enablePan = false;
        this.controls.rotateSpeed = -0.3;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.1;
        this.controls.maxPolarAngle = Math.PI - 0.001;
    }

    enforceCameraAboveWater() {
        if (!this.controls || !this.camera) return;
        const minHeight = this.minCameraHeight ?? -4;
        const epsilon = 0.001;
        const target = this.controls.target;
        const distance = this.camera.position.distanceTo(target);
        if (distance === 0 || distance <= Math.abs(minHeight)) {
            this.controls.maxPolarAngle = Math.PI - epsilon;
            return;
        }
        const ratio = THREE.MathUtils.clamp(minHeight / distance, -1, 0.999);
        const limit = Math.acos(ratio);
        const minLimit = this.controls.minPolarAngle + 0.001;
        this.controls.maxPolarAngle = Math.min(Math.max(limit, minLimit), Math.PI - epsilon);
    }

    startAmbientSound() {
        if (this.audioContext) return;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const createTone = (freq, type, gain) => {
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            osc.type = type;
            osc.frequency.value = freq;
            filter.type = 'lowpass';
            filter.frequency.value = 200;
            gainNode.gain.value = gain;
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            lfo.frequency.value = 0.05 + Math.random() * 0.1;
            lfoGain.gain.value = freq * 0.02;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start();
            osc.start();
            return { osc, gainNode, lfo };
        };
        this.audioTones = [
            createTone(55, 'sine', 0.08),
            createTone(82.5, 'sine', 0.05),
            createTone(110, 'sine', 0.03),
            createTone(65.4, 'triangle', 0.02)
        ];
        this.isPlaying = true;
    }

    stopAmbientSound() {
        if (!this.audioContext) return;
        if (this.audioTones) {
            this.audioTones.forEach(tone => {
                tone.osc.stop();
                tone.lfo.stop();
            });
        }
        this.audioContext.close();
        this.audioContext = null;
        this.isPlaying = false;
    }

    hideLoading() {
        setTimeout(() => {
            const loadingEl = document.getElementById('loading');
            if (loadingEl) {
                loadingEl.classList.add('hidden');
            }
        }, 1000);
    }

    animate() {
        requestAnimationFrame(this.animate);
        const now = performance.now() * 0.001;
        const delta = now - this.lastTime;
        this.lastTime = now;
        this.controls?.update();
        this.enforceCameraAboveWater();
        for (const update of this.updaters) {
            update(now, delta);
        }
        this.renderer.render(this.scene, this.camera);
    }
}

new Planetarium();

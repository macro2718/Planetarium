import * as THREE from './three.module.js';
import { OrbitControls } from './vendor/three/addons/controls/OrbitControls.js';
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
import { createHourCircleSystem } from './systems/hourCircleSystem.js';
import { createCardinalDirectionSystem } from './systems/cardinalDirectionSystem.js';
import { createStarTrailSystem } from './systems/starTrailSystem.js';
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
            showMilkyWay: true,
            showConstellations: true,
            showShootingStars: true,
            showMoon: true,
            showAurora: true,
            showHourCircles: false,
            showCardinalDirections: false,
            showStarTrails: false,
            autoRotate: false,
            playMusic: false
        };
        this.bgmAudio = null;
        this.bgmPlaylist = [];
        this.bgmCurrentIndex = 0;
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
        this.timeMode = 'realtime';
        this.timeScale = 240; // simulation seconds per real second (custom mode)
        this.simulationStartDate = new Date();
        const nowSeconds = performance.now() * 0.001;
        this.simulationStartPerf = nowSeconds;
        this.simulatedDate = new Date(this.simulationStartDate);
        this.localSiderealTime = calculateLocalSiderealTime(this.simulatedDate, this.observer.lon);
        this.infoTimeout = null;
        this.currentMoonState = null;
        this.updaters = [];
        this.lastTime = nowSeconds;
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
        this.registerUpdater(this.constellationSystem);
        createNebulaSystem(this);
        this.moonSystem = createMoonSystem(this);
        this.registerUpdater(this.moonSystem);
        this.registerUpdater(createAuroraSystem(this));
        this.registerUpdater(createCosmicDustSystem(this));
        this.registerUpdater(createWaterSurfaceSystem(this, () => this.moonSystem.getCurrentState()));
        this.registerUpdater(createShootingStarSystem(this));
        this.hourCircleSystem = createHourCircleSystem(this);
        this.cardinalDirectionSystem = createCardinalDirectionSystem(this);
        this.starTrailSystem = createStarTrailSystem(this);
        this.registerUpdater(this.starTrailSystem);

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

    updateSimulationTime(nowSeconds) {
        if (this.timeMode === 'realtime') {
            this.simulatedDate = new Date();
        } else {
            const elapsed = nowSeconds - this.simulationStartPerf;
            const simulatedMs = this.simulationStartDate.getTime() + elapsed * 1000 * this.timeScale;
            this.simulatedDate = new Date(simulatedMs);
        }
        this.localSiderealTime = calculateLocalSiderealTime(this.simulatedDate, this.observer.lon);
    }

    getSimulatedDate() {
        return this.simulatedDate ?? new Date();
    }

    setTimeMode(mode, options = {}) {
        if (mode === 'realtime') {
            this.timeMode = 'realtime';
            this.simulationStartDate = new Date();
            this.simulationStartPerf = this.getCurrentPerfSeconds();
            this.simulatedDate = new Date(this.simulationStartDate);
        } else if (mode === 'custom') {
            this.timeMode = 'custom';
            if (typeof options.timeScale === 'number' && !Number.isNaN(options.timeScale)) {
                this.timeScale = options.timeScale;
            }
            const providedDate = options.date instanceof Date
                ? options.date
                : (options.date ? new Date(options.date) : null);
            const hasValidDate = providedDate && !Number.isNaN(providedDate.getTime());
            const baseDate = hasValidDate ? providedDate : this.getSimulatedDate();
            this.simulationStartDate = new Date(baseDate);
            this.simulationStartPerf = this.getCurrentPerfSeconds();
            this.simulatedDate = new Date(baseDate);
        } else {
            console.warn('Unknown time mode:', mode);
            return;
        }
        this.localSiderealTime = calculateLocalSiderealTime(this.simulatedDate, this.observer.lon);
    }

    getCurrentPerfSeconds() {
        return performance.now() * 0.001;
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

    async loadBgmPlaylist() {
        // bgmフォルダ内のmp3ファイルリストを取得
        // 静的なリストとして定義（サーバーサイドがないため）
        const bgmFiles = [
            'bgm/Weightless Dreaming.mp3'
        ];
        this.bgmPlaylist = bgmFiles;
        this.bgmCurrentIndex = 0;
    }

    async startBgm() {
        if (this.isPlaying) return;
        
        if (this.bgmPlaylist.length === 0) {
            await this.loadBgmPlaylist();
        }
        
        if (this.bgmPlaylist.length === 0) {
            console.warn('BGMファイルが見つかりません');
            return;
        }

        this.playCurrentTrack();
    }

    playCurrentTrack() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio = null;
        }

        const trackPath = this.bgmPlaylist[this.bgmCurrentIndex];
        this.bgmAudio = new Audio(trackPath);
        this.bgmAudio.volume = 0.5;
        
        // 曲が終わったら次の曲へ
        this.bgmAudio.addEventListener('ended', () => {
            this.bgmCurrentIndex = (this.bgmCurrentIndex + 1) % this.bgmPlaylist.length;
            if (this.isPlaying) {
                this.playCurrentTrack();
            }
        });

        this.bgmAudio.play().catch(err => {
            console.error('BGM再生エラー:', err);
        });
        this.isPlaying = true;
    }

    stopBgm() {
        if (!this.bgmAudio) return;
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
        this.isPlaying = false;
    }

    startAmbientSound() {
        this.startBgm();
    }

    stopAmbientSound() {
        this.stopBgm();
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
        this.updateSimulationTime(now);
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

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AstroCatalog } from './astroCatalog.js';

// ========================================
// プラネタリウム - 美しい星空シミュレーション
// ========================================
class Planetarium {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // 表示グループ
        this.starsGroup = null;
        this.milkyWayGroup = null;
        this.constellationsGroup = null;
        this.shootingStarsGroup = null;
        this.moonGroup = null;
        this.auroraGroup = null;
        this.cosmicDustGroup = null;
        this.horizonRingMaterial = null;
        this.compassGroup = null;
        this.moonUniforms = null;
        this.moonCore = null;
        this.currentMoonState = null;
        
        // 設定
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
        
        // 流れ星管理
        this.shootingStars = [];
        this.shootingStarCooldown = 0;
        
        // 星のきらめき用
        this.starMaterials = [];
        
        // オーロラマテリアル
        this.auroraMaterials = [];
        
        // BGM
        this.audioContext = null;
        this.isPlaying = false;
        
        // レイキャスター（クリック検出用）
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Points.threshold = 50; // 当たり判定を大きく
        this.raycaster.params.Mesh = { threshold: 30 }; // メッシュ用の判定も拡大
        this.mouse = new THREE.Vector2();
        this.clickableObjects = [];
        this.catalogPickables = [];
        this.proceduralStarCounter = 0;
        this.catalog = AstroCatalog.createDefault();
        this.starCatalog = this.catalog.getStars();
        this.starCatalogMap = this.catalog.getStarMap();
        this.observer = {
            lat: 35.6895,   // 東京付近
            lon: 139.6917
        };
        this.localSiderealTime = this.calculateLocalSiderealTime(new Date());
        
        this.init();
    }

    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();
        this.createSkyGradient();
        this.createStars();
        this.createMilkyWay();
        this.createConstellations();
        this.createNebulaEffects();
        this.createMoon();
        this.createAurora();
        this.createCosmicDust();
        this.setupEventListeners();
        this.setupTimeDisplay();
        this.hideLoading();
        this.animate();
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
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
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
        this.controls.rotateSpeed = -0.3; // 負の値で方向を反転
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.1;
    }

    // 夜空のグラデーション背景
    createSkyGradient() {
        const skyGeometry = new THREE.SphereGeometry(10000, 64, 64);
        
        const vertexShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        const fragmentShader = `
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition).y;
                
                // 地平線下（地面/海）
                vec3 ground = vec3(0.01, 0.01, 0.02);
                // 地平線付近のグロー（街明かりや大気散乱）
                vec3 horizonGlow = vec3(0.08, 0.04, 0.12);
                // 低い空
                vec3 lowSky = vec3(0.02, 0.02, 0.06);
                // 高い空
                vec3 nightSky = vec3(0.0, 0.0, 0.02);
                // 天頂
                vec3 zenith = vec3(0.0, 0.0, 0.0);
                
                vec3 color;
                if (h < 0.0) {
                    // 地平線以下
                    color = mix(ground, horizonGlow, smoothstep(-0.3, 0.0, h));
                } else {
                    // 地平線以上
                    color = mix(horizonGlow, lowSky, smoothstep(0.0, 0.15, h));
                    color = mix(color, nightSky, smoothstep(0.1, 0.4, h));
                    color = mix(color, zenith, smoothstep(0.5, 1.0, h));
                }
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        
        const skyMaterial = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
        
        // 地平線のリングを追加
        this.createHorizonRing();
    }
    
    // 地平線のリング（視覚的な目印）
    createHorizonRing() {
        // 地平線のグローリング
        const ringGeometry = new THREE.TorusGeometry(9000, 30, 16, 128);
        this.horizonRingMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform float time;
                void main() {
                    // 淡いオレンジ〜紫のグラデーション
                    vec3 color1 = vec3(0.15, 0.05, 0.1);
                    vec3 color2 = vec3(0.12, 0.06, 0.16);
                    vec3 color = mix(color1, color2, vUv.x);
                    
                    float wave = sin(time * 0.35 + vUv.x * 6.2831) * 0.05;
                    float alpha = 0.32 + wave;
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        const ring = new THREE.Mesh(ringGeometry, this.horizonRingMaterial);
        ring.rotation.x = Math.PI / 2; // 水平に配置
        this.scene.add(ring);
        
        // 地平線の細いライン
        const linePoints = [];
        const segments = 256;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            linePoints.push(new THREE.Vector3(
                Math.cos(angle) * 8500,
                0,
                Math.sin(angle) * 8500
            ));
        }
        
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x8866aa,
            transparent: true,
            opacity: 0.5
        });
        
        const horizonLine = new THREE.Line(lineGeometry, lineMaterial);
        this.scene.add(horizonLine);
        
        // 地平線上の淡い光の粒子（街明かりや遠くの灯りを表現）
        this.createHorizonLights();
        this.createCompassPoints(8500);
    }
    
    // 地平線上の淡い光
    createHorizonLights() {
        const count = 200;
        const positions = [];
        const colors = [];
        const sizes = [];
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 8000 + Math.random() * 500;
            const height = (Math.random() - 0.5) * 100; // 地平線付近
            
            positions.push(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            
            // 暖かい色の光（街明かり風）
            const warmth = Math.random();
            colors.push(
                0.8 + warmth * 0.2,
                0.5 + warmth * 0.3,
                0.3 + (1 - warmth) * 0.4
            );
            
            sizes.push(5 + Math.random() * 15);
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const vertexShader = `
            attribute float size;
            varying vec3 vColor;
            
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;
        
        const fragmentShader = `
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 0.3 * exp(-dist * 4.0);
                gl_FragColor = vec4(vColor, alpha);
            }
        `;
        
        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const lights = new THREE.Points(geometry, material);
        this.scene.add(lights);
    }
    
    createCompassPoints(radius = 8500) {
        // 地平線に方位のグローラベルを追加
        if (this.compassGroup) {
            this.scene.remove(this.compassGroup);
        }
        this.compassGroup = new THREE.Group();
        const markers = [
            { label: 'N', angle: 0, color: 0x9fc7ff },
            { label: 'E', angle: Math.PI / 2, color: 0xb0ffd4 },
            { label: 'S', angle: Math.PI, color: 0xffcde0 },
            { label: 'W', angle: Math.PI * 1.5, color: 0xd2e3ff }
        ];
        
        markers.forEach(marker => {
            const sprite = this.createLabelSprite(marker.label, marker.color);
            const x = Math.cos(marker.angle) * radius;
            const z = Math.sin(marker.angle) * radius;
            sprite.position.set(x, 40, z);
            this.compassGroup.add(sprite);
            
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, 0, z),
                new THREE.Vector3(x, 120, z)
            ]);
            const lineMaterial = new THREE.LineBasicMaterial({
                color: marker.color,
                transparent: true,
                opacity: 0.35,
                blending: THREE.AdditiveBlending
            });
            this.compassGroup.add(new THREE.Line(lineGeometry, lineMaterial));
        });
        
        this.scene.add(this.compassGroup);
    }
    
    createLabelSprite(text, color = 0xb7d4ff) {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return new THREE.Sprite();
        ctx.clearRect(0, 0, size, size);
        ctx.font = '700 110px "Space Grotesk", "Zen Kaku Gothic New", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 6;
        ctx.shadowColor = 'rgba(120, 180, 255, 0.85)';
        ctx.shadowBlur = 32;
        ctx.strokeText(text, size / 2, size / 2 + 8);
        ctx.fillText(text, size / 2, size / 2 + 8);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            color: new THREE.Color(color)
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(200, 200, 1);
        return sprite;
    }

    // 星を生成
    createStars() {
        this.starsGroup = new THREE.Group();
        
        // 複数の星のレイヤーを作成（距離と明るさのバリエーション）
        this.createStarLayer(8000, 5000, 0.5, 3.0);  // 明るい星
        this.createStarLayer(15000, 7000, 0.3, 1.5); // 中程度の星
        this.createStarLayer(30000, 8000, 0.1, 0.8); // 暗い星
        
        this.scene.add(this.starsGroup);
    }

    createStarLayer(count, radius, minSize, maxSize) {
        const positions = [];
        const colors = [];
        const sizes = [];
        const twinklePhases = [];
        const starInfos = [];
        
        // 星の色のバリエーション
        const starColors = [
            { color: new THREE.Color(0xffffff), spectralType: 'A型', temperature: '約8,500K', description: '純白に輝くA型主系列星' },
            { color: new THREE.Color(0xffeedd), spectralType: 'F型', temperature: '約7,000K', description: '黄白色の穏やかな恒星' },
            { color: new THREE.Color(0xaaccff), spectralType: 'B型', temperature: '約12,000K', description: '青白い高温の恒星' },
            { color: new THREE.Color(0xffddaa), spectralType: 'K型', temperature: '約4,500K', description: 'オレンジ色の巨星' },
            { color: new THREE.Color(0xffaaaa), spectralType: 'M型', temperature: '約3,500K', description: '赤く輝く低温の恒星' },
            { color: new THREE.Color(0xaaffff), spectralType: 'O型', temperature: '約30,000K', description: '青緑の超高温恒星' }
        ];
        
        let addedCount = 0;
        while (addedCount < count) {
            // 球面上にランダム配置
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            // 地平線より下（y < 0）の星はスキップ
            if (y < 0) continue;
            
            positions.push(x, y, z);
            addedCount++;
            
            // ランダムな色
            const colorProfile = starColors[Math.floor(Math.random() * starColors.length)];
            const color = colorProfile.color;
            colors.push(color.r, color.g, color.b);
            
            // サイズのバリエーション（べき乗分布で少数の明るい星）
            const sizeFactor = Math.pow(Math.random(), 2);
            const starSize = minSize + sizeFactor * (maxSize - minSize);
            sizes.push(starSize);
            
            // きらめきのフェーズ
            twinklePhases.push(Math.random() * Math.PI * 2);
            
            // 星の説明データ
            const starInfo = this.generateProceduralStarInfo(colorProfile, starSize, minSize, maxSize);
            starInfos.push(starInfo);
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('twinklePhase', new THREE.Float32BufferAttribute(twinklePhases, 1));
        
        const vertexShader = `
            attribute float size;
            attribute float twinklePhase;
            varying vec3 vColor;
            varying float vTwinkle;
            uniform float time;
            
            void main() {
                vColor = color;
                // きらめき効果
                vTwinkle = 0.7 + 0.3 * sin(time * 2.0 + twinklePhase);
                
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z) * vTwinkle;
                gl_Position = projectionMatrix * mvPosition;
            }
        `;
        
        const fragmentShader = `
            varying vec3 vColor;
            varying float vTwinkle;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                // 中心が明るく、外側にグロー
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                float glow = exp(-dist * 4.0);
                
                vec3 finalColor = vColor * (alpha + glow * 0.5) * vTwinkle;
                gl_FragColor = vec4(finalColor, alpha * vTwinkle);
            }
        `;
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader,
            fragmentShader,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.starMaterials.push(material);
        
        const stars = new THREE.Points(geometry, material);
        stars.userData.starInfos = starInfos;
        this.starsGroup.add(stars);
    }

    generateProceduralStarInfo(colorProfile, starSize, minSize, maxSize) {
        const range = Math.max(maxSize - minSize, 0.0001);
        const normalized = THREE.MathUtils.clamp((starSize - minSize) / range, 0, 1);
        const magnitude = +(5.5 - normalized * 5).toFixed(2);
        const distance = Math.round(25 + Math.random() * 1975);
        const id = String(++this.proceduralStarCounter).padStart(4, '0');
        const name = `無名の星 ${id}`;
        return {
            name,
            type: 'star',
            constellation: '星図外',
            magnitude,
            distance,
            spectralType: colorProfile.spectralType,
            temperature: colorProfile.temperature,
            colorHint: colorProfile.description,
            info: `観測される色から${colorProfile.description}。地球から約${distance}光年の距離にあると推定され、視等級はおよそ${magnitude}等級。`
        };
    }

    // 天の川を生成
    createMilkyWay() {
        this.milkyWayGroup = new THREE.Group();
        
        // 天の川の帯（メインの星々）
        const milkyWayCount = 80000;
        const positions = [];
        const colors = [];
        const sizes = [];
        
        for (let i = 0; i < milkyWayCount; i++) {
            // 天の川は空を斜めに横切る帯状に配置
            const t = Math.random() * Math.PI * 2;
            // ガウス分布で中心が濃く、端が薄い帯を作る
            const gaussRandom = () => {
                let u = 0, v = 0;
                while(u === 0) u = Math.random();
                while(v === 0) v = Math.random();
                return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            };
            const spread = gaussRandom() * 0.25; // 帯の幅
            
            const radius = 5500;
            
            // 天の川を傾けて配置（地平線から60度くらいの角度で斜めに横切る）
            // 球面座標で配置し、傾きを加える
            const baseX = Math.cos(t);
            const baseZ = Math.sin(t);
            const baseY = spread;
            
            // 60度傾ける（X軸周りに回転）
            const tiltAngle = Math.PI / 3; // 60度
            const rotatedY = baseY * Math.cos(tiltAngle) - baseZ * Math.sin(tiltAngle);
            const rotatedZ = baseY * Math.sin(tiltAngle) + baseZ * Math.cos(tiltAngle);
            
            const x = radius * baseX;
            const y = radius * rotatedY;
            const z = radius * rotatedZ;
            
            // 地平線より下（y < 0）はスキップ
            if (y < 0) continue;
            
            positions.push(x, y, z);
            
            // 天の川の色（より明るく、青白い）
            const brightness = 0.5 + Math.random() * 0.5;
            const blueTint = 0.1 + Math.random() * 0.3;
            colors.push(
                brightness * 0.9,
                brightness * 0.95,
                brightness + blueTint
            );
            
            sizes.push(0.5 + Math.random() * 1.5);
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const vertexShader = `
            attribute float size;
            varying vec3 vColor;
            
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (250.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;
        
        const fragmentShader = `
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 0.6 * (1.0 - smoothstep(0.0, 0.5, dist));
                gl_FragColor = vec4(vColor, alpha);
            }
        `;
        
        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const milkyWay = new THREE.Points(geometry, material);
        this.milkyWayGroup.add(milkyWay);
        
        // 天の川のグロー効果（より明るく）
        this.createMilkyWayGlow();
        
        // 天の川の明るい領域（星雲のような塊）
        this.createMilkyWayClouds();
        
        this.scene.add(this.milkyWayGroup);
    }

    createMilkyWayGlow() {
        const glowCount = 1000;
        const positions = [];
        const sizes = [];
        const colors = [];
        
        const tiltAngle = Math.PI / 3; // 60度
        
        for (let i = 0; i < glowCount; i++) {
            const t = Math.random() * Math.PI * 2;
            const gaussRandom = () => {
                let u = 0, v = 0;
                while(u === 0) u = Math.random();
                while(v === 0) v = Math.random();
                return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            };
            const spread = gaussRandom() * 0.2;
            const radius = 5400;
            
            const baseX = Math.cos(t);
            const baseZ = Math.sin(t);
            const baseY = spread;
            
            const rotatedY = baseY * Math.cos(tiltAngle) - baseZ * Math.sin(tiltAngle);
            const rotatedZ = baseY * Math.sin(tiltAngle) + baseZ * Math.cos(tiltAngle);
            
            const x = radius * baseX;
            const y = radius * rotatedY;
            const z = radius * rotatedZ;
            
            // 地平線より下（y < 0）はスキップ
            if (y < 0) continue;
            
            positions.push(x, y, z);
            sizes.push(30 + Math.random() * 60);
            
            // グローの色バリエーション
            const colorChoice = Math.random();
            if (colorChoice < 0.7) {
                colors.push(0.6, 0.7, 1.0); // 青白
            } else if (colorChoice < 0.9) {
                colors.push(0.8, 0.7, 0.9); // 淡い紫
            } else {
                colors.push(0.9, 0.8, 0.7); // 暖色
            }
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const vertexShader = `
            attribute float size;
            varying float vSize;
            varying vec3 vColor;
            
            void main() {
                vSize = size;
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (400.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;
        
        const fragmentShader = `
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 0.12 * exp(-dist * 2.5);
                gl_FragColor = vec4(vColor, alpha);
            }
        `;
        
        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const glow = new THREE.Points(geometry, material);
        this.milkyWayGroup.add(glow);
    }
    
    // 天の川の明るい雲状の領域
    createMilkyWayClouds() {
        const cloudCount = 50;
        const tiltAngle = Math.PI / 3; // 60度
        
        for (let i = 0; i < cloudCount; i++) {
            const t = Math.random() * Math.PI * 2;
            const gaussRandom = () => {
                let u = 0, v = 0;
                while(u === 0) u = Math.random();
                while(v === 0) v = Math.random();
                return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            };
            const spread = gaussRandom() * 0.15;
            const radius = 5300;
            
            const baseX = Math.cos(t);
            const baseZ = Math.sin(t);
            const baseY = spread;
            
            const rotatedY = baseY * Math.cos(tiltAngle) - baseZ * Math.sin(tiltAngle);
            const rotatedZ = baseY * Math.sin(tiltAngle) + baseZ * Math.cos(tiltAngle);
            
            const x = radius * baseX;
            const y = radius * rotatedY;
            const z = radius * rotatedZ;
            
            // 地平線より下（y < 0）はスキップ
            if (y < 0) continue;
            
            const cloudSize = 200 + Math.random() * 400;
            const cloudGeometry = new THREE.PlaneGeometry(cloudSize, cloudSize);
            
            // 雲の色
            const colorTypes = [
                new THREE.Color(0.5, 0.6, 0.9),  // 青
                new THREE.Color(0.7, 0.5, 0.8),  // 紫
                new THREE.Color(0.8, 0.7, 0.6),  // オレンジ
                new THREE.Color(0.6, 0.8, 0.7),  // 緑がかった
            ];
            const color = colorTypes[Math.floor(Math.random() * colorTypes.length)];
            
            const cloudMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    color: { value: color }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 color;
                    varying vec2 vUv;
                    
                    void main() {
                        float dist = length(vUv - vec2(0.5));
                        float alpha = 0.2 * exp(-dist * 3.0) * (1.0 - dist * 1.5);
                        if (alpha < 0.005) discard;
                        gl_FragColor = vec4(color, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloud.position.set(x, y, z);
            cloud.lookAt(0, 0, 0);
            cloud.rotation.z = Math.random() * Math.PI * 2;
            
            this.milkyWayGroup.add(cloud);
        }
    }

    // 星座を生成
    createConstellations() {
        this.constellationsGroup = new THREE.Group();
        const radius = 5000;
        const starPositionCache = new Map();
        const ensureStar = (starId) => {
            if (starPositionCache.has(starId)) {
                return starPositionCache.get(starId);
            }
            const data = this.catalog.getStar(starId);
            if (!data) return null;
            const position = this.convertRADecToVector(data.ra, data.dec, radius);
            if (!position || position.y <= 0) {
                starPositionCache.set(starId, null);
                return null;
            }
            starPositionCache.set(starId, position);
            
            const size = this.getStarSizeFromMagnitude(data.magnitude);
            const starGeometry = new THREE.SphereGeometry(size, 16, 16);
            const starMaterial = new THREE.MeshBasicMaterial({
                color: data.color || 0xffffee,
                transparent: true,
                opacity: 0.95
            });
            const star = new THREE.Mesh(starGeometry, starMaterial);
            star.position.copy(position);
            star.userData = {
                id: data.id,
                name: data.name,
                nameEn: data.nameEn,
                type: 'star',
                constellation: data.constellation,
                magnitude: data.magnitude,
                distance: data.distance,
                spectralType: data.spectralType,
                temperature: data.temperature,
                colorHint: data.colorHint,
                info: data.info,
                fromCatalog: true
            };
            this.constellationsGroup.add(star);
            this.clickableObjects.push(star);
            this.catalogPickables.push(star);
            
            const glowGeometry = new THREE.SphereGeometry(size * 2.5, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: data.glowColor || 0x6699ff,
                transparent: true,
                opacity: 0.2,
                blending: THREE.AdditiveBlending
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(position);
            this.constellationsGroup.add(glow);
            
            return position;
        };
        
        // 主要恒星をすべて可視化
        this.catalog.getFeaturedStars().forEach(star => {
            ensureStar(star.id);
        });
        
        const constellations = this.catalog.getConstellations();
        constellations.forEach(constellation => {
            constellation.starIds.forEach(starId => ensureStar(starId));
            constellation.lines.forEach(([startId, endId]) => {
                const startPos = ensureStar(startId);
                const endPos = ensureStar(endId);
                if (!startPos || !endPos) return;
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                    startPos,
                    endPos
                ]);
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: constellation.color || 0x4488ff,
                    transparent: true,
                    opacity: 0.35,
                    blending: THREE.AdditiveBlending
                });
                const line = new THREE.Line(lineGeometry, lineMaterial);
                this.constellationsGroup.add(line);
            });
        });
        
        this.scene.add(this.constellationsGroup);
    }

    getStarSizeFromMagnitude(magnitude) {
        const mag = magnitude ?? 2.5;
        const brightness = THREE.MathUtils.clamp(2.2 - mag, -1.5, 2.2);
        return 6 + brightness * 2; // 明るい星ほど少し大きく描画
    }

    convertRADecToVector(raDeg, decDeg, radius) {
        const lst = this.localSiderealTime;
        const hourAngle = THREE.MathUtils.degToRad(((lst - raDeg) % 360 + 360) % 360);
        const dec = THREE.MathUtils.degToRad(decDeg);
        const lat = THREE.MathUtils.degToRad(this.observer.lat);
        
        const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(hourAngle);
        const alt = Math.asin(sinAlt);
        if (alt <= 0) {
            return null; // 地平線より下は描画しない
        }
        
        const cosAz = (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat));
        let az = Math.acos(THREE.MathUtils.clamp(cosAz, -1, 1));
        if (Math.sin(hourAngle) > 0) {
            az = Math.PI * 2 - az;
        }
        
        const y = radius * Math.sin(alt);
        const projectedRadius = radius * Math.cos(alt);
        const x = projectedRadius * Math.sin(az);
        const z = projectedRadius * Math.cos(az);
        return new THREE.Vector3(x, y, z);
    }

    calculateLocalSiderealTime(date) {
        const jd = date.getTime() / 86400000 + 2440587.5;
        const T = (jd - 2451545.0) / 36525;
        let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000;
        gmst = ((gmst % 360) + 360) % 360;
        const lst = gmst + this.observer.lon;
        return ((lst % 360) + 360) % 360;
    }


    // 星雲効果
    createNebulaEffects() {
        const nebulaCount = 30;
        
        let addedCount = 0;
        while (addedCount < nebulaCount) {
            const theta = Math.random() * Math.PI * 2;
            // 上半球のみ（phiを0からPI/2に制限）
            const phi = Math.random() * Math.PI / 2;
            const radius = 7000 + Math.random() * 1000;
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.cos(phi); // これでyは常に正
            const z = radius * Math.sin(phi) * Math.sin(theta);
            
            const nebulaGeometry = new THREE.PlaneGeometry(500 + Math.random() * 500, 500 + Math.random() * 500);
            
            // 星雲の色バリエーション
            const nebulaColors = [
                new THREE.Color(0x4466ff),
                new THREE.Color(0xff6644),
                new THREE.Color(0x44ff88),
                new THREE.Color(0xff44aa),
                new THREE.Color(0xaa44ff)
            ];
            const color = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
            
            const nebulaMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    color: { value: color }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 color;
                    varying vec2 vUv;
                    
                    void main() {
                        float dist = length(vUv - vec2(0.5));
                        float alpha = 0.08 * exp(-dist * 3.0) * (1.0 - dist * 2.0);
                        if (alpha < 0.001) discard;
                        gl_FragColor = vec4(color, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            
            const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
            nebula.position.set(x, y, z);
            nebula.lookAt(0, 0, 0);
            nebula.rotation.z = Math.random() * Math.PI * 2;
            
            this.scene.add(nebula);
            addedCount++;
        }
    }

    // 月を生成
    createMoon() {
        this.moonGroup = new THREE.Group();
        this.scene.add(this.moonGroup);

        const moonRadius = 120;
        this.moonUniforms = {
            time: { value: 0 },
            phaseAngle: { value: 0 },
            illumination: { value: 0 },
            sunDirection: { value: new THREE.Vector3(0, 0.2, -1).normalize() },
            albedo: { value: new THREE.Color(0.86, 0.85, 0.82) }
        };

        const moonGeometry = new THREE.SphereGeometry(moonRadius, 128, 128);
        const moonMaterial = new THREE.ShaderMaterial({
            uniforms: this.moonUniforms,
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vWorldNormal;
                varying vec3 vObjectNormal;
                varying vec3 vPosition;
                varying vec3 vWorldPos;
                void main() {
                    vUv = uv;
                    vObjectNormal = normalize(normal);
                    vWorldNormal = normalize(mat3(modelMatrix) * normal);
                    vec4 worldPos = modelMatrix * vec4(position, 1.0);
                    vWorldPos = worldPos.xyz;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float phaseAngle;
                uniform float illumination;
                uniform vec3 sunDirection;
                uniform vec3 albedo;
                varying vec2 vUv;
                varying vec3 vWorldNormal;
                varying vec3 vObjectNormal;
                varying vec3 vPosition;
                varying vec3 vWorldPos;
                
                float hash(vec3 p) {
                    p = fract(p * 0.3183099 + vec3(0.1, 0.1, 0.1));
                    p *= 17.0;
                    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
                }
                
                float noise(vec3 p) {
                    vec3 i = floor(p);
                    vec3 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    float n000 = hash(i + vec3(0.0, 0.0, 0.0));
                    float n100 = hash(i + vec3(1.0, 0.0, 0.0));
                    float n010 = hash(i + vec3(0.0, 1.0, 0.0));
                    float n110 = hash(i + vec3(1.0, 1.0, 0.0));
                    float n001 = hash(i + vec3(0.0, 0.0, 1.0));
                    float n101 = hash(i + vec3(1.0, 0.0, 1.0));
                    float n011 = hash(i + vec3(0.0, 1.0, 1.0));
                    float n111 = hash(i + vec3(1.0, 1.0, 1.0));
                    float n00 = mix(n000, n100, f.x);
                    float n10 = mix(n010, n110, f.x);
                    float n01 = mix(n001, n101, f.x);
                    float n11 = mix(n011, n111, f.x);
                    float n0 = mix(n00, n10, f.y);
                    float n1 = mix(n01, n11, f.y);
                    return mix(n0, n1, f.z);
                }
                
                float fbm(vec3 p) {
                    float value = 0.0;
                    float amp = 0.5;
                    float freq = 1.5;
                    for (int i = 0; i < 5; i++) {
                        value += amp * noise(p * freq);
                        freq *= 2.1;
                        amp *= 0.55;
                    }
                    return value;
                }
                
                float crater(vec2 uv, vec2 center, float radius, float rim) {
                    float d = length(uv - center);
                    float floor = smoothstep(radius, radius * 0.2, d);
                    float ring = smoothstep(radius, radius - rim, d);
                    return clamp(ring * 0.8 + floor * 0.2, 0.0, 1.0);
                }
                
                void main() {
                    vec3 baseColor = albedo;
                    vec3 coord = normalize(vObjectNormal);
                    float large = fbm(coord * 2.5);
                    float mid = fbm(coord * 6.0 + vec3(0.0, time * 0.01, 0.0));
                    float fine = fbm(coord * 14.0);
                    float height = large * 0.55 + mid * 0.3 + fine * 0.15;
                    baseColor -= height * vec3(0.25, 0.26, 0.24);

                    float craterMap = 0.0;
                    craterMap += crater(vUv, vec2(0.32, 0.54), 0.08, 0.02);
                    craterMap += crater(vUv, vec2(0.58, 0.46), 0.05, 0.015);
                    craterMap += crater(vUv, vec2(0.42, 0.32), 0.06, 0.02);
                    craterMap += crater(vUv, vec2(0.25, 0.38), 0.04, 0.012);
                    craterMap += crater(vUv, vec2(0.7, 0.63), 0.07, 0.02);
                    craterMap += crater(vUv, vec2(0.52, 0.72), 0.04, 0.01);
                    baseColor -= craterMap * 0.08;

                    // 月の海を表現
                    float mare = smoothstep(0.18, 0.0, length(vUv - vec2(0.4, 0.45)) - 0.12);
                    mare += smoothstep(0.14, 0.0, length(vUv - vec2(0.6, 0.55)) - 0.08);
                    baseColor -= mare * vec3(0.15, 0.16, 0.18);

                    vec3 lightDir = normalize(sunDirection);
                    vec3 viewDir = normalize(cameraPosition - vWorldPos);
                    float lambert = max(dot(vWorldNormal, lightDir), 0.0);
                    float softness = smoothstep(-0.2, 0.25, dot(vWorldNormal, lightDir));
                    vec3 diffuse = baseColor * (lambert * 0.9 + 0.2);

                    float rim = pow(1.0 - max(dot(vWorldNormal, viewDir), 0.0), 2.0);
                    vec3 rimLight = vec3(0.3, 0.32, 0.36) * rim * 0.6;

                    float nightside = 1.0 - clamp(dot(vWorldNormal, lightDir) * 0.5 + 0.5, 0.0, 1.0);
                    float earthshine = nightside * (1.0 - illumination) * max(dot(vWorldNormal, viewDir), 0.0) * 0.3;
                    vec3 color = diffuse + rimLight + earthshine;
                    float phaseGlow = 0.5 + 0.5 * cos(phaseAngle);
                    color += vec3(0.02 * phaseGlow);
                    color = mix(color, color * vec3(0.8, 0.85, 0.9), 0.2);
                    color = clamp(color, 0.05, 1.2);

                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });

        const moon = new THREE.Mesh(moonGeometry, moonMaterial);
        moon.userData = {
            name: '月',
            nameEn: 'Moon',
            type: 'moon',
            info: '現在の月齢と輝面比はリアルタイムに更新されます。'
        };
        this.moonCore = moon;
        this.moonGroup.add(moon);
        this.clickableObjects.push(moon);

        // 起動時に現在の月データを反映
        this.currentMoonState = this.calculateMoonState(new Date());
        this.updateMoonVisuals(this.currentMoonState);
    }

    getMoonPhaseLabel(phase) {
        const normalized = (phase % 1 + 1) % 1;
        const phases = [
            { max: 0.0625, name: '新月', emoji: '🌑' },
            { max: 0.1875, name: '三日月', emoji: '🌒' },
            { max: 0.3125, name: '上弦', emoji: '🌓' },
            { max: 0.4375, name: '十三夜', emoji: '🌔' },
            { max: 0.5625, name: '満月', emoji: '🌕' },
            { max: 0.6875, name: '十八夜', emoji: '🌖' },
            { max: 0.8125, name: '下弦', emoji: '🌗' },
            { max: 0.9375, name: '晦日月', emoji: '🌘' }
        ];
        for (const p of phases) {
            if (normalized < p.max) return p;
        }
        return { name: '新月', emoji: '🌑' };
    }

    calculateMoonState(date = new Date()) {
        const lunarCycle = 29.530588;
        const reference = new Date('2024-01-11T11:57:00Z');
        const diffDays = (date - reference) / (1000 * 60 * 60 * 24);
        const moonAge = ((diffDays % lunarCycle) + lunarCycle) % lunarCycle;
        const phase = moonAge / lunarCycle;
        const phaseAngle = phase * Math.PI * 2;
        const illumination = 0.5 * (1 - Math.cos(phaseAngle));
        const label = this.getMoonPhaseLabel(phase);

        const moonDistance = 2600;
        const baseAltitude = THREE.MathUtils.degToRad(28);
        const seasonal = THREE.MathUtils.degToRad(10) * Math.sin((date.getMonth() / 12) * Math.PI * 2 + date.getDate() * 0.2);
        const altitude = baseAltitude + THREE.MathUtils.degToRad(12) * Math.sin(phaseAngle + seasonal) + THREE.MathUtils.degToRad(5);
        const azimuth = THREE.MathUtils.degToRad(110) + phaseAngle * 0.85;
        const y = Math.max(150, moonDistance * Math.sin(altitude));
        const projected = moonDistance * Math.cos(altitude);
        const x = projected * Math.sin(azimuth);
        const z = projected * Math.cos(azimuth);
        const position = new THREE.Vector3(x, y, z);

        const viewDir = position.clone().normalize();
        const earthDir = viewDir.clone().negate();
        const sunDirection = new THREE.Vector3().copy(viewDir).lerp(earthDir, illumination).normalize();

        return {
            phase,
            phaseAngle,
            illumination,
            moonAge,
            emoji: label.emoji,
            phaseName: label.name,
            position,
            sunDirection,
            altDeg: THREE.MathUtils.radToDeg(altitude),
            azDeg: THREE.MathUtils.radToDeg(azimuth)
        };
    }

    updateMoonVisuals(state) {
        if (!this.moonGroup || !state || !this.moonUniforms) return;
        this.moonGroup.position.copy(state.position);
        this.moonGroup.lookAt(0, 0, 0);
        this.moonUniforms.phaseAngle.value = state.phaseAngle;
        this.moonUniforms.illumination.value = state.illumination;
        this.moonUniforms.sunDirection.value.copy(state.sunDirection);
        if (this.moonCore) {
            const illuminationPct = Math.round(state.illumination * 100);
            this.moonCore.userData.magnitude = `月齢 ${state.moonAge.toFixed(1)}日`;
            this.moonCore.userData.info = `現在は${state.phaseName}（輝面比 約${illuminationPct}%）。高度 ${state.altDeg.toFixed(1)}° / 方位 ${state.azDeg.toFixed(1)}° 付近に位置しています。`;
        }
    }

    // オーロラを生成
    createAurora() {
        this.auroraGroup = new THREE.Group();
        
        // オーロラのカーテン（複数）
        const auroraCount = 5;
        
        for (let i = 0; i < auroraCount; i++) {
            const auroraGeometry = new THREE.PlaneGeometry(3000, 1500, 100, 50);
            
            const auroraMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    color1: { value: new THREE.Color(0x00ff88) },
                    color2: { value: new THREE.Color(0x0088ff) },
                    color3: { value: new THREE.Color(0xff00ff) }
                },
                vertexShader: `
                    uniform float time;
                    varying vec2 vUv;
                    varying float vWave;
                    
                    void main() {
                        vUv = uv;
                        
                        // 波打つ動き
                        vec3 pos = position;
                        float wave = sin(pos.x * 0.005 + time * 0.5) * 100.0;
                        wave += sin(pos.x * 0.01 + time * 0.3) * 50.0;
                        pos.z += wave;
                        pos.y += sin(pos.x * 0.003 + time * 0.2) * 30.0;
                        
                        vWave = wave * 0.01;
                        
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 color1;
                    uniform vec3 color2;
                    uniform vec3 color3;
                    varying vec2 vUv;
                    varying float vWave;
                    
                    void main() {
                        // 縦方向のグラデーション（下から上へ薄く）
                        float verticalFade = pow(1.0 - vUv.y, 1.5);
                        
                        // 横方向の波動
                        float horizontalWave = sin(vUv.x * 10.0 + time * 2.0) * 0.5 + 0.5;
                        
                        // 色のミックス
                        vec3 color = mix(color1, color2, vUv.x + sin(time * 0.5) * 0.3);
                        color = mix(color, color3, horizontalWave * 0.3);
                        
                        // 明るさの変動
                        float brightness = 0.3 + sin(time + vUv.x * 5.0) * 0.2;
                        brightness *= verticalFade;
                        
                        // カーテンのひだ
                        float curtain = abs(sin(vUv.x * 30.0 + time * 0.5)) * 0.5 + 0.5;
                        brightness *= curtain;
                        
                        float alpha = brightness * 0.4;
                        
                        // 端をフェードアウト
                        alpha *= smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
                        
                        gl_FragColor = vec4(color * brightness, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            
            this.auroraMaterials.push(auroraMaterial);
            
            const aurora = new THREE.Mesh(auroraGeometry, auroraMaterial);
            
            // 北の地平線付近に配置
            const angle = (i / auroraCount) * Math.PI * 0.4 - Math.PI * 0.2;
            const distance = 6000;
            aurora.position.set(
                Math.sin(angle) * distance,
                800 + i * 100,
                -Math.cos(angle) * distance
            );
            aurora.rotation.y = angle;
            
            this.auroraGroup.add(aurora);
        }
        
        this.scene.add(this.auroraGroup);
    }

    // 宇宙の塵（コズミックダスト）
    createCosmicDust() {
        this.cosmicDustGroup = new THREE.Group();
        
        const dustCount = 3000;
        const positions = [];
        const sizes = [];
        const colors = [];
        
        for (let i = 0; i < dustCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI / 2;
            const radius = 500 + Math.random() * 4000;
            
            positions.push(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.cos(phi),
                radius * Math.sin(phi) * Math.sin(theta)
            );
            
            sizes.push(0.5 + Math.random() * 1.5);
            
            // 淡い色
            const brightness = 0.3 + Math.random() * 0.4;
            colors.push(brightness, brightness, brightness + 0.1);
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const dustMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                uniform float time;
                
                void main() {
                    vColor = color;
                    vec3 pos = position;
                    
                    // ゆっくり浮遊する動き
                    pos.x += sin(time * 0.1 + position.y * 0.01) * 5.0;
                    pos.y += cos(time * 0.1 + position.x * 0.01) * 5.0;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (200.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    
                    float alpha = 0.3 * (1.0 - dist * 2.0);
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.dustMaterial = dustMaterial;
        
        const dust = new THREE.Points(geometry, dustMaterial);
        this.cosmicDustGroup.add(dust);
        
        this.scene.add(this.cosmicDustGroup);
    }

    // 流れ星を作成
    createShootingStar() {
        const theta = Math.random() * Math.PI * 2;
        // 上半球のみ（phiを0からPI/2に制限）
        const phi = Math.random() * Math.PI / 2.5; // やや高めの位置から
        const radius = 3000;
        
        const startPos = new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi), // これでyは常に正
            radius * Math.sin(phi) * Math.sin(theta)
        );
        
        // 流れる方向（少し下向き）
        const direction = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            -0.5 - Math.random() * 0.5,
            (Math.random() - 0.5) * 2
        ).normalize();
        
        const length = 200 + Math.random() * 300;
        const endPos = startPos.clone().add(direction.multiplyScalar(length));
        
        // 流れ星の軌跡
        const points = [];
        const segments = 30;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            points.push(new THREE.Vector3().lerpVectors(startPos, endPos, t));
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // グラデーションカラー（先頭が明るく、後ろが暗い）
        const colors = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const brightness = Math.pow(1 - t, 2);
            colors.push(brightness, brightness * 0.9, brightness * 0.7);
        }
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });
        
        const shootingStar = new THREE.Line(geometry, material);
        
        // アニメーション用データ
        shootingStar.userData = {
            life: 1,
            speed: 0.02 + Math.random() * 0.02
        };
        
        this.shootingStarsGroup = this.shootingStarsGroup || new THREE.Group();
        this.shootingStarsGroup.add(shootingStar);
        
        if (!this.shootingStarsGroup.parent) {
            this.scene.add(this.shootingStarsGroup);
        }
        
        this.shootingStars.push(shootingStar);
    }

    updateShootingStars() {
        if (!this.settings.showShootingStars) return;
        
        // 新しい流れ星を追加（頻度を大幅に上げる）
        this.shootingStarCooldown -= 0.016;
        if (this.shootingStarCooldown <= 0) {
            this.createShootingStar();
            // 0.3〜1.5秒ごとに流れ星を発生
            this.shootingStarCooldown = 0.3 + Math.random() * 1.2;
        }
        
        // 既存の流れ星を更新
        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const star = this.shootingStars[i];
            star.userData.life -= star.userData.speed;
            star.material.opacity = star.userData.life;
            
            if (star.userData.life <= 0) {
                this.shootingStarsGroup.remove(star);
                star.geometry.dispose();
                star.material.dispose();
                this.shootingStars.splice(i, 1);
            }
        }
    }

    setupEventListeners() {
        // ウィンドウリサイズ
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // マウスクリック（星の情報表示）
        window.addEventListener('click', (e) => this.onMouseClick(e));
        
        // コントロールボタン
        document.getElementById('btn-stars').addEventListener('click', (e) => {
            this.settings.showStars = !this.settings.showStars;
            e.target.classList.toggle('active');
            this.starsGroup.visible = this.settings.showStars;
        });
        
        document.getElementById('btn-milkyway').addEventListener('click', (e) => {
            this.settings.showMilkyWay = !this.settings.showMilkyWay;
            e.target.classList.toggle('active');
            this.milkyWayGroup.visible = this.settings.showMilkyWay;
        });
        
        document.getElementById('btn-constellations').addEventListener('click', (e) => {
            this.settings.showConstellations = !this.settings.showConstellations;
            e.target.classList.toggle('active');
            this.constellationsGroup.visible = this.settings.showConstellations;
        });
        
        document.getElementById('btn-shooting').addEventListener('click', (e) => {
            this.settings.showShootingStars = !this.settings.showShootingStars;
            e.target.classList.toggle('active');
            if (this.shootingStarsGroup) {
                this.shootingStarsGroup.visible = this.settings.showShootingStars;
            }
        });
        
        document.getElementById('btn-moon').addEventListener('click', (e) => {
            this.settings.showMoon = !this.settings.showMoon;
            e.target.classList.toggle('active');
            this.moonGroup.visible = this.settings.showMoon;
        });
        
        document.getElementById('btn-aurora').addEventListener('click', (e) => {
            this.settings.showAurora = !this.settings.showAurora;
            e.target.classList.toggle('active');
            this.auroraGroup.visible = this.settings.showAurora;
        });
        
        document.getElementById('btn-auto').addEventListener('click', (e) => {
            this.settings.autoRotate = !this.settings.autoRotate;
            e.target.classList.toggle('active');
            this.controls.autoRotate = this.settings.autoRotate;
        });
        
        document.getElementById('btn-music').addEventListener('click', (e) => {
            this.settings.playMusic = !this.settings.playMusic;
            e.target.classList.toggle('active');
            if (this.settings.playMusic) {
                this.startAmbientSound();
            } else {
                this.stopAmbientSound();
            }
        });
    }

    isObjectWorldVisible(object) {
        let current = object;
        while (current) {
            if (current.visible === false) return false;
            current = current.parent;
        }
        return true;
    }

    shouldShowStarInfo(data) {
        if (!data) return false;
        if (data.type && data.type !== 'star') return true; // allow moon/planets
        if (data.fromCatalog) return true;
        if (data.id && this.starCatalogMap.has(data.id)) return true;
        return false;
    }

    findNearestCatalogStar(clientX, clientY, thresholdPx = 28) {
        if (!this.catalogPickables.length) return null;
        const dom = this.renderer?.domElement;
        const screenW = dom?.clientWidth || window.innerWidth;
        const screenH = dom?.clientHeight || window.innerHeight;
        const limitSq = thresholdPx * thresholdPx;
        const worldPos = new THREE.Vector3();
        const projected = new THREE.Vector3();
        let bestData = null;
        let bestDistSq = limitSq;
        for (const mesh of this.catalogPickables) {
            if (!mesh?.userData) continue;
            if (!this.shouldShowStarInfo(mesh.userData)) continue;
            if (!this.isObjectWorldVisible(mesh)) continue;
            mesh.getWorldPosition(worldPos);
            projected.copy(worldPos).project(this.camera);
            if (projected.z < -1 || projected.z > 1) continue;
            const screenX = (projected.x + 1) * 0.5 * screenW;
            const screenY = (-projected.y + 1) * 0.5 * screenH;
            const dx = screenX - clientX;
            const dy = screenY - clientY;
            const distSq = dx * dx + dy * dy;
            if (distSq <= bestDistSq) {
                bestDistSq = distSq;
                bestData = mesh.userData;
            }
        }
        return bestData;
    }
    
    // 星クリック時の処理
    onMouseClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // 当たり判定の閾値を動的に調整（ズームレベルに応じて）
        const cameraDistance = this.camera.position.length();
        this.raycaster.params.Points.threshold = Math.max(30, 80 * (cameraDistance / 10));
        
        const intersects = this.raycaster.intersectObjects(this.clickableObjects, false);
        let selectedData = null;
        for (const hit of intersects) {
            const object = hit.object;
            if (!object?.userData) continue;
            if (!this.isObjectWorldVisible(object)) continue;
            if (!this.shouldShowStarInfo(object.userData)) continue;
            selectedData = object.userData;
            break;
        }
        
        if (!selectedData) {
            selectedData = this.findNearestCatalogStar(event.clientX, event.clientY, 32);
        }
        
        if (selectedData) {
            this.showStarInfo(selectedData);
        } else {
            this.hideStarInfo();
        }
    }
    
    showStarInfo(data) {
        const infoPanel = document.getElementById('star-info');
        const content = document.getElementById('star-info-content');
        
        let html = `<h3>✦ ${data.name}</h3>`;
        if (data.nameEn) {
            html += `<p style="opacity: 0.7; margin-top: -10px;">${data.nameEn}</p>`;
        }
        if (data.type) {
            html += `<p class="star-type">種類: ${data.type === 'planet' ? '惑星' : data.type === 'moon' ? '衛星' : '恒星'}</p>`;
        }
        const detailLines = [];
        if (data.constellation) {
            detailLines.push(`星座: ${data.constellation}`);
        }
        if (data.magnitude !== undefined) {
            const magLabel = typeof data.magnitude === 'number' ? data.magnitude.toFixed(2) : data.magnitude;
            detailLines.push(`視等級: ${magLabel}`);
        }
        if (data.distance) {
            const distanceLabel = typeof data.distance === 'number' ? data.distance.toLocaleString('ja-JP') : data.distance;
            detailLines.push(`距離: 約${distanceLabel}光年`);
        }
        if (data.spectralType) {
            detailLines.push(`スペクトル型: ${data.spectralType}`);
        }
        if (data.temperature) {
            detailLines.push(`表面温度: ${data.temperature}`);
        }
        if (data.colorHint) {
            detailLines.push(`色合い: ${data.colorHint}`);
        }
        detailLines.forEach(line => {
            html += `<p class="star-detail">${line}</p>`;
        });
        if (data.info) {
            html += `<p>${data.info}</p>`;
        }
        
        content.innerHTML = html;
        infoPanel.classList.add('visible');
        
        // 3秒後に自動で消える
        clearTimeout(this.infoTimeout);
        this.infoTimeout = setTimeout(() => {
            this.hideStarInfo();
        }, 4000);
    }
    
    hideStarInfo() {
        const infoPanel = document.getElementById('star-info');
        infoPanel.classList.remove('visible');
    }
    
    // 時刻表示の設定
    setupTimeDisplay() {
        this.updateTimeDisplay();
        setInterval(() => this.updateTimeDisplay(), 1000);
    }
    
    updateTimeDisplay() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        
        document.getElementById('current-time').textContent = timeStr;
        
        const moonState = this.calculateMoonState(now);
        this.currentMoonState = moonState;
        this.updateMoonVisuals(moonState);
        const illuminationPct = Math.round(moonState.illumination * 100);
        document.getElementById('celestial-info').textContent = `${moonState.emoji} ${moonState.phaseName} | 輝面比 ${illuminationPct}%`;
    }
    
    // アンビエントサウンド（Web Audio API）
    startAmbientSound() {
        if (this.audioContext) return;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 複数の低周波オシレーターでアンビエント音を生成
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
            
            // ゆっくりとした周波数変調
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
            document.getElementById('loading').classList.add('hidden');
        }, 1000);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const time = performance.now() * 0.001;
        
        // 星のきらめき更新
        this.starMaterials.forEach(material => {
            material.uniforms.time.value = time;
        });
        if (this.horizonRingMaterial) {
            this.horizonRingMaterial.uniforms.time.value = time;
        }
        
        // オーロラアニメーション
        this.auroraMaterials.forEach(material => {
            material.uniforms.time.value = time;
        });
        
        // 宇宙の塵アニメーション
        if (this.dustMaterial) {
            this.dustMaterial.uniforms.time.value = time;
        }

        if (this.moonUniforms) {
            this.moonUniforms.time.value = time;
        }
        if (this.moonCore) {
            this.moonCore.rotation.y = time * 0.02;
        }
        
        // 流れ星更新
        this.updateShootingStars();
        
        // コントロール更新
        this.controls.update();
        
        // レンダリング
        this.renderer.render(this.scene, this.camera);
    }
}

// アプリケーション開始
new Planetarium();

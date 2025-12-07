import * as THREE from '../three.module.js';
import { equatorialToHorizontalVector, precessEquatorialJ2000ToDate } from '../utils/astronomy.js';

const GALACTIC_NORTH_POLE = { ra: 192.85948, dec: 27.12825 }; // IAU 2009 (J2000)
const GALACTIC_CENTER = { ra: 266.4051, dec: -28.936175 };

export function createMilkyWaySystem(ctx) {
    ctx.milkyWayMaterials = [];
    ctx.milkyWayGroup = new THREE.Group();
    ctx.milkyWayLight = {
        direction: new THREE.Vector3(0, 1, 0),
        intensity: 0
    };

    const baseBasis = getBaseMilkyWayBasis();
    const baseMatrix = new THREE.Matrix4().makeBasis(baseBasis.axis, baseBasis.tangent, baseBasis.normal);
    const baseMatrixInverse = baseMatrix.clone().invert();
    const targetMatrix = new THREE.Matrix4();
    const rotationMatrix = new THREE.Matrix4();
    const rotationQuat = new THREE.Quaternion();
    let lastLst = null;
    let lastLat = ctx.observer?.lat;
    let lastBasis = null;

    createMilkyWayBandDome(ctx, baseBasis.normal, baseBasis.axis);
    createMilkyWayClusters(ctx, baseBasis.normal, baseBasis.axis);
    createMilkyWayMist(ctx, baseBasis.normal, baseBasis.axis);
    ctx.scene.add(ctx.milkyWayGroup);

    const applyGalacticOrientation = () => {
        const galacticBasis = calculateGalacticBasis(ctx);
        if (!galacticBasis) return;

        targetMatrix.makeBasis(galacticBasis.axis, galacticBasis.tangent, galacticBasis.normal);
        rotationMatrix.multiplyMatrices(targetMatrix, baseMatrixInverse);
        rotationQuat.setFromRotationMatrix(rotationMatrix);
        ctx.milkyWayGroup.setRotationFromQuaternion(rotationQuat);
        updateBandUniforms(ctx, galacticBasis);
        updateMilkyWayLight(ctx, galacticBasis);
        lastBasis = galacticBasis;
    };

    applyGalacticOrientation();

    return {
        group: ctx.milkyWayGroup,
        update(time) {
            const lst = ctx.localSiderealTime;
            const lat = ctx.observer?.lat;
            if (lastLst !== lst || lastLat !== lat) {
                lastLst = lst;
                lastLat = lat;
                applyGalacticOrientation();
            } else if (lastBasis) {
                updateMilkyWayLight(ctx, lastBasis);
            }
            ctx.milkyWayMaterials.forEach(material => {
                if (material.uniforms?.time) {
                    material.uniforms.time.value = time;
                }
            });
        }
    };
}

function createMilkyWayBandDome(ctx, bandNormal, bandAxis) {
    const bandTangent = new THREE.Vector3().crossVectors(bandNormal, bandAxis).normalize();
    const geometry = new THREE.SphereGeometry(9000, 64, 64);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            bandNormal: { value: bandNormal },
            bandAxis: { value: bandAxis },
            bandTangent: { value: bandTangent },
            coreVisibility: { value: 1 },
            colorWarm: { value: new THREE.Color(0.98, 0.78, 0.64) },
            colorCool: { value: new THREE.Color(0.68, 0.82, 1.0) },
            colorCore: { value: new THREE.Color(1.08, 0.96, 0.88) },
            brightnessBoost: { value: 1.25 },
            alphaBoost: { value: 1.1 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vWorldPosition;
            uniform vec3 bandNormal;
            uniform vec3 bandAxis;
            uniform vec3 bandTangent;
            uniform float coreVisibility;
            uniform vec3 colorWarm;
            uniform vec3 colorCool;
            uniform vec3 colorCore;
            uniform float time;
            uniform float brightnessBoost;
            uniform float alphaBoost;
            float hash(vec3 p) {
                return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
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
                float v = 0.0;
                float amp = 0.5;
                float freq = 1.4;
                for (int i = 0; i < 5; i++) {
                    v += amp * noise(p * freq);
                    freq *= 2.2;
                    amp *= 0.55;
                }
                return v;
            }
            void main() {
                vec3 dir = normalize(vWorldPosition);
                if (dir.y <= 0.0) discard;
                float dist = dot(dir, bandNormal);
                float base = exp(-pow(abs(dist) * 3.4, 1.35));
                vec3 uvw = vec3(
                    dot(dir, bandAxis),
                    dot(dir, bandTangent),
                    dist
                );
                float coarse = fbm(uvw * 6.0 + vec3(0.0, time * 0.07, 0.0));
                float fine = fbm(uvw * 16.0 + vec3(time * 0.03, 0.0, time * 0.02));
                float filaments = fbm(uvw * 24.0 + vec3(1.7, time * 0.04, 2.3));
                float dust = smoothstep(0.32, 0.75, fbm(uvw * 12.0 + vec3(3.1, time * 0.05, -2.8)));
                float brightness = base * (0.25 + 0.8 * coarse + 0.35 * fine);
                float along = uvw.x * 0.5 + 0.5;
                float centerGradient = mix(0.38, 1.0, pow(clamp(along, 0.0, 1.0), 0.75));
                float centerSide = smoothstep(0.28, 0.92, along);
                float seasonalFade = mix(0.45, 1.0, coreVisibility);
                float coreLift = mix(0.78, 1.55, coreVisibility);
                brightness *= seasonalFade;
                brightness *= centerGradient;
                brightness *= mix(1.0, coreLift, centerSide);
                brightness *= (1.0 - dust * 0.42);
                brightness *= 0.85 + filaments * 0.2;
                brightness = clamp(brightness * brightnessBoost, 0.0, 2.4);
                float warmMix = smoothstep(0.08, 0.8, base);
                warmMix += 0.25 * sin((along + time * 0.004) * 6.2831);
                warmMix = clamp(warmMix, 0.0, 1.0);
                vec3 color = mix(colorCool, colorWarm, warmMix);
                color = mix(color, colorCore, smoothstep(0.3, 0.95, base) * 0.55 + filaments * 0.15);
                color *= 1.05 + filaments * 0.05;
                float alpha = brightness * 0.65 * alphaBoost;
                alpha *= mix(0.65, 1.1, coreVisibility * centerSide);
                alpha *= smoothstep(0.0, 0.18, dir.y);
                if (alpha < 0.002) discard;
                gl_FragColor = vec4(color * brightness, clamp(alpha, 0.0, 1.0));
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide
    });
    ctx.milkyWayMaterials.push(material);
    const dome = new THREE.Mesh(geometry, material);
    ctx.milkyWayGroup.add(dome);
}

function createMilkyWayClusters(ctx, bandNormal, bandAxis) {
    const bandBinormal = new THREE.Vector3().crossVectors(bandNormal, bandAxis).normalize();
    const radius = 5500;
    const gaussRandom = () => {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };
    const layers = [
        { count: 42000, spread: 620, size: [0.5, 1.4], tint: new THREE.Color(0.76, 0.84, 1.0) },
        { count: 22000, spread: 880, size: [0.9, 2.6], tint: new THREE.Color(1.0, 0.86, 0.76) },
        { count: 12000, spread: 1200, size: [1.6, 3.6], tint: new THREE.Color(1.05, 0.94, 0.88) }
    ];
    layers.forEach(layer => {
        const positions = [];
        const colors = [];
        const sizes = [];
        const phases = [];
        let attempts = 0;
        while (positions.length / 3 < layer.count && attempts < layer.count * 4) {
            attempts++;
            const t = Math.random() * Math.PI * 2;
            const longitudeBias = Math.pow(0.5 + 0.5 * Math.cos(t), 1.35);
            if (Math.random() > 0.25 + 0.75 * longitudeBias) continue;
            const radialDir = new THREE.Vector3()
                .copy(bandAxis).multiplyScalar(Math.cos(t))
                .add(bandBinormal.clone().multiplyScalar(Math.sin(t)))
                .normalize();
            const spineWave = Math.sin(t * 3.1) * 0.35 + Math.sin(t * 6.3) * 0.15;
            const offset = (gaussRandom() * 0.55 + spineWave * 0.6) * layer.spread;
            const radialJitter = gaussRandom() * 0.06 * radius;
            const position = radialDir.clone().multiplyScalar(radius + radialJitter).add(bandNormal.clone().multiplyScalar(offset));
            if (position.y < 0) continue;
            positions.push(position.x, position.y, position.z);
            const proximity = Math.exp(-Math.abs(offset) / (layer.spread * 0.82));
            const randomWarm = 0.2 + Math.random() * 0.6;
            const color = layer.tint.clone();
            color.lerp(new THREE.Color(1.0, 0.88, 0.76), proximity * randomWarm * 0.6);
            color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
            color.multiplyScalar(0.9 + longitudeBias * 0.4);
            color.setRGB(
                THREE.MathUtils.clamp(color.r, 0, 1.4),
                THREE.MathUtils.clamp(color.g, 0, 1.4),
                THREE.MathUtils.clamp(color.b, 0, 1.4)
            );
            colors.push(color.r, color.g, color.b);
            const baseSize = layer.size[0] + Math.pow(Math.random(), 2) * (layer.size[1] - layer.size[0]);
            sizes.push((baseSize + proximity * 0.8) * (0.75 + longitudeBias * 0.65));
            phases.push(Math.random() * Math.PI * 2);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('twinklePhase', new THREE.Float32BufferAttribute(phases, 1));
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                intensity: { value: 1.25 },
                bandAxis: { value: bandAxis },
                coreVisibility: { value: 1 }
            },
            vertexShader: `
                attribute float size;
                attribute float twinklePhase;
                varying vec3 vColor;
                varying float vCoreBias;
                uniform vec3 bandAxis;
                uniform float time;
                void main() {
                    vColor = color;
                    vec3 axis = normalize(bandAxis);
                    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                    vCoreBias = dot(normalize(worldPos), axis) * 0.5 + 0.5;
                    float sparkle = 0.6 + 0.4 * sin(time * 1.4 + twinklePhase);
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * sparkle * (260.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vCoreBias;
                uniform float intensity;
                uniform float coreVisibility;
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    float halo = exp(-dist * 4.0);
                    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                    float coreSide = smoothstep(0.35, 0.95, vCoreBias);
                    float visibility = mix(0.45, 1.0, coreVisibility);
                    float boost = mix(0.85, 1.35, coreVisibility * coreSide);
                    vec3 color = vColor * (alpha + halo * 0.6) * intensity * visibility * boost;
                    float finalAlpha = clamp((alpha * 0.85 + halo * 0.35) * intensity * visibility * boost, 0.0, 1.0);
                    gl_FragColor = vec4(color, finalAlpha);
                }
            `,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        ctx.milkyWayMaterials.push(material);
        const stars = new THREE.Points(geometry, material);
        ctx.milkyWayGroup.add(stars);
    });
}

function createMilkyWayMist(ctx, bandNormal, bandAxis) {
    const bandBinormal = new THREE.Vector3().crossVectors(bandNormal, bandAxis).normalize();
    const radius = 5200;
    const patches = 18;
    const baseGeometry = new THREE.PlaneGeometry(1600, 1000, 1, 1);
    let created = 0;
    let attempts = 0;
    while (created < patches && attempts < patches * 6) {
        attempts++;
        const t = (created / patches) * Math.PI * 2 + Math.random() * 0.35;
        const longitudeBias = Math.pow(0.5 + 0.5 * Math.cos(t), 1.35);
        if (Math.random() > 0.35 + 0.65 * longitudeBias) continue;
        const radialDir = new THREE.Vector3()
            .copy(bandAxis).multiplyScalar(Math.cos(t))
            .add(bandBinormal.clone().multiplyScalar(Math.sin(t)))
            .normalize();
        const heightWave = Math.sin(t * 2.5) * 0.5 + Math.sin(t * 5.7) * 0.25;
        const offset = (Math.random() - 0.5 + heightWave * 0.4) * 700;
        const distance = radius + (Math.random() - 0.5) * 350;
        const position = radialDir.clone().multiplyScalar(distance).add(bandNormal.clone().multiplyScalar(offset));
        if (position.y < 0) continue;
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                colorA: { value: new THREE.Color(0.86 + Math.random() * 0.08, 0.74 + Math.random() * 0.08, 0.94) },
                colorB: { value: new THREE.Color(0.64, 0.86, 1.0) },
                intensity: { value: (0.42 + Math.random() * 0.25) * (0.7 + longitudeBias * 0.7) },
                bandAxis: { value: bandAxis },
                coreVisibility: { value: 1 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying float vCoreBias;
                uniform vec3 bandAxis;
                void main() {
                    vUv = uv;
                    vec3 axis = normalize(bandAxis);
                    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                    vCoreBias = dot(normalize(worldPos), axis) * 0.5 + 0.5;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying float vCoreBias;
                uniform float time;
                uniform vec3 colorA;
                uniform vec3 colorB;
                uniform float intensity;
                uniform float coreVisibility;
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }
                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    float a = hash(i);
                    float b = hash(i + vec2(1.0, 0.0));
                    float c = hash(i + vec2(0.0, 1.0));
                    float d = hash(i + vec2(1.0, 1.0));
                    float u = mix(a, b, f.x);
                    float v = mix(c, d, f.x);
                    return mix(u, v, f.y);
                }
                float fbm(vec2 p) {
                    float v = 0.0;
                    float amp = 0.6;
                    float freq = 1.2;
                    for (int i = 0; i < 5; i++) {
                        v += amp * noise(p * freq);
                        freq *= 2.0;
                        amp *= 0.55;
                    }
                    return v;
                }
                void main() {
                    vec2 p = vUv * 2.0 - 1.0;
                    p.x *= 1.6;
                    float drift = time * 0.02;
                    float band = exp(-pow(abs(p.y) * 1.6, 1.2));
                    float cloud = fbm(p * 1.8 + vec2(drift, -drift * 0.7));
                    float filaments = fbm(p * 4.5 + vec2(-drift * 0.3, drift * 0.5));
                    float alpha = band * (0.35 + 0.65 * cloud) * intensity;
                    alpha *= 1.0 - smoothstep(0.55, 1.0, abs(p.x));
                    alpha *= 1.0 - smoothstep(0.35, 0.9, filaments);
                    if (alpha < 0.01) discard;
                    vec3 color = mix(colorB, colorA, 0.5 + 0.5 * cloud);
                    color += filaments * 0.32;
                    color *= 1.05;
                    float visibility = mix(0.45, 1.0, coreVisibility);
                    float centerBias = smoothstep(0.32, 0.92, vCoreBias);
                    float boost = mix(0.85, 1.35, coreVisibility * centerBias);
                    color *= mix(0.9, 1.1, coreVisibility * centerBias);
                    gl_FragColor = vec4(color, clamp(alpha * visibility * boost, 0.0, 1.0));
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        ctx.milkyWayMaterials.push(material);
        const patch = new THREE.Mesh(baseGeometry, material);
        patch.position.copy(position);
        patch.lookAt(0, 0, 0);
        patch.rotation.z += Math.random() * Math.PI * 2;
        patch.scale.setScalar((0.85 + Math.random() * 0.5) * (0.75 + longitudeBias * 0.6));
        ctx.milkyWayGroup.add(patch);
        created++;
    }
}

function getBaseMilkyWayBasis() {
    const orientation = new THREE.Euler(
        THREE.MathUtils.degToRad(58),
        THREE.MathUtils.degToRad(38),
        THREE.MathUtils.degToRad(12),
        'XYZ'
    );
    const normal = new THREE.Vector3(0, 1, 0).applyEuler(orientation).normalize();
    const axis = new THREE.Vector3(1, 0, 0).applyEuler(orientation).normalize();
    const tangent = new THREE.Vector3().crossVectors(normal, axis).normalize();
    return { normal, axis, tangent };
}

export function calculateGalacticBasis(ctx) {
    if (!ctx?.observer) return null;
    const simulatedDate = ctx.getSimulatedDate?.() ?? new Date();
    const galacticNorth = precessEquatorialJ2000ToDate(
        GALACTIC_NORTH_POLE.ra,
        GALACTIC_NORTH_POLE.dec,
        simulatedDate
    );
    const galacticCenter = precessEquatorialJ2000ToDate(
        GALACTIC_CENTER.ra,
        GALACTIC_CENTER.dec,
        simulatedDate
    );
    const normalResult = equatorialToHorizontalVector(
        galacticNorth?.ra,
        galacticNorth?.dec,
        ctx.localSiderealTime ?? 0,
        ctx.observer.lat
    );
    const centerResult = equatorialToHorizontalVector(
        galacticCenter?.ra,
        galacticCenter?.dec,
        ctx.localSiderealTime ?? 0,
        ctx.observer.lat
    );
    const normal = normalResult?.vector;
    const centerDir = centerResult?.vector;
    if (!normal || !centerDir) return null;

    let axis = centerDir.clone().sub(normal.clone().multiplyScalar(centerDir.dot(normal)));
    if (axis.lengthSq() < 1e-8) {
        axis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), normal);
        if (axis.lengthSq() < 1e-8) {
            axis = new THREE.Vector3(1, 0, 0);
        }
    }
    axis.normalize();
    const tangent = new THREE.Vector3().crossVectors(normal, axis).normalize();
    return { normal, axis, tangent, centerDir };
}

function calculateCoreVisibility(centerDir) {
    if (!centerDir) return 1;
    const altitude = THREE.MathUtils.clamp(centerDir.y, -1, 1);
    const horizonFactor = THREE.MathUtils.clamp((altitude + 0.05) / 0.65, 0, 1);
    return Math.pow(horizonFactor, 0.6);
}

function updateMilkyWayLight(ctx, basis) {
    if (!ctx?.milkyWayLight) return;
    const direction = basis?.centerDir;
    if (direction) {
        ctx.milkyWayLight.direction.copy(direction).normalize();
    }
    const visibility = calculateCoreVisibility(direction);
    const altitudeBoost = THREE.MathUtils.clamp((direction?.y ?? 0) * 0.65 + 0.45, 0.2, 1.0);
    const enabled = ctx.settings?.showMilkyWay !== false;
    const intensity = enabled
        ? THREE.MathUtils.clamp((0.12 + visibility * 0.9) * altitudeBoost, 0, 1.1)
        : 0;
    ctx.milkyWayLight.intensity = intensity;
}

function updateBandUniforms(ctx, basis) {
    const coreVisibility = calculateCoreVisibility(basis?.centerDir);
    ctx.milkyWayMaterials.forEach(material => {
        const uniforms = material.uniforms;
        if (!uniforms) return;
        if (uniforms.bandNormal?.value) {
            uniforms.bandNormal.value.copy(basis.normal);
        }
        if (uniforms.bandAxis?.value) {
            uniforms.bandAxis.value.copy(basis.axis);
        }
        if (uniforms.bandTangent?.value) {
            uniforms.bandTangent.value.copy(basis.tangent);
        }
        if (typeof uniforms.coreVisibility?.value === 'number') {
            uniforms.coreVisibility.value = coreVisibility;
        }
    });
}

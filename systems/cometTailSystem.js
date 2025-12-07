import * as THREE from '../three.module.js';
import { calculateHalleyState } from '../utils/cometEphemeris.js';

const PARTICLE_COUNT = 1400;
const BASE_LENGTH = 5200;
const BASE_RADIUS = 620;
const BASE_FORWARD = new THREE.Vector3(0, 0, -1);

export function createCometTailSystem(ctx) {
    const group = new THREE.Group();
    group.visible = false;
    ctx.scene.add(group);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 16,
        transparent: true,
        opacity: 0.82,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    group.add(points);

    const comaSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: createComaTexture(),
        color: new THREE.Color('#8ae5ff'),
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    }));
    comaSprite.scale.set(220, 220, 1);
    group.add(comaSprite);

    const coreSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: createCoreTexture(),
        color: new THREE.Color('#e8ffff'),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    }));
    coreSprite.scale.set(80, 80, 1);
    coreSprite.userData = {
        name: 'ハレー彗星',
        nameEn: "Halley's Comet",
        type: 'comet'
    };
    group.add(coreSprite);
    ctx.clickableObjects.push(coreSprite);

    populateTail(points, { intensity: 1, tint: '#b7f0ff', activity: 1 });

    const state = {
        enabled: false,
        intensity: 1,
        tint: '#b7f0ff',
        lastActivity: null,
        current: null
    };

    const tailAxis = new THREE.Vector3();
    const tempQuat = new THREE.Quaternion();

    const applyTint = () => {
        comaSprite.material.color.set(state.tint);
        coreSprite.material.color.set(state.tint);
    };

    const refreshTail = (activity = 1) => {
        populateTail(points, { intensity: state.intensity, tint: state.tint, activity });
        state.lastActivity = activity;
    };

    const updateAppearance = (activity) => {
        const sizeScale = (0.78 + state.intensity * 0.72) * (0.75 + activity * 0.55);
        group.scale.setScalar(sizeScale);
        points.material.opacity = THREE.MathUtils.clamp(0.48 + activity * 0.42, 0.35, 0.95);
        points.material.size = 12 + activity * 8;
        comaSprite.material.opacity = THREE.MathUtils.clamp(0.18 + activity * 0.32, 0.18, 0.7);
        const comaScale = 180 + activity * 160;
        comaSprite.scale.set(comaScale, comaScale, 1);
        const coreScale = 48 + activity * 40;
        coreSprite.scale.set(coreScale, coreScale, 1);
    };

    const updateInfo = (halleyState) => {
        if (!halleyState) return;
        coreSprite.userData.info = [
            `高度 ${halleyState.altDeg.toFixed(1)}° / 方位 ${halleyState.azDeg.toFixed(1)}°`,
            `赤経 ${halleyState.raDeg.toFixed(2)}° / 赤緯 ${halleyState.decDeg.toFixed(2)}°`,
            `地心距離 ${halleyState.distanceAu.toFixed(3)} AU`,
            `日心距離 ${halleyState.heliocentricDistanceAu.toFixed(3)} AU`
        ].join(' / ');
    };

    const getDate = () => (typeof ctx.getSimulatedDate === 'function' ? ctx.getSimulatedDate() : new Date());

    return {
        setEnabled(enabled = true, params = {}) {
            state.enabled = !!enabled;
            if (params.intensity !== undefined) {
                state.intensity = params.intensity;
            }
            if (params.tint) {
                state.tint = params.tint;
            }
            applyTint();
            if (state.enabled) {
                const activity = calculateActivity(
                    calculateHalleyState(getDate(), ctx.observer, ctx.localSiderealTime)
                );
                refreshTail(Number.isFinite(activity) ? activity : 1);
            }
        },
        setIntensity(intensity = 1) {
            state.intensity = intensity;
            if (state.enabled) {
                refreshTail(state.lastActivity ?? calculateActivity(state.current) ?? 1);
            }
        },
        setTint(tint) {
            state.tint = tint || state.tint;
            applyTint();
            if (state.enabled) {
                refreshTail(state.lastActivity ?? calculateActivity(state.current) ?? 1);
            }
        },
        update(_, delta) {
            if (!state.enabled) {
                group.visible = false;
                return;
            }

            const halleyState = calculateHalleyState(getDate(), ctx.observer, ctx.localSiderealTime);
            state.current = halleyState;
            const visible = !!halleyState && halleyState.altDeg > -15;
            group.visible = visible;
            if (!visible) return;

            group.position.copy(halleyState.position);
            group.lookAt(0, 0, 0);

            const sunVec = halleyState.sunVector || ctx.sunSystem?.getCurrentState?.().position;
            if (sunVec) {
                tailAxis.copy(halleyState.position).sub(sunVec).normalize();
                if (tailAxis.lengthSq() > 1e-8) {
                    tempQuat.setFromUnitVectors(BASE_FORWARD, tailAxis);
                    group.quaternion.copy(tempQuat);
                }
            }

            const activity = calculateActivity(halleyState);
            if (state.lastActivity === null || Math.abs(activity - state.lastActivity) > 0.08) {
                refreshTail(activity);
            }
            updateAppearance(activity);
            updateInfo(halleyState);

            const wobble = 0.02 * (1 + state.intensity * 0.4);
            group.rotateOnAxis(BASE_FORWARD, delta * wobble);
        }
    };
}

function calculateActivity(state) {
    if (!state) return 0.6;
    const perihelionBoost = THREE.MathUtils.clamp(1.4 - state.heliocentricDistanceAu * 0.55, 0.35, 1.55);
    const proximityBoost = THREE.MathUtils.clamp(1.1 - state.distanceAu * 0.2, 0.5, 1.4);
    return perihelionBoost * proximityBoost;
}

function populateTail(points, { intensity = 1, tint = '#b7f0ff', activity = 1 } = {}) {
    const positions = points.geometry.attributes.position.array;
    const colors = points.geometry.attributes.color.array;
    const color = new THREE.Color(tint);
    const length = BASE_LENGTH * (0.65 + intensity * 0.7) * (0.75 + activity * 0.5);
    const radius = BASE_RADIUS * (0.45 + intensity * 0.55) * (0.7 + activity * 0.35);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const t = Math.random();
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius * (1 - t * 0.45);
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        const z = -t * length;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const fade = Math.pow(1 - t, 1.8) * (0.68 + 0.32 * Math.random());
        colors[i * 3] = color.r * fade;
        colors[i * 3 + 1] = color.g * fade;
        colors[i * 3 + 2] = color.b * fade;
    }

    points.geometry.attributes.position.needsUpdate = true;
    points.geometry.attributes.color.needsUpdate = true;
}

function createComaTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx2d = canvas.getContext('2d');
    const center = size / 2;
    const gradient = ctx2d.createRadialGradient(center, center, size * 0.05, center, center, size * 0.48);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.55)');
    gradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx2d.fillStyle = gradient;
    ctx2d.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createCoreTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx2d = canvas.getContext('2d');
    const center = size / 2;
    const gradient = ctx2d.createRadialGradient(center, center, size * 0.05, center, center, size * 0.32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.92)');
    gradient.addColorStop(0.75, 'rgba(255, 255, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx2d.fillStyle = gradient;
    ctx2d.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

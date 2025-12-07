import * as THREE from '../three.module.js';
import { calculatePlanetaryStates, PLANET_DEFINITIONS } from '../utils/planetEphemeris.js';

export function createPlanetSystem(ctx) {
    ctx.planetGroup = new THREE.Group();
    ctx.scene.add(ctx.planetGroup);

    const meshes = new Map();
    const sprites = new Map();
    const planetMaterial = (color) => new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.55,
        metalness: 0.1
    });
    const glowTexture = createDiscTexture();

    for (const planet of PLANET_DEFINITIONS) {
        const geometry = new THREE.SphereGeometry(planet.radius, 64, 64);
        const material = planetMaterial(planet.color);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = {
            type: 'planet',
            name: planet.name,
            nameEn: planet.nameEn,
            id: planet.id
        };
        const spriteMat = new THREE.SpriteMaterial({
            map: glowTexture,
            color: new THREE.Color(planet.color),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.userData = mesh.userData;
        ctx.planetGroup.add(sprite);
        ctx.clickableObjects.push(sprite);

        // 球は不可視のヒットボックスとして保持（将来の拡張用）
        mesh.visible = false;
        ctx.planetGroup.add(mesh);

        meshes.set(planet.id, mesh);
        sprites.set(planet.id, sprite);
    }

    const cache = { timestamp: null, states: null };
    const getDate = () => (typeof ctx.getSimulatedDate === 'function' ? ctx.getSimulatedDate() : new Date());

    const computeStates = () => {
        const date = getDate();
        const ts = date.getTime();
        if (cache.timestamp === ts && cache.states) {
            return cache.states;
        }
        const states = calculatePlanetaryStates(date, ctx.observer, ctx.localSiderealTime);
        cache.timestamp = ts;
        cache.states = states;
        return states;
    };

    const updateVisuals = (states) => {
        for (const planet of PLANET_DEFINITIONS) {
            const mesh = meshes.get(planet.id);
            const sprite = sprites.get(planet.id);
            const state = states?.[planet.id];
            if (!mesh || !sprite || !state) continue;

            sprite.position.copy(state.position);
            sprite.lookAt(0, 0, 0);
            const visible = (ctx.settings?.showPlanets ?? true) && state.altDeg > -5;
            sprite.visible = visible;
            mesh.visible = false;

            // 視等級に応じてサイズと輝度を調整
            const mag = state.apparentMagnitude ?? 5;
            const refMag = -2;
            const brightness = Math.pow(10, -0.4 * (mag - refMag));
            const size = THREE.MathUtils.clamp(14 + brightness * 65, 10, 180);
            const opacity = THREE.MathUtils.clamp(0.25 + brightness * 0.18, 0.2, 1.0);
            sprite.scale.set(size, size, 1);
            sprite.material.opacity = opacity;

            const illumPct = Math.round(state.illumination * 100);
            const distanceAu = state.distanceAu?.toFixed(3) ?? '—';
            const magnitudeLabel = `視等級 ${mag.toFixed(1)}`;
            sprite.userData.magnitude = magnitudeLabel;
            sprite.userData.info = [
                magnitudeLabel,
                `高度 ${state.altDeg.toFixed(1)}° / 方位 ${state.azDeg.toFixed(1)}°`,
                `赤経 ${state.raDeg.toFixed(2)}° / 赤緯 ${state.decDeg.toFixed(2)}°`,
                `地心距離 ${distanceAu} AU`
            ].join(' / ');
        }
    };

    updateVisuals(computeStates());

    return {
        group: ctx.planetGroup,
        getState(id) {
            const states = computeStates();
            return states[id];
        },
        update() {
            updateVisuals(computeStates());
        }
    };
}

function createDiscTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx2d = canvas.getContext('2d');
    const center = size / 2;
    const grad = ctx2d.createRadialGradient(center, center, size * 0.1, center, center, size * 0.48);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.8)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx2d.fillStyle = grad;
    ctx2d.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

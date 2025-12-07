import * as THREE from '../three.module.js';
import { calculatePlanetaryStates, PLANET_DEFINITIONS } from '../utils/planetEphemeris.js';

export function createPlanetSystem(ctx) {
    ctx.planetGroup = new THREE.Group();
    ctx.scene.add(ctx.planetGroup);

    const meshes = new Map();
    const sprites = new Map();
    const pickMeshes = new Map();
    const planetMaterial = (color) => new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.55,
        metalness: 0.1
    });
    const glowTexture = createDiscTexture();
    const pickMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false
    });
    const pickGeometry = new THREE.SphereGeometry(1, 16, 16);

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
        const pickMesh = new THREE.Mesh(pickGeometry, pickMaterial.clone());
        pickMesh.userData = mesh.userData;
        pickMesh.visible = true;
        pickMesh.frustumCulled = false;
        const spriteMat = new THREE.SpriteMaterial({
            map: glowTexture,
            color: new THREE.Color(planet.color).lerp(new THREE.Color(0xffffff), 0.55),
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
        ctx.planetGroup.add(pickMesh);
        ctx.clickableObjects.push(pickMesh);

        meshes.set(planet.id, mesh);
        sprites.set(planet.id, sprite);
        pickMeshes.set(planet.id, pickMesh);
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
            const pickMesh = pickMeshes.get(planet.id);
            const state = states?.[planet.id];
            if (!mesh || !sprite || !pickMesh || !state) continue;

            sprite.position.copy(state.position);
            sprite.lookAt(0, 0, 0);
            const visible = (ctx.settings?.showPlanets ?? true) && state.altDeg > -5;
            sprite.visible = visible;
            mesh.visible = false;

            // 視等級に応じてサイズと輝度を調整
            const mag = state.apparentMagnitude ?? 5;
            const brightness = THREE.MathUtils.clamp(2.6 - mag * 0.35, 0.45, 1.75);
            const size = THREE.MathUtils.clamp(10 + brightness * 12, 10, 220);
            const opacity = THREE.MathUtils.clamp(0.35 + brightness * 0.28, 0.35, 1.0);
            sprite.scale.set(size, size, 1);
            sprite.material.opacity = opacity;
            pickMesh.position.copy(state.position);
            pickMesh.visible = visible;
            const pickScale = Math.max(planet.radius * 6, size * 0.5);
            pickMesh.scale.setScalar(pickScale);

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

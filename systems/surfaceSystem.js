import * as THREE from '../three.module.js';
import { createWaterSurface } from './surfaces/waterSurface.js';
import { createDesertSurface } from './surfaces/desertSurface.js';
import { createIceSurface } from './surfaces/iceSurface.js';

export function createSurfaceSystem(ctx, moonStateProvider) {
    const group = new THREE.Group();
    ctx.surfaceGroup = group;
    ctx.scene.add(group);

    const surfaces = new Map();
    let activeSurface = null;

    const registerSurface = (surface) => {
        if (!surface?.type || !surface.meshes?.length) return;
        surfaces.set(surface.type, surface);
        surface.meshes.forEach((mesh) => {
            mesh.visible = false;
            group.add(mesh);
        });
    };

    registerSurface(createWaterSurface(ctx));
    registerSurface(createDesertSurface(ctx));
    registerSurface(createIceSurface(ctx));

    const setSurfaceType = (type = 'water') => {
        const normalizedType = type === 'land' ? 'desert' : type;
        const nextSurface = surfaces.get(normalizedType) ?? surfaces.values().next().value ?? null;
        activeSurface = nextSurface;
        surfaces.forEach((surface) => {
            surface.setActive?.(surface === activeSurface);
        });
    };

    const update = (time) => {
        if (!activeSurface) return;
        const moonState = moonStateProvider?.();
        activeSurface.update?.(time, moonState);
    };

    const system = {
        group,
        registerSurface,
        setSurfaceType,
        update
    };

    setSurfaceType(ctx.settings?.surfaceType ?? 'water');

    return system;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../three.module.js';
import { AstroCatalog } from '../astroCatalog.js';
import { createConstellationSystem } from '../systems/constellationSystem.js';
import { equatorialToHorizontalVector } from '../utils/astronomy.js';

const createCanvas = () => {
    const gradient = { addColorStop() {} };
    return {
        width: 0,
        height: 0,
        getContext: () => ({
            createRadialGradient: () => gradient,
            fillRect() {},
            fillStyle: ''
        })
    };
};

test('constellation visuals are batched without dropping interactive stars', () => {
    const previousDocument = globalThis.document;
    globalThis.document = { createElement: createCanvas };
    try {
        const catalog = AstroCatalog.createDefault();
        const ctx = {
            scene: new THREE.Scene(),
            catalog,
            localSiderealTime: 120,
            observer: { lat: 35, lon: 139 },
            settings: { showConstellations: true },
            clickableObjects: [],
            catalogPickables: []
        };
        const system = createConstellationSystem(ctx);
        const renderables = [];
        system.group.traverse((object) => {
            if (object.isPoints || object.isLineSegments || object.isMesh || object.isSprite) {
                renderables.push(object);
            }
        });

        const pointLayers = renderables.filter((object) => object.isPoints);
        const lineLayer = renderables.find((object) => object.isLineSegments);
        assert.equal(pointLayers.length, 3);
        assert.ok(pointLayers.every((object) => object.geometry === pointLayers[0].geometry));
        assert.ok(pointLayers.every((object) => object.material.fog));
        assert.ok(pointLayers.every((object) => object.material.uniforms.fogColor));
        assert.ok(pointLayers.every((object) => object.material.uniforms.fogDensity));
        assert.equal(renderables.filter((object) => object.isLineSegments).length, 1);
        assert.equal(renderables.length, 4);
        const expectedStarIds = new Set([
            ...catalog.getFeaturedStars().map((star) => star.id),
            ...catalog.getConstellations().flatMap((constellation) => constellation.starIds)
        ].filter((id) => catalog.getStar(id)));
        assert.equal(ctx.catalogPickables.length, expectedStarIds.size);
        assert.equal(pointLayers[0].geometry.getAttribute('position').count, expectedStarIds.size);
        assert.ok(lineLayer.geometry.drawRange.count > 0);
        assert.equal(lineLayer.geometry.drawRange.count % 2, 0);
        assert.ok(ctx.catalogPickables.every((anchor) => anchor.userData.fromCatalog));

        ctx.localSiderealTime = 250;
        system.update(1);
        const positions = pointLayers[0].geometry.getAttribute('position').array;
        ctx.catalogPickables.forEach((anchor, index) => {
            const expected = equatorialToHorizontalVector(
                anchor.userData.ra,
                anchor.userData.dec,
                ctx.localSiderealTime,
                ctx.observer.lat,
                5000
            ).vector;
            const offset = index * 3;
            assert.equal(positions[offset], Math.fround(expected.x));
            assert.equal(positions[offset + 1], Math.fround(expected.y));
            assert.equal(positions[offset + 2], Math.fround(expected.z));
        });
    } finally {
        globalThis.document = previousDocument;
    }
});

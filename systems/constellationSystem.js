import * as THREE from 'three';
import { equatorialToHorizontalVector } from '../utils/astronomy.js';

export function createConstellationSystem(ctx) {
    ctx.constellationsGroup = new THREE.Group();
    ctx.constellationLines = [];
    const radius = 5000;
    const starEntries = new Map();
    const lineEntries = [];
    let lastLst = null;

    const ensureStar = (starId) => {
        if (starEntries.has(starId)) {
            return starEntries.get(starId);
        }
        const data = ctx.catalog.getStar(starId);
        if (!data) return null;
        const size = getStarSizeFromMagnitude(data.magnitude);
        const starGeometry = new THREE.SphereGeometry(size, 16, 16);
        const starMaterial = new THREE.MeshBasicMaterial({
            color: data.color || 0xffffee,
            transparent: true,
            opacity: 1.0
        });
        const star = new THREE.Mesh(starGeometry, starMaterial);
        const glow = createStarGlow(ctx, data, size);
        if (glow) {
            star.add(glow);
        }
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
            fromCatalog: true,
            ra: data.ra,
            dec: data.dec
        };
        ctx.constellationsGroup.add(star);
        ctx.clickableObjects.push(star);
        ctx.catalogPickables.push(star);
        const entry = {
            id: data.id,
            star,
            data,
            position: new THREE.Vector3(),
            aboveHorizon: false,
            glow
        };
        starEntries.set(data.id, entry);
        updateStarEntry(ctx, entry, radius);
        return entry;
    };
    ctx.catalog.getFeaturedStars().forEach(star => {
        ensureStar(star.id);
    });
    const constellations = ctx.catalog.getConstellations();
    constellations.forEach(constellation => {
        constellation.starIds.forEach(starId => ensureStar(starId));
        constellation.lines.forEach(([startId, endId]) => {
            const startEntry = ensureStar(startId);
            const endEntry = ensureStar(endId);
            if (!startEntry || !endEntry) return;
            const lineGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(6);
            lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const lineMaterial = new THREE.LineBasicMaterial({
                color: constellation.color || 0x4488ff,
                transparent: true,
                opacity: 0.35,
                blending: THREE.AdditiveBlending
            });
            const line = new THREE.Line(lineGeometry, lineMaterial);
            line.userData = { horizonVisible: true };
            ctx.constellationsGroup.add(line);
            ctx.constellationLines.push(line);
            const entry = { line, startId, endId };
            lineEntries.push(entry);
            updateLineEntry(entry, starEntries);
        });
    });
    ctx.scene.add(ctx.constellationsGroup);
    updateConstellationLinesVisibility(ctx, ctx.settings.showConstellations);
    lastLst = ctx.localSiderealTime;
    return {
        group: ctx.constellationsGroup,
        updateVisibility(visible) {
            updateConstellationLinesVisibility(ctx, visible);
        },
        update(time = 0) {
            const lstChanged = lastLst !== ctx.localSiderealTime;
            if (lstChanged) {
                lastLst = ctx.localSiderealTime;
                starEntries.forEach(entry => updateStarEntry(ctx, entry, radius));
                lineEntries.forEach(entry => updateLineEntry(entry, starEntries));
                updateConstellationLinesVisibility(ctx, ctx.settings.showConstellations);
            }
            starEntries.forEach(entry => animateStarGlow(entry, time));
        }
    };
}

function updateConstellationLinesVisibility(ctx, visible) {
    ctx.constellationLines.forEach(line => {
        const horizonVisible = line.userData?.horizonVisible ?? true;
        line.visible = visible && horizonVisible;
    });
}

function getStarSizeFromMagnitude(magnitude) {
    const mag = magnitude ?? 2.5;
    const brightness = THREE.MathUtils.clamp(2.2 - mag, -1.5, 2.2);
    return 10 + brightness * 5;
}

function updateStarEntry(ctx, entry, radius) {
    const result = equatorialToHorizontalVector(
        entry.data.ra,
        entry.data.dec,
        ctx.localSiderealTime,
        ctx.observer.lat,
        radius,
        entry.position
    );
    if (!result || result.altDeg <= 0) {
        entry.aboveHorizon = false;
        entry.star.visible = false;
        entry.position.setScalar(0);
        return;
    }
    const position = result.vector;
    entry.aboveHorizon = true;
    entry.position.copy(position);
    entry.star.position.copy(entry.position);
    entry.star.visible = true;
}

function updateLineEntry(entry, starEntries) {
    const start = starEntries.get(entry.startId);
    const end = starEntries.get(entry.endId);
    if (!start || !end || !start.aboveHorizon || !end.aboveHorizon) {
        entry.line.userData.horizonVisible = false;
        return;
    }
    const attr = entry.line.geometry.getAttribute('position');
    attr.setXYZ(0, start.position.x, start.position.y, start.position.z);
    attr.setXYZ(1, end.position.x, end.position.y, end.position.z);
    attr.needsUpdate = true;
    entry.line.userData.horizonVisible = true;
}

function createStarGlow(ctx, starData, size) {
    const texture = getStarGlowTexture(ctx);
    if (!texture) return null;
    const glowGroup = new THREE.Group();
    const baseColor = new THREE.Color(starData.glowColor || starData.color || 0xffffff);
    const magnitude = starData.magnitude ?? 2.5;
    const brightness = THREE.MathUtils.clamp(2.6 - magnitude * 0.35, 0.45, 1.75) + (starData.featured ? 0.25 : 0);
    const coreScale = size * (2.2 + brightness * 0.9);
    const hazeScale = coreScale * (1.6 + Math.random() * 0.25);

    const coreMaterial = new THREE.SpriteMaterial({
        map: texture,
        color: baseColor.clone().multiplyScalar(1.15),
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const coreSprite = new THREE.Sprite(coreMaterial);
    coreSprite.scale.set(coreScale, coreScale, 1);
    glowGroup.add(coreSprite);

    const hazeMaterial = new THREE.SpriteMaterial({
        map: texture,
        color: baseColor,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const hazeSprite = new THREE.Sprite(hazeMaterial);
    hazeSprite.scale.set(hazeScale, hazeScale, 1);
    glowGroup.add(hazeSprite);

    glowGroup.userData = {
        coreSprite,
        hazeSprite,
        baseCoreScale: coreScale,
        baseHazeScale: hazeScale,
        pulseOffset: Math.random() * Math.PI * 2,
        pulseStrength: 0.04 + brightness * 0.02,
        hazeStrength: 0.015 + Math.random() * 0.02
    };

    return glowGroup;
}

function animateStarGlow(entry, time) {
    if (!entry?.glow?.userData) return;
    const { coreSprite, hazeSprite, baseCoreScale, baseHazeScale, pulseOffset, pulseStrength, hazeStrength } = entry.glow.userData;
    const pulse = 1 + Math.sin(time * 0.4 + pulseOffset) * pulseStrength;
    const hazePulse = 1 + Math.sin(time * 0.18 + pulseOffset * 0.5) * hazeStrength;
    coreSprite.scale.setScalar(baseCoreScale * pulse);
    hazeSprite.scale.setScalar(baseHazeScale * hazePulse);
    const opacityPulse = 0.7 + 0.18 * Math.sin(time * 0.55 + pulseOffset * 0.7);
    coreSprite.material.opacity = THREE.MathUtils.clamp(0.55 * opacityPulse + 0.2, 0.3, 0.85);
    hazeSprite.material.opacity = THREE.MathUtils.clamp(0.25 * opacityPulse + 0.12, 0.1, 0.5);
}

function getStarGlowTexture(ctx) {
    if (ctx.starGlowTexture) {
        return ctx.starGlowTexture;
    }
    if (typeof document === 'undefined') return null;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const gradientCtx = canvas.getContext('2d');
    if (!gradientCtx) return null;
    const gradient = gradientCtx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2
    );
    gradient.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    gradientCtx.fillStyle = gradient;
    gradientCtx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in texture && THREE.SRGBColorSpace) {
        texture.colorSpace = THREE.SRGBColorSpace;
    } else if ('encoding' in texture && THREE.sRGBEncoding) {
        texture.encoding = THREE.sRGBEncoding;
    }
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    ctx.starGlowTexture = texture;
    return texture;
}

import * as THREE from 'three';

export function createConstellationSystem(ctx) {
    ctx.constellationsGroup = new THREE.Group();
    ctx.constellationLines = [];
    const radius = 5000;
    const starPositionCache = new Map();
    const ensureStar = (starId) => {
        if (starPositionCache.has(starId)) {
            return starPositionCache.get(starId);
        }
        const data = ctx.catalog.getStar(starId);
        if (!data) return null;
        const position = convertRADecToVector(ctx, data.ra, data.dec, radius);
        if (!position || position.y <= 0) {
            starPositionCache.set(starId, null);
            return null;
        }
        starPositionCache.set(starId, position);
        const size = getStarSizeFromMagnitude(data.magnitude);
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
        ctx.constellationsGroup.add(star);
        ctx.clickableObjects.push(star);
        ctx.catalogPickables.push(star);
        const glowGeometry = new THREE.SphereGeometry(size * 2.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: data.glowColor || 0x6699ff,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(position);
        ctx.constellationsGroup.add(glow);
        return position;
    };
    ctx.catalog.getFeaturedStars().forEach(star => {
        ensureStar(star.id);
    });
    const constellations = ctx.catalog.getConstellations();
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
            ctx.constellationsGroup.add(line);
            ctx.constellationLines.push(line);
        });
    });
    ctx.scene.add(ctx.constellationsGroup);
    updateConstellationLinesVisibility(ctx, ctx.settings.showConstellations);
    return {
        group: ctx.constellationsGroup,
        updateVisibility(visible) {
            updateConstellationLinesVisibility(ctx, visible);
        }
    };
}

function updateConstellationLinesVisibility(ctx, visible) {
    ctx.constellationLines.forEach(line => {
        line.visible = visible;
    });
}

function getStarSizeFromMagnitude(magnitude) {
    const mag = magnitude ?? 2.5;
    const brightness = THREE.MathUtils.clamp(2.2 - mag, -1.5, 2.2);
    return 6 + brightness * 2;
}

function convertRADecToVector(ctx, raDeg, decDeg, radius) {
    const lst = ctx.localSiderealTime;
    const hourAngle = THREE.MathUtils.degToRad(((lst - raDeg) % 360 + 360) % 360);
    const dec = THREE.MathUtils.degToRad(decDeg);
    const lat = THREE.MathUtils.degToRad(ctx.observer.lat);
    const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(hourAngle);
    const alt = Math.asin(sinAlt);
    if (alt <= 0) {
        return null;
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

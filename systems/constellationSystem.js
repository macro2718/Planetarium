import * as THREE from 'three';

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
            opacity: 0.95
        });
        const star = new THREE.Mesh(starGeometry, starMaterial);
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
        const glowGeometry = new THREE.SphereGeometry(size * 2.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: data.glowColor || 0x6699ff,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        ctx.constellationsGroup.add(glow);
        const entry = {
            id: data.id,
            star,
            glow,
            data,
            position: new THREE.Vector3(),
            aboveHorizon: false
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
        update() {
            if (lastLst === ctx.localSiderealTime) return;
            lastLst = ctx.localSiderealTime;
            starEntries.forEach(entry => updateStarEntry(ctx, entry, radius));
            lineEntries.forEach(entry => updateLineEntry(entry, starEntries));
            updateConstellationLinesVisibility(ctx, ctx.settings.showConstellations);
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
    // 天文学的規約: 北から東へ時計回り（上から見ると反時計回り）
    // Three.jsの座標系に合わせてXを反転
    const x = -projectedRadius * Math.sin(az);
    const z = projectedRadius * Math.cos(az);
    return new THREE.Vector3(x, y, z);
}

function updateStarEntry(ctx, entry, radius) {
    const position = convertRADecToVector(ctx, entry.data.ra, entry.data.dec, radius);
    if (!position) {
        entry.aboveHorizon = false;
        entry.star.visible = false;
        entry.glow.visible = false;
        entry.position.setScalar(0);
        return;
    }
    entry.aboveHorizon = true;
    entry.position.copy(position);
    entry.star.position.copy(entry.position);
    entry.glow.position.copy(entry.position);
    entry.star.visible = true;
    entry.glow.visible = true;
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

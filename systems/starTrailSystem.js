import * as THREE from 'three';

// 星の軌跡を描画するシステム
export function createStarTrailSystem(ctx) {
    const group = new THREE.Group();
    group.visible = false;
    ctx.scene.add(group);

    const radius = 5000;
    const maxPoints = 320;
    const minMoveSq = 1; // 位置変化がほぼない場合は点を追加しない
    const sampleInterval = 0.2; // [sec] 記録間隔

    const entries = ctx.catalog.getStars().map(star => ({
        data: star,
        segments: [],
        active: null,
        lastPos: null,
        lastVisible: false
    }));

    let enabled = false;
    let accumulator = 0;

    function disposeEntry(entry) {
        entry.segments.forEach(line => {
            group.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        });
        entry.segments = [];
        entry.active = null;
        entry.lastPos = null;
        entry.lastVisible = false;
    }

    function resetAllTrails() {
        entries.forEach(disposeEntry);
    }

    function startSegment(entry) {
        const buffer = new Float32Array(maxPoints * 3);
        const geometry = new THREE.BufferGeometry();
        const attribute = new THREE.BufferAttribute(buffer, 3);
        geometry.setAttribute('position', attribute);
        geometry.setDrawRange(0, 0);
        const baseColor = entry.data.glowColor || entry.data.color || 0xffffff;
        const material = new THREE.LineBasicMaterial({
            color: baseColor,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const line = new THREE.Line(geometry, material);
        line.userData = { attribute, count: 0, buffer };
        entry.segments.push(line);
        entry.active = line;
        group.add(line);
    }

    function addTrailPoint(entry, position) {
        if (!entry.active) {
            startSegment(entry);
        }
        const meta = entry.active.userData;
        const attr = meta.attribute;
        const arr = meta.buffer;
        let { count } = meta;
        if (count < maxPoints) {
            attr.setXYZ(count, position.x, position.y, position.z);
            count += 1;
        } else {
            // 末尾に追加しつつ最古の点を押し出す
            arr.copyWithin(0, 3, maxPoints * 3);
            attr.setXYZ(maxPoints - 1, position.x, position.y, position.z);
            count = maxPoints;
        }
        attr.needsUpdate = true;
        meta.count = count;
        entry.active.geometry.setDrawRange(0, count);
    }

    function updateTrails(delta) {
        if (!enabled) return;
        accumulator += delta;
        if (accumulator < sampleInterval) return;
        accumulator = 0;
        entries.forEach(entry => {
            const position = convertRADecToVector(ctx, entry.data.ra, entry.data.dec, radius);
            if (!position) {
                entry.active = null;
                entry.lastPos = null;
                entry.lastVisible = false;
                return;
            }
            if (!entry.active) {
                startSegment(entry);
            }
            if (entry.lastPos && entry.lastPos.distanceToSquared(position) < minMoveSq) {
                return;
            }
            addTrailPoint(entry, position);
            entry.lastPos = position;
            entry.lastVisible = true;
        });
    }

    function setEnabled(next) {
        if (enabled === next) return;
        enabled = next;
        group.visible = enabled;
        resetAllTrails();
        accumulator = 0;
    }

    return {
        group,
        setEnabled,
        update(time, delta) {
            updateTrails(delta);
        }
    };
}

function convertRADecToVector(ctx, raDeg, decDeg, radius) {
    if (typeof raDeg !== 'number' || typeof decDeg !== 'number') return null;
    const lst = ctx.localSiderealTime || 0;
    const hourAngle = THREE.MathUtils.degToRad(((lst - raDeg) % 360 + 360) % 360);
    const dec = THREE.MathUtils.degToRad(decDeg);
    const lat = THREE.MathUtils.degToRad(ctx.observer.lat);
    const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(hourAngle);
    const alt = Math.asin(sinAlt);
    if (alt <= 0) return null;
    const cosAz = (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat));
    let az = Math.acos(THREE.MathUtils.clamp(cosAz, -1, 1));
    if (Math.sin(hourAngle) > 0) {
        az = Math.PI * 2 - az;
    }
    const y = radius * Math.sin(alt);
    const projectedRadius = radius * Math.cos(alt);
    const x = -projectedRadius * Math.sin(az);
    const z = projectedRadius * Math.cos(az);
    return new THREE.Vector3(x, y, z);
}

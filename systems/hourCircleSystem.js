import * as THREE from '../three.module.js';
import {
    equatorialToHorizontalVector,
    degToRad,
    radToDeg,
    normalizeDegrees
} from '../utils/astronomy.js';
import { calculateGalacticBasis } from './milkyWaySystem.js';

const LST_UPDATE_THRESHOLD = 0.02;
const LAT_UPDATE_THRESHOLD = 0.0005;

/**
 * 時圏（天球上の経線）システム
 * 天球上に時角を示す経線を描画する
 */
export function createHourCircleSystem(ctx) {
    const group = new THREE.Group();
    const radius = 4800;
    const hourCircles = [];
    
    // 24時間分の時圏を作成（1時間ごと）
    // 天文学的規約: 北から東へ時計回り（上から見ると反時計回り）
    // Three.jsの座標系に合わせてXを反転
    for (let hour = 0; hour < 24; hour++) {
        const hourAngle = (hour / 24) * Math.PI * 2;
        const points = [];
        
        // 経線の点を生成（地平線から天頂まで）
        for (let i = 0; i <= 90; i += 2) {
            const altitude = THREE.MathUtils.degToRad(i);
            const y = radius * Math.sin(altitude);
            const projectedRadius = radius * Math.cos(altitude);
            const x = -projectedRadius * Math.sin(hourAngle);
            const z = projectedRadius * Math.cos(hourAngle);
            points.push(new THREE.Vector3(x, y, z));
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: hour % 6 === 0 ? 0x6699ff : 0x4466aa,
            transparent: true,
            opacity: hour % 6 === 0 ? 0.5 : 0.25,
            blending: THREE.AdditiveBlending
        });
        
        const line = new THREE.Line(geometry, material);
        hourCircles.push(line);
        group.add(line);
        
        // 時間ラベルを追加（6時間ごと）
        if (hour % 6 === 0) {
            const labelY = radius * Math.sin(THREE.MathUtils.degToRad(85));
            const labelRadius = radius * Math.cos(THREE.MathUtils.degToRad(85));
            const labelX = -labelRadius * Math.sin(hourAngle);
            const labelZ = labelRadius * Math.cos(hourAngle);
            
            const label = createTextSprite(`${hour}h`, 0x88bbff);
            label.position.set(labelX, labelY, labelZ);
            group.add(label);
        }
    }
    
    group.visible = false; // デフォルトは非表示
    ctx.scene.add(group);
    
    return {
        group,
        setVisible(visible) {
            group.visible = visible;
        },
        update(time, delta) {
            // 必要に応じて更新処理を追加
        }
    };
}

/**
 * 赤緯圏（天の赤道と平行な線）システム
 * 天球上に赤緯を示す緯線を描画する（天の赤道を除く）
 */
export function createDeclinationCircleSystem(ctx) {
    const group = new THREE.Group();
    const radius = 4800;
    
    // 赤緯線（天の赤道と平行な線）を追加（赤道は別システムに分離）
    const declinationCircles = [30, 60, -30, -60]; // 度（0度は除外）
    for (const dec of declinationCircles) {
        if (dec < 0) continue; // 地平線より下は表示しない
        
        const points = [];
        const altitude = THREE.MathUtils.degToRad(dec);
        const y = radius * Math.sin(altitude);
        const projectedRadius = radius * Math.cos(altitude);
        
        for (let az = 0; az <= 360; az += 5) {
            const azRad = THREE.MathUtils.degToRad(az);
            const x = -projectedRadius * Math.sin(azRad);
            const z = projectedRadius * Math.cos(azRad);
            points.push(new THREE.Vector3(x, y, z));
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x5588aa,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        
        const line = new THREE.Line(geometry, material);
        group.add(line);
        
        // 赤緯ラベルを追加
        const labelX = -projectedRadius * Math.sin(0); // 0度方向
        const labelZ = projectedRadius * Math.cos(0);
        const label = createTextSprite(`${dec}°`, 0x88aacc);
        label.position.set(labelX, y, labelZ);
        group.add(label);
    }
    
    group.visible = false; // デフォルトは非表示
    ctx.scene.add(group);
    
    return {
        group,
        setVisible(visible) {
            group.visible = visible;
        },
        update(time, delta) {
            // 必要に応じて更新処理を追加
        }
    };
}

/**
 * 天の赤道システム
 * 天球上に天の赤道を描画する
 */
export function createCelestialEquatorSystem(ctx) {
    const group = new THREE.Group();
    const radius = 4800;
    const segments = 240;
    const positions = new Float32Array((segments + 1) * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
        color: 0x66ddff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    const line = new THREE.Line(geometry, material);
    group.add(line);
    const label = createTextSprite('天の赤道', 0x66ddff);
    group.add(label);
    const state = { lastLst: null, lastLat: null, extraKey: null, needsUpdate: true };

    const updateGeometry = () => {
        const snapshot = shouldRefreshGeometry(group, ctx, state);
        if (!snapshot) return;
        const { lst, lat: latitude } = snapshot;
        for (let i = 0; i <= segments; i++) {
            const ra = (i / segments) * 360;
            const result = equatorialToHorizontalVector(ra, 0, lst, latitude, radius);
            const offset = i * 3;
            if (result?.vector) {
                positions[offset] = result.vector.x;
                positions[offset + 1] = result.vector.y;
                positions[offset + 2] = result.vector.z;
            } else {
                positions[offset] = positions[offset + 1] = positions[offset + 2] = 0;
            }
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeBoundingSphere();
        const anchor = equatorialToHorizontalVector(0, 0, lst, latitude, radius);
        if (anchor?.vector) {
            label.position.copy(anchor.vector.clone().multiplyScalar(1.02));
        }
    };

    updateGeometry();

    group.visible = false; // デフォルトは非表示
    ctx.scene.add(group);

    return {
        group,
        setVisible(visible) {
            group.visible = visible;
            state.needsUpdate = true;
        },
        update() {
            updateGeometry();
        }
    };
}

/**
 * 黄道システム
 * 天球上に黄道を描画する
 */
export function createEclipticSystem(ctx) {
    const group = new THREE.Group();
    const radius = 4800;
    const segments = 240;
    const positions = new Float32Array((segments + 1) * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
        color: 0xffaa44,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
    });
    const line = new THREE.Line(geometry, material);
    group.add(line);
    const label = createTextSprite('黄道', 0xffaa44);
    group.add(label);
    const state = { lastLst: null, lastLat: null, extraKey: null, needsUpdate: true };

    const seasonalPoints = [
        { lon: 0, name: '春分点', color: 0x88ff88 },
        { lon: 90, name: '夏至点', color: 0xffff66 },
        { lon: 180, name: '秋分点', color: 0xff8888 },
        { lon: 270, name: '冬至点', color: 0x88ccff }
    ];
    const markerGeometry = new THREE.SphereGeometry(18, 10, 10);
    const seasonalMarkers = seasonalPoints.map((sp) => {
        const markerMaterial = new THREE.MeshBasicMaterial({
            color: sp.color,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        group.add(marker);
        const spLabel = createTextSprite(sp.name, sp.color);
        group.add(spLabel);
        return { lon: sp.lon, marker, label: spLabel };
    });

    const updateGeometry = () => {
        const snapshot = shouldRefreshGeometry(group, ctx, state);
        if (!snapshot) return;
        const { lst, lat: latitude } = snapshot;
        for (let i = 0; i <= segments; i++) {
            const lon = (i / segments) * 360;
            const { raDeg, decDeg } = eclipticToEquatorial(lon);
            const result = equatorialToHorizontalVector(raDeg, decDeg, lst, latitude, radius);
            const offset = i * 3;
            if (result?.vector) {
                positions[offset] = result.vector.x;
                positions[offset + 1] = result.vector.y;
                positions[offset + 2] = result.vector.z;
            } else {
                positions[offset] = positions[offset + 1] = positions[offset + 2] = 0;
            }
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeBoundingSphere();

        const labelAnchor = eclipticToEquatorial(90);
        const labelVector = equatorialToHorizontalVector(labelAnchor.raDeg, labelAnchor.decDeg, lst, latitude, radius);
        if (labelVector?.vector) {
            label.position.copy(labelVector.vector.clone().multiplyScalar(1.02));
        }

        seasonalMarkers.forEach(({ lon, marker, label: spLabel }) => {
            const eq = eclipticToEquatorial(lon);
            const markerVec = equatorialToHorizontalVector(eq.raDeg, eq.decDeg, lst, latitude, radius);
            if (markerVec?.vector) {
                marker.position.copy(markerVec.vector);
                spLabel.position.copy(markerVec.vector.clone().multiplyScalar(1.02));
                spLabel.position.y += 60;
            }
        });
    };

    updateGeometry();

    group.visible = false; // デフォルトは非表示
    ctx.scene.add(group);

    return {
        group,
        setVisible(visible) {
            group.visible = visible;
            state.needsUpdate = true;
        },
        update() {
            updateGeometry();
        }
    };
}

/**
 * 銀河赤道システム
 * 天球上に銀河座標の赤道面を描画する
 */
export function createGalacticEquatorSystem(ctx) {
    const group = new THREE.Group();
    const radius = 4800;
    const segments = 240;
    const positions = new Float32Array((segments + 1) * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
    });
    const line = new THREE.Line(geometry, material);
    group.add(line);
    const label = createTextSprite('銀河赤道', 0x88ccff);
    group.add(label);
    const state = { lastLst: null, lastLat: null, extraKey: null, needsUpdate: true };

    const updateGeometry = () => {
        const simulatedDate = ctx.getSimulatedDate?.() ?? new Date();
        const timeKey = Math.round(simulatedDate.getTime() / 1000);
        const snapshot = shouldRefreshGeometry(group, ctx, state, timeKey);
        if (!snapshot) return;
        const basis = calculateGalacticBasis(ctx);
        if (!basis) return;

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const dir = basis.axis.clone().multiplyScalar(Math.cos(angle))
                .add(basis.tangent.clone().multiplyScalar(Math.sin(angle)))
                .normalize()
                .multiplyScalar(radius);
            const offset = i * 3;
            positions[offset] = dir.x;
            positions[offset + 1] = dir.y;
            positions[offset + 2] = dir.z;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeBoundingSphere();

        if (basis.centerDir) {
            label.position.copy(basis.centerDir.clone().multiplyScalar(radius * 1.02));
        }
    };

    updateGeometry();

    group.visible = false;
    ctx.scene.add(group);

    return {
        group,
        setVisible(visible) {
            group.visible = visible;
            state.needsUpdate = true;
        },
        update() {
            updateGeometry();
        }
    };
}

/**
 * 白道システム（月軌道面）
 * 天球上に白道（黄道に対して約5度傾いた月の軌道面）を描画する
 */
export function createLunarOrbitPlaneSystem(ctx) {
    const group = new THREE.Group();
    const radius = 4800;
    const segments = 240;
    const positions = new Float32Array((segments + 1) * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
    });
    const line = new THREE.Line(geometry, material);
    group.add(line);
    const label = createTextSprite('白道', 0xffffff);
    group.add(label);
    const state = { lastLst: null, lastLat: null, extraKey: null, needsUpdate: true };

    const updateGeometry = () => {
        const simulatedDate = ctx.getSimulatedDate?.() ?? new Date();
        const timeKey = Math.round(simulatedDate.getTime() / 1000);
        const snapshot = shouldRefreshGeometry(group, ctx, state, timeKey);
        if (!snapshot) return;
        const basis = calculateLunarOrbitBasis(ctx);
        if (!basis) return;

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const dir = basis.axis.clone().multiplyScalar(Math.cos(angle))
                .add(basis.tangent.clone().multiplyScalar(Math.sin(angle)))
                .normalize()
                .multiplyScalar(radius);
            const offset = i * 3;
            positions[offset] = dir.x;
            positions[offset + 1] = dir.y;
            positions[offset + 2] = dir.z;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeBoundingSphere();

        label.position.copy(basis.axis.clone().multiplyScalar(radius * 1.05));
    };

    updateGeometry();

    group.visible = false;
    ctx.scene.add(group);

    return {
        group,
        setVisible(visible) {
            group.visible = visible;
            state.needsUpdate = true;
        },
        update() {
            updateGeometry();
        }
    };
}

function shouldRefreshGeometry(group, ctx, state, extraKey = null) {
    if (!group.visible) {
        return null;
    }
    const lst = ctx.localSiderealTime ?? 0;
    const lat = ctx.observer?.lat ?? 0;
    const lstDelta = angularDifferenceDeg(lst, state.lastLst);
    const latDelta = state.lastLat === null ? Infinity : Math.abs(lat - state.lastLat);
    const extraChanged = extraKey !== state.extraKey;
    if (!state.needsUpdate && lstDelta < LST_UPDATE_THRESHOLD && latDelta < LAT_UPDATE_THRESHOLD && !extraChanged) {
        return null;
    }
    state.lastLst = lst;
    state.lastLat = lat;
    state.extraKey = extraKey;
    state.needsUpdate = false;
    return { lst, lat };
}

function angularDifferenceDeg(a, b) {
    if (a === null || b === null) return Infinity;
    const diff = ((a - b + 540) % 360) - 180;
    return Math.abs(diff);
}

function calculateLunarOrbitBasis(ctx) {
    const date = typeof ctx.getSimulatedDate === 'function' ? ctx.getSimulatedDate() : new Date();
    const jd = date.getTime() / 86400000 + 2440587.5;
    const T = (jd - 2451545.0) / 36525;
    const inclinationRad = degToRad(5.145);
    const ascendingNode = degToRad(normalizeDegrees(125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000));

    const daysSinceJ2000 = (date - new Date('2000-01-01T12:00:00Z')) / (1000 * 60 * 60 * 24);
    const obliquityRad = degToRad(23.439291 - 0.0000137 * daysSinceJ2000);

    const sinI = Math.sin(inclinationRad);
    const cosI = Math.cos(inclinationRad);
    const sinOmega = Math.sin(ascendingNode);
    const cosOmega = Math.cos(ascendingNode);

    const normalEcl = new THREE.Vector3(
        sinI * sinOmega,
        -sinI * cosOmega,
        cosI
    ).normalize();

    const cosOb = Math.cos(obliquityRad);
    const sinOb = Math.sin(obliquityRad);
    const normalEq = new THREE.Vector3(
        normalEcl.x,
        normalEcl.y * cosOb - normalEcl.z * sinOb,
        normalEcl.y * sinOb + normalEcl.z * cosOb
    ).normalize();

    const nodeEcl = new THREE.Vector3(cosOmega, sinOmega, 0);
    const nodeEq = new THREE.Vector3(
        nodeEcl.x,
        nodeEcl.y * cosOb - nodeEcl.z * sinOb,
        nodeEcl.y * sinOb + nodeEcl.z * cosOb
    ).normalize();

    const axisEq = nodeEq.lengthSq() > 1e-6 ? nodeEq : new THREE.Vector3(1, 0, 0);
    const tangentEq = new THREE.Vector3().crossVectors(normalEq, axisEq).normalize();
    if (tangentEq.lengthSq() < 1e-6) {
        return null;
    }

    const axis = convertEquatorialDirectionToHorizontal(axisEq, ctx, 1);
    const tangent = convertEquatorialDirectionToHorizontal(tangentEq, ctx, 1);
    if (!axis || !tangent) return null;

    return { axis, tangent, normal: convertEquatorialDirectionToHorizontal(normalEq, ctx, 1) };
}

function convertEquatorialDirectionToHorizontal(dirEq, ctx, radius = 1) {
    const ra = Math.atan2(dirEq.y, dirEq.x);
    const dec = Math.asin(clamp(dirEq.z, -1, 1));
    const result = equatorialToHorizontalVector(
        normalizeDegrees(radToDeg(ra)),
        radToDeg(dec),
        ctx.localSiderealTime ?? 0,
        ctx.observer?.lat ?? 0,
        radius
    );
    return result?.vector ?? null;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function eclipticToEquatorial(lonDeg) {
    const obliquityDeg = 23.4397;
    const lonRad = degToRad(lonDeg);
    const obRad = degToRad(obliquityDeg);
    const sinLon = Math.sin(lonRad);
    const cosLon = Math.cos(lonRad);
    const sinOb = Math.sin(obRad);
    const cosOb = Math.cos(obRad);
    const raRad = Math.atan2(sinLon * cosOb, cosLon);
    const decRad = Math.asin(sinOb * sinLon);
    return {
        raDeg: normalizeDegrees(radToDeg(raRad)),
        decDeg: radToDeg(decRad)
    };
}

/**
 * テキストスプライトを作成
 */
function createTextSprite(text, color = 0xffffff) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;
    
    context.fillStyle = 'transparent';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = 'bold 32px Arial';
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(150, 75, 1);
    
    return sprite;
}

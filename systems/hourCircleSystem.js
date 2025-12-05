import * as THREE from '../three.module.js';
import {
    equatorialToHorizontalVector,
    degToRad,
    radToDeg,
    normalizeDegrees
} from '../utils/astronomy.js';

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
    ctx.hourCircleGroup = group;
    
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
    ctx.declinationCircleGroup = group;
    
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

    const updateGeometry = () => {
        const lst = ctx.localSiderealTime ?? 0;
        const latitude = ctx.observer?.lat ?? 0;
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
    ctx.celestialEquatorGroup = group;

    return {
        group,
        setVisible(visible) {
            group.visible = visible;
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
        const lst = ctx.localSiderealTime ?? 0;
        const latitude = ctx.observer?.lat ?? 0;
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
    ctx.eclipticGroup = group;

    return {
        group,
        setVisible(visible) {
            group.visible = visible;
        },
        update() {
            updateGeometry();
        }
    };
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

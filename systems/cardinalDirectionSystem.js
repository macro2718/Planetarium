import * as THREE from '../three.module.js';

/**
 * 方位表示システム（N, S, E, W）
 * 地平線沿いに方位を表示する
 */
export function createCardinalDirectionSystem(ctx) {
    const group = new THREE.Group();
    const radius = 4700;
    const horizonY = 5; // 地平線のわずか上
    
    // 方位データ
    const directions = [
        { label: 'N', labelJa: '北', azimuth: 0, color: 0xff6666 },      // 北
        { label: 'E', labelJa: '東', azimuth: 90, color: 0xffcc66 },     // 東
        { label: 'S', labelJa: '南', azimuth: 180, color: 0x66ff66 },    // 南
        { label: 'W', labelJa: '西', azimuth: 270, color: 0x6699ff },    // 西
        { label: 'NE', labelJa: '北東', azimuth: 45, color: 0xffa366, secondary: true },
        { label: 'SE', labelJa: '南東', azimuth: 135, color: 0x99ff66, secondary: true },
        { label: 'SW', labelJa: '南西', azimuth: 225, color: 0x66ccff, secondary: true },
        { label: 'NW', labelJa: '北西', azimuth: 315, color: 0xcc99ff, secondary: true }
    ];
    
    // 方位ラベルを作成
    // 天文学的規約: 北から東へ時計回り（上から見ると反時計回り）
    // Three.jsの座標系に合わせてXを反転
    directions.forEach(dir => {
        const azRad = THREE.MathUtils.degToRad(dir.azimuth);
        const x = -radius * Math.sin(azRad);
        const z = radius * Math.cos(azRad);
        
        // メインラベル
        const label = createDirectionLabel(dir.label, dir.color, dir.secondary);
        label.position.set(x, horizonY + (dir.secondary ? 80 : 120), z);
        group.add(label);
        
        // マーカーポイント（地平線上の小さな目印）
        if (!dir.secondary) {
            const markerGeometry = new THREE.SphereGeometry(8, 16, 16);
            const markerMaterial = new THREE.MeshBasicMaterial({
                color: dir.color,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.set(x, horizonY, z);
            group.add(marker);
            
            // グロー効果
            const glowGeometry = new THREE.SphereGeometry(20, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: dir.color,
                transparent: true,
                opacity: 0.15,
                blending: THREE.AdditiveBlending
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.set(x, horizonY, z);
            group.add(glow);
        }
    });
    
    // 地平線リング
    const horizonPoints = [];
    for (let az = 0; az <= 360; az += 2) {
        const azRad = THREE.MathUtils.degToRad(az);
        const x = -radius * Math.sin(azRad);
        const z = radius * Math.cos(azRad);
        horizonPoints.push(new THREE.Vector3(x, horizonY, z));
    }
    
    const horizonGeometry = new THREE.BufferGeometry().setFromPoints(horizonPoints);
    const horizonMaterial = new THREE.LineBasicMaterial({
        color: 0x88aacc,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });
    const horizonLine = new THREE.Line(horizonGeometry, horizonMaterial);
    group.add(horizonLine);
    
    // 方位の目盛り線（10度ごと）
    for (let az = 0; az < 360; az += 10) {
        const azRad = THREE.MathUtils.degToRad(az);
        const x1 = -radius * Math.sin(azRad);
        const z1 = radius * Math.cos(azRad);
        const innerRadius = az % 30 === 0 ? radius - 80 : radius - 40;
        const x2 = -innerRadius * Math.sin(azRad);
        const z2 = innerRadius * Math.cos(azRad);
        
        const tickPoints = [
            new THREE.Vector3(x1, horizonY, z1),
            new THREE.Vector3(x2, horizonY, z2)
        ];
        
        const tickGeometry = new THREE.BufferGeometry().setFromPoints(tickPoints);
        const tickMaterial = new THREE.LineBasicMaterial({
            color: az % 30 === 0 ? 0x88aacc : 0x556677,
            transparent: true,
            opacity: az % 30 === 0 ? 0.5 : 0.25,
            blending: THREE.AdditiveBlending
        });
        const tick = new THREE.Line(tickGeometry, tickMaterial);
        group.add(tick);
    }
    
    group.visible = false; // デフォルトは非表示
    ctx.scene.add(group);
    ctx.cardinalDirectionGroup = group;
    
    return {
        group,
        setVisible(visible) {
            group.visible = visible;
        },
        update(time, delta) {
            // ラベルが常にカメラを向くようにする
            group.children.forEach(child => {
                if (child.isSprite) {
                    // スプライトは自動的にカメラを向く
                }
            });
        }
    };
}

/**
 * 方位ラベルを作成
 */
function createDirectionLabel(text, color, isSecondary = false) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const size = isSecondary ? 128 : 256;
    canvas.width = size;
    canvas.height = size;
    
    context.fillStyle = 'transparent';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // テキストの影
    context.shadowColor = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.8)`;
    context.shadowBlur = 20;
    
    context.font = `bold ${isSecondary ? 48 : 96}px Arial`;
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
    const scale = isSecondary ? 150 : 300;
    sprite.scale.set(scale, scale, 1);
    
    return sprite;
}

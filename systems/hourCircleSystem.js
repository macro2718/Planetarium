import * as THREE from '../three.module.js';

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
    
    // 赤緯線（天の赤道と平行な線）を追加
    const declinationCircles = [0, 30, 60, -30, -60]; // 度
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
            color: dec === 0 ? 0xff6666 : 0x5588aa,
            transparent: true,
            opacity: dec === 0 ? 0.6 : 0.3,
            blending: THREE.AdditiveBlending
        });
        
        const line = new THREE.Line(geometry, material);
        group.add(line);
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

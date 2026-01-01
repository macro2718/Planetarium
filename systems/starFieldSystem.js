import * as THREE from '../three.module.js';

export function createStarFieldSystem(ctx) {
    ctx.starsGroup = new THREE.Group();
    ctx.starMaterials = [];
    // 全球に星を配置（シェーダーで地平線より下を非表示）
    const skyRadius = 9000;
    createStarLayer(ctx, 2600, skyRadius, 2.5, 5.0);
    createStarLayer(ctx, 10000, skyRadius, 1.8, 3.5);
    ctx.scene.add(ctx.starsGroup);

    let lastLst = null;
    let lastLat = null;
    const rotY = new THREE.Matrix4();
    const rotX = new THREE.Matrix4();
    const rotationMatrix = new THREE.Matrix4();

    // 赤道座標系から地平座標系への変換行列を適用
    // equatorialToHorizontalVector と同じ変換を行列で表現
    function applyRotation(lstDeg, latDeg) {
        const lstRad = THREE.MathUtils.degToRad(lstDeg);
        const latRad = THREE.MathUtils.degToRad(latDeg);
        
        // 赤道座標系から地平座標系への変換
        // 赤道座標: X=春分点(RA=0), Y=天の北極, Z=RA=6h
        // 地平座標: X=西, Y=天頂, Z=北
        // 
        // 変換手順:
        // 1. Y軸（天の北極）周りに -LST 分回転（時角の適用）
        // 2. X軸周りに (90° - 緯度) 分回転（天の極を傾ける）
        
        rotY.makeRotationY(-lstRad);
        rotX.makeRotationX(Math.PI / 2 - latRad);
        
        rotationMatrix.multiplyMatrices(rotX, rotY);
        
        ctx.starsGroup.rotation.setFromRotationMatrix(rotationMatrix);
    }

    function syncRotation() {
        const lst = ctx.localSiderealTime ?? 0;
        const lat = ctx.observer?.lat ?? 35;
        const lstDelta = angularDifferenceDeg(lst, lastLst);
        const latDelta = lastLat === null ? Infinity : Math.abs(lat - lastLat);
        if (lastLst === null || lstDelta > 0.02 || latDelta > 0.0005) {
            lastLst = lst;
            lastLat = lat;
            applyRotation(lst, lat);
        }
    }

    syncRotation();

    return {
        group: ctx.starsGroup,
        update(time) {
            syncRotation();
            ctx.starMaterials.forEach(material => {
                material.uniforms.time.value = time;
            });
        }
    };
}

function angularDifferenceDeg(a, b) {
    if (a === null || b === null) return Infinity;
    const diff = ((a - b + 540) % 360) - 180;
    return Math.abs(diff);
}

function createStarLayer(ctx, count, radius, minSize, maxSize) {
    const positions = [];
    const colors = [];
    const sizes = [];
    const twinklePhases = [];
    const starColors = [
        new THREE.Color(0xffffff),
        new THREE.Color(0xffeedd),
        new THREE.Color(0xaaccff),
        new THREE.Color(0xffddaa),
        new THREE.Color(0xffaaaa),
        new THREE.Color(0xaaffff)
    ];
    // 赤道座標系で全球に星を均一に配置
    // X軸: 春分点方向、Y軸: 天の北極方向、Z軸: 赤経90度方向
    for (let i = 0; i < count; i++) {
        // 赤経 (0〜360度) と 赤緯 (-90〜90度) をランダムに生成
        const ra = Math.random() * Math.PI * 2;  // 赤経
        const dec = Math.asin(2 * Math.random() - 1);  // 赤緯（均一分布）
        
        // 赤道座標系での位置
        const x = radius * Math.cos(dec) * Math.cos(ra);
        const z = radius * Math.cos(dec) * Math.sin(ra);
        const y = radius * Math.sin(dec);
        
        positions.push(x, y, z);
        const color = starColors[Math.floor(Math.random() * starColors.length)];
        colors.push(color.r, color.g, color.b);
        const sizeFactor = Math.pow(Math.random(), 2);
        const starSize = minSize + sizeFactor * (maxSize - minSize);
        sizes.push(starSize);
        twinklePhases.push(Math.random() * Math.PI * 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('twinklePhase', new THREE.Float32BufferAttribute(twinklePhases, 1));
    const vertexShader = `
        precision highp float;
        attribute float size;
        attribute float twinklePhase;
        varying vec3 vColor;
        varying float vTwinkle;
        varying float vWorldY;
        uniform float time;
        void main() {
            vColor = color;
            vTwinkle = 0.7 + 0.3 * sin(time * 2.0 + twinklePhase);
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldY = worldPosition.y;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size;
            gl_Position = projectionMatrix * mvPosition;
        }
    `;
    const fragmentShader = `
        precision highp float;
        varying vec3 vColor;
        varying float vTwinkle;
        varying float vWorldY;
        void main() {
            // 地平線より下（ワールドY < 0）は描画しない
            if (vWorldY < 0.0) discard;
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = dot(center, center) * 4.0;
            float alpha = exp(-dist * 2.0) * vTwinkle;
            vec3 finalColor = vColor * 1.3;
            gl_FragColor = vec4(finalColor * alpha, alpha);
        }
    `;
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader,
        fragmentShader,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false
    });
    ctx.starMaterials.push(material);
    const stars = new THREE.Points(geometry, material);
    stars.frustumCulled = false;
    ctx.starsGroup.add(stars);
}

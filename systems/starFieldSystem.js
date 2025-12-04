import * as THREE from 'three';

export function createStarFieldSystem(ctx) {
    ctx.starsGroup = new THREE.Group();
    ctx.starMaterials = [];
    ctx.proceduralStarCounter = 0;
    createStarLayer(ctx, 8000, 5000, 0.5, 3.0);
    createStarLayer(ctx, 15000, 7000, 0.3, 1.5);
    createStarLayer(ctx, 30000, 8000, 0.1, 0.8);
    ctx.scene.add(ctx.starsGroup);
    return {
        group: ctx.starsGroup,
        update(time) {
            ctx.starMaterials.forEach(material => {
                material.uniforms.time.value = time;
            });
        }
    };
}

function createStarLayer(ctx, count, radius, minSize, maxSize) {
    const positions = [];
    const colors = [];
    const sizes = [];
    const twinklePhases = [];
    const starInfos = [];
    const starColors = [
        { color: new THREE.Color(0xffffff), spectralType: 'A型', temperature: '約8,500K', description: '純白に輝くA型主系列星' },
        { color: new THREE.Color(0xffeedd), spectralType: 'F型', temperature: '約7,000K', description: '黄白色の穏やかな恒星' },
        { color: new THREE.Color(0xaaccff), spectralType: 'B型', temperature: '約12,000K', description: '青白い高温の恒星' },
        { color: new THREE.Color(0xffddaa), spectralType: 'K型', temperature: '約4,500K', description: 'オレンジ色の巨星' },
        { color: new THREE.Color(0xffaaaa), spectralType: 'M型', temperature: '約3,500K', description: '赤く輝く低温の恒星' },
        { color: new THREE.Color(0xaaffff), spectralType: 'O型', temperature: '約30,000K', description: '青緑の超高温恒星' }
    ];
    let addedCount = 0;
    while (addedCount < count) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        if (y < 0) continue;
        positions.push(x, y, z);
        addedCount++;
        const colorProfile = starColors[Math.floor(Math.random() * starColors.length)];
        const color = colorProfile.color;
        colors.push(color.r, color.g, color.b);
        const sizeFactor = Math.pow(Math.random(), 2);
        const starSize = minSize + sizeFactor * (maxSize - minSize);
        sizes.push(starSize);
        twinklePhases.push(Math.random() * Math.PI * 2);
        const starInfo = generateProceduralStarInfo(ctx, colorProfile, starSize, minSize, maxSize);
        starInfos.push(starInfo);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('twinklePhase', new THREE.Float32BufferAttribute(twinklePhases, 1));
    const vertexShader = `
        attribute float size;
        attribute float twinklePhase;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float time;
        void main() {
            vColor = color;
            vTwinkle = 0.7 + 0.3 * sin(time * 2.0 + twinklePhase);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z) * vTwinkle;
            gl_Position = projectionMatrix * mvPosition;
        }
    `;
    const fragmentShader = `
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float alpha = 1.0 - smoothstep(0.0, 0.48, dist);
            float glow = exp(-dist * 3.4);
            float intensity = 1.35;
            vec3 finalColor = vColor * (alpha + glow * 0.65) * vTwinkle * intensity;
            float finalAlpha = clamp(alpha * 1.2 * vTwinkle + glow * 0.2, 0.0, 1.0);
            gl_FragColor = vec4(finalColor, finalAlpha);
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
        depthWrite: false
    });
    ctx.starMaterials.push(material);
    const stars = new THREE.Points(geometry, material);
    stars.userData.starInfos = starInfos;
    ctx.starsGroup.add(stars);
}

function generateProceduralStarInfo(ctx, colorProfile, starSize, minSize, maxSize) {
    const range = Math.max(maxSize - minSize, 0.0001);
    const normalized = THREE.MathUtils.clamp((starSize - minSize) / range, 0, 1);
    const magnitude = +(5.5 - normalized * 5).toFixed(2);
    const distance = Math.round(25 + Math.random() * 1975);
    const id = String(++ctx.proceduralStarCounter).padStart(4, '0');
    const name = `無名の星 ${id}`;
    return {
        name,
        type: 'star',
        constellation: '星図外',
        magnitude,
        distance,
        spectralType: colorProfile.spectralType,
        temperature: colorProfile.temperature,
        colorHint: colorProfile.description,
        info: `観測される色から${colorProfile.description}。地球から約${distance}光年の距離にあると推定され、視等級はおよそ${magnitude}等級。`
    };
}

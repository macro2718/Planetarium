import * as THREE from '../three.module.js';

export function createStarFieldSystem(ctx) {
    ctx.starsGroup = new THREE.Group();
    ctx.starMaterials = [];
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
    const starColors = [
        new THREE.Color(0xffffff),
        new THREE.Color(0xffeedd),
        new THREE.Color(0xaaccff),
        new THREE.Color(0xffddaa),
        new THREE.Color(0xffaaaa),
        new THREE.Color(0xaaffff)
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
    ctx.starsGroup.add(stars);
}

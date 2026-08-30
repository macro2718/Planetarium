import * as THREE from '../three.module.js';

export function createCosmicDustSystem(ctx) {
    ctx.cosmicDustGroup = new THREE.Group();
    const dustCount = 3000;
    const positions = new Float32Array(dustCount * 3);
    const sizes = new Float32Array(dustCount);
    const colors = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI / 2;
        const radius = 500 + Math.random() * 4000;
        const offset = i * 3;
        positions[offset] = radius * Math.sin(phi) * Math.cos(theta);
        positions[offset + 1] = radius * Math.cos(phi);
        positions[offset + 2] = radius * Math.sin(phi) * Math.sin(theta);
        sizes[i] = 0.5 + Math.random() * 1.5;
        const brightness = 0.3 + Math.random() * 0.4;
        colors[offset] = brightness;
        colors[offset + 1] = brightness;
        colors[offset + 2] = brightness + 0.1;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    ctx.dustMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            varying vec3 vColor;
            uniform float time;
            void main() {
                vColor = color;
                vec3 pos = position;
                pos.x += sin(time * 0.1 + position.y * 0.01) * 5.0;
                pos.y += cos(time * 0.1 + position.x * 0.01) * 5.0;
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (200.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                float alpha = 0.3 * (1.0 - dist * 2.0);
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const dust = new THREE.Points(geometry, ctx.dustMaterial);
    ctx.cosmicDustGroup.add(dust);
    ctx.scene.add(ctx.cosmicDustGroup);
    return {
        group: ctx.cosmicDustGroup,
        update(time) {
            if (ctx.dustMaterial) {
                ctx.dustMaterial.uniforms.time.value = time;
            }
        }
    };
}

import * as THREE from '../three.module.js';

export function createNebulaSystem(ctx) {
    const nebulaCount = 30;
    let addedCount = 0;
    while (addedCount < nebulaCount) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI / 2;
        const radius = 7000 + Math.random() * 1000;
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        const nebulaGeometry = new THREE.PlaneGeometry(500 + Math.random() * 500, 500 + Math.random() * 500);
        const nebulaColors = [
            new THREE.Color(0x4466ff),
            new THREE.Color(0xff6644),
            new THREE.Color(0x44ff88),
            new THREE.Color(0xff44aa),
            new THREE.Color(0xaa44ff)
        ];
        const color = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
        const nebulaMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: color }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                varying vec2 vUv;
                void main() {
                    float dist = length(vUv - vec2(0.5));
                    float alpha = 0.08 * exp(-dist * 3.0) * (1.0 - dist * 2.0);
                    if (alpha < 0.001) discard;
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
        nebula.position.set(x, y, z);
        nebula.lookAt(0, 0, 0);
        nebula.rotation.z = Math.random() * Math.PI * 2;
        ctx.scene.add(nebula);
        addedCount++;
    }
    return {};
}

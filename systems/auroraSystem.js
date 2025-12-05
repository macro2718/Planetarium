import * as THREE from '../three.module.js';

export function createAuroraSystem(ctx) {
    ctx.auroraGroup = new THREE.Group();
    ctx.auroraMaterials = [];
    const auroraCount = 5;
    for (let i = 0; i < auroraCount; i++) {
        const auroraGeometry = new THREE.PlaneGeometry(2800, 1700, 110, 55);
        const seed = new THREE.Vector2(Math.random() * 100, Math.random() * 100);
        const flickerPhase = Math.random() * Math.PI * 2;
        const luminanceBoost = 0.78 + Math.random() * 0.25;
        const auroraMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color1: { value: new THREE.Color(0x66ffcc) },
                color2: { value: new THREE.Color(0x33aaff) },
                color3: { value: new THREE.Color(0xff66ff) },
                seed: { value: seed },
                flickerPhase: { value: flickerPhase },
                luminanceBoost: { value: luminanceBoost }
            },
            vertexShader: `
                uniform float time;
                uniform vec2 seed;
                varying vec2 vUv;
                varying float vWave;
                varying float vFeather;
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }
                void main() {
                    vUv = uv;
                    vec3 pos = position;
                    float wave = sin((pos.x * 0.004 + seed.x) + time * 0.6) * 140.0;
                    wave += sin((pos.x * 0.009 - seed.y) + time * 0.35) * 70.0;
                    pos.z += wave;
                    pos.y += sin(pos.x * 0.002 + time * 0.25 + seed.x) * 45.0;
                    pos.y += sin((vUv.x - 0.5) * 6.2831 + time * 0.15 - seed.y * 0.02) * 35.0;
                    pos.x += sin(vUv.y * (10.0 + seed.x * 0.05) + time * 0.35) * 40.0 * (1.0 - vUv.y);
                    pos.y += cos(vUv.y * (8.0 + seed.y * 0.04) + time * 0.3) * 30.0 * (1.0 - vUv.y * 0.8);
                    pos.x += cos(vUv.x * 18.0 + time * 0.25 + seed.y) * 30.0 * pow(vUv.y, 0.5);
                    pos.y += (hash(vUv * 12.0 + seed) - 0.5) * 70.0 * pow(vUv.y, 0.6);
                    vWave = wave * 0.012;
                    vFeather = exp(-pow((vUv.x - 0.5) * 2.1, 2.0));
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color1;
                uniform vec3 color2;
                uniform vec3 color3;
                uniform vec2 seed;
                uniform float flickerPhase;
                uniform float luminanceBoost;
                varying vec2 vUv;
                varying float vWave;
                varying float vFeather;
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }
                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    float a = hash(i);
                    float b = hash(i + vec2(1.0, 0.0));
                    float c = hash(i + vec2(0.0, 1.0));
                    float d = hash(i + vec2(1.0, 1.0));
                    float u = mix(a, b, f.x);
                    float v = mix(c, d, f.x);
                    return mix(u, v, f.y);
                }
                float fbm(vec2 p) {
                    float value = 0.0;
                    float amp = 0.5;
                    float freq = 1.6;
                    for (int i = 0; i < 4; i++) {
                        value += amp * noise(p * freq);
                        freq *= 2.1;
                        amp *= 0.55;
                    }
                    return value;
                }
                void main() {
                    float baseFade = pow(1.0 - vUv.y, 1.2);
                    float crownGlow = smoothstep(0.55, 1.0, vUv.y) * 0.45;
                    float verticalFade = baseFade + crownGlow;
                    float horizontalWave = sin((vUv.x * 10.0 + seed.x) + time * 2.0) * 0.5 + 0.5;
                    float flowNoise = fbm(vec2(vUv.x * 6.0 - time * 0.15 + seed.x, vUv.y * 3.0 + time * 0.08 + seed.y));
                    float shimmer = fbm(vec2(vUv.x * 14.0 + time * 0.6 - seed.y, vUv.y * 7.0 - time * 0.2 + seed.x));
                    float organic = fbm(vec2(vUv.x * 5.0 + seed.x * 0.5 - time * 0.12, vUv.y * 4.0 + seed.y * 0.5 + time * 0.09));
                    vec3 color = mix(color1, color2, clamp(vUv.x + sin(time * 0.5) * 0.3, 0.0, 1.0));
                    color = mix(color, color3, horizontalWave * 0.35);
                    color = mix(color, vec3(0.7, 0.9, 1.0), flowNoise * 0.2 + organic * 0.15);
                    float flicker = sin(time * 0.8 + flickerPhase + vUv.y * 3.0) * 0.25 + 0.75;
                    float brightness = 0.48 + sin(time + vUv.x * 4.0 + seed.x) * 0.22;
                    brightness += vWave * 0.25;
                    brightness *= verticalFade;
                    brightness *= 0.85 + flowNoise * 0.45 + organic * 0.28;
                    brightness *= luminanceBoost * flicker;
                    float curtain = abs(sin(vUv.x * 30.0 + time * 0.5)) * 0.5 + 0.5;
                    brightness *= (0.75 + curtain * 0.4 + shimmer * 0.3 + organic * 0.2);
                    float feather = pow(vFeather, 1.35);
                    float edgeBlur = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
                    float verticalSoft = smoothstep(0.02, 0.25, vUv.y) * smoothstep(1.0, 0.65 + 0.15 * flowNoise, vUv.y);
                    float halo = exp(-pow((vUv.x - 0.5) * 2.0, 2.4));
                    float alpha = brightness * 0.55;
                    alpha *= (0.65 + halo * 0.45 + organic * 0.2);
                    alpha *= (0.75 + flowNoise * 0.35);
                    alpha *= edgeBlur * verticalSoft * feather;
                    alpha = clamp(alpha, 0.0, 1.0);
                    alpha *= smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
                    gl_FragColor = vec4(color * brightness, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        ctx.auroraMaterials.push(auroraMaterial);
        const aurora = new THREE.Mesh(auroraGeometry, auroraMaterial);
        const angle = (i / auroraCount) * Math.PI * 0.4 - Math.PI * 0.2;
        const distance = 5600 + i * 90;
        aurora.position.set(
            Math.sin(angle) * distance,
            850 + i * 140,
            -Math.cos(angle) * distance
        );
        aurora.rotation.y = angle;
        ctx.auroraGroup.add(aurora);
    }
    ctx.scene.add(ctx.auroraGroup);
    return {
        group: ctx.auroraGroup,
        update(time) {
            ctx.auroraMaterials.forEach(material => {
                material.uniforms.time.value = time;
            });
        }
    };
}

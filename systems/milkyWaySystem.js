import * as THREE from 'three';

export function createMilkyWaySystem(ctx) {
    ctx.milkyWayMaterials = [];
    ctx.milkyWayGroup = new THREE.Group();
    const orientation = new THREE.Euler(
        THREE.MathUtils.degToRad(58),
        THREE.MathUtils.degToRad(38),
        THREE.MathUtils.degToRad(12),
        'XYZ'
    );
    const bandNormal = new THREE.Vector3(0, 1, 0).applyEuler(orientation).normalize();
    const bandAxis = new THREE.Vector3(1, 0, 0).applyEuler(orientation).normalize();
    createMilkyWayBandDome(ctx, bandNormal, bandAxis);
    createMilkyWayClusters(ctx, bandNormal, bandAxis);
    createMilkyWayMist(ctx, bandNormal, bandAxis);
    ctx.scene.add(ctx.milkyWayGroup);
    return {
        group: ctx.milkyWayGroup,
        update(time) {
            ctx.milkyWayMaterials.forEach(material => {
                if (material.uniforms?.time) {
                    material.uniforms.time.value = time;
                }
            });
        }
    };
}

function createMilkyWayBandDome(ctx, bandNormal, bandAxis) {
    const bandTangent = new THREE.Vector3().crossVectors(bandNormal, bandAxis).normalize();
    const geometry = new THREE.SphereGeometry(9000, 64, 64);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            bandNormal: { value: bandNormal },
            bandAxis: { value: bandAxis },
            bandTangent: { value: bandTangent },
            colorWarm: { value: new THREE.Color(0.98, 0.78, 0.64) },
            colorCool: { value: new THREE.Color(0.68, 0.82, 1.0) },
            colorCore: { value: new THREE.Color(1.08, 0.96, 0.88) }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vWorldPosition;
            uniform vec3 bandNormal;
            uniform vec3 bandAxis;
            uniform vec3 bandTangent;
            uniform vec3 colorWarm;
            uniform vec3 colorCool;
            uniform vec3 colorCore;
            uniform float time;
            float hash(vec3 p) {
                return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
            }
            float noise(vec3 p) {
                vec3 i = floor(p);
                vec3 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                float n000 = hash(i + vec3(0.0, 0.0, 0.0));
                float n100 = hash(i + vec3(1.0, 0.0, 0.0));
                float n010 = hash(i + vec3(0.0, 1.0, 0.0));
                float n110 = hash(i + vec3(1.0, 1.0, 0.0));
                float n001 = hash(i + vec3(0.0, 0.0, 1.0));
                float n101 = hash(i + vec3(1.0, 0.0, 1.0));
                float n011 = hash(i + vec3(0.0, 1.0, 1.0));
                float n111 = hash(i + vec3(1.0, 1.0, 1.0));
                float n00 = mix(n000, n100, f.x);
                float n10 = mix(n010, n110, f.x);
                float n01 = mix(n001, n101, f.x);
                float n11 = mix(n011, n111, f.x);
                float n0 = mix(n00, n10, f.y);
                float n1 = mix(n01, n11, f.y);
                return mix(n0, n1, f.z);
            }
            float fbm(vec3 p) {
                float v = 0.0;
                float amp = 0.5;
                float freq = 1.4;
                for (int i = 0; i < 5; i++) {
                    v += amp * noise(p * freq);
                    freq *= 2.2;
                    amp *= 0.55;
                }
                return v;
            }
            void main() {
                vec3 dir = normalize(vWorldPosition);
                if (dir.y <= 0.0) discard;
                float dist = dot(dir, bandNormal);
                float base = exp(-pow(abs(dist) * 3.4, 1.35));
                vec3 uvw = vec3(
                    dot(dir, bandAxis),
                    dot(dir, bandTangent),
                    dist
                );
                float coarse = fbm(uvw * 6.0 + vec3(0.0, time * 0.07, 0.0));
                float fine = fbm(uvw * 16.0 + vec3(time * 0.03, 0.0, time * 0.02));
                float filaments = fbm(uvw * 24.0 + vec3(1.7, time * 0.04, 2.3));
                float dust = smoothstep(0.32, 0.75, fbm(uvw * 12.0 + vec3(3.1, time * 0.05, -2.8)));
                float brightness = base * (0.25 + 0.8 * coarse + 0.35 * fine);
                brightness *= (1.0 - dust * 0.42);
                brightness *= 0.85 + filaments * 0.2;
                brightness = clamp(brightness, 0.0, 2.0);
                float along = uvw.x * 0.5 + 0.5;
                float warmMix = smoothstep(0.08, 0.8, base);
                warmMix += 0.25 * sin((along + time * 0.004) * 6.2831);
                warmMix = clamp(warmMix, 0.0, 1.0);
                vec3 color = mix(colorCool, colorWarm, warmMix);
                color = mix(color, colorCore, smoothstep(0.3, 0.95, base) * 0.55 + filaments * 0.15);
                float alpha = brightness * 0.55;
                alpha *= smoothstep(0.0, 0.18, dir.y);
                if (alpha < 0.002) discard;
                gl_FragColor = vec4(color * brightness, clamp(alpha, 0.0, 1.0));
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide
    });
    ctx.milkyWayMaterials.push(material);
    const dome = new THREE.Mesh(geometry, material);
    ctx.milkyWayGroup.add(dome);
}

function createMilkyWayClusters(ctx, bandNormal, bandAxis) {
    const bandBinormal = new THREE.Vector3().crossVectors(bandNormal, bandAxis).normalize();
    const radius = 5500;
    const gaussRandom = () => {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };
    const layers = [
        { count: 42000, spread: 620, size: [0.5, 1.4], tint: new THREE.Color(0.76, 0.84, 1.0) },
        { count: 22000, spread: 880, size: [0.9, 2.6], tint: new THREE.Color(1.0, 0.86, 0.76) },
        { count: 12000, spread: 1200, size: [1.6, 3.6], tint: new THREE.Color(1.05, 0.94, 0.88) }
    ];
    layers.forEach(layer => {
        const positions = [];
        const colors = [];
        const sizes = [];
        const phases = [];
        let attempts = 0;
        while (positions.length / 3 < layer.count && attempts < layer.count * 4) {
            attempts++;
            const t = Math.random() * Math.PI * 2;
            const radialDir = new THREE.Vector3()
                .copy(bandAxis).multiplyScalar(Math.cos(t))
                .add(bandBinormal.clone().multiplyScalar(Math.sin(t)))
                .normalize();
            const spineWave = Math.sin(t * 3.1) * 0.35 + Math.sin(t * 6.3) * 0.15;
            const offset = (gaussRandom() * 0.55 + spineWave * 0.6) * layer.spread;
            const radialJitter = gaussRandom() * 0.06 * radius;
            const position = radialDir.clone().multiplyScalar(radius + radialJitter).add(bandNormal.clone().multiplyScalar(offset));
            if (position.y < 0) continue;
            positions.push(position.x, position.y, position.z);
            const proximity = Math.exp(-Math.abs(offset) / (layer.spread * 0.82));
            const randomWarm = 0.2 + Math.random() * 0.6;
            const color = layer.tint.clone();
            color.lerp(new THREE.Color(1.0, 0.88, 0.76), proximity * randomWarm * 0.6);
            color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
            colors.push(color.r, color.g, color.b);
            const baseSize = layer.size[0] + Math.pow(Math.random(), 2) * (layer.size[1] - layer.size[0]);
            sizes.push(baseSize + proximity * 0.8);
            phases.push(Math.random() * Math.PI * 2);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('twinklePhase', new THREE.Float32BufferAttribute(phases, 1));
        const material = new THREE.ShaderMaterial({
            uniforms: { time: { value: 0 } },
            vertexShader: `
                attribute float size;
                attribute float twinklePhase;
                varying vec3 vColor;
                uniform float time;
                void main() {
                    vColor = color;
                    float sparkle = 0.6 + 0.4 * sin(time * 1.4 + twinklePhase);
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * sparkle * (260.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    float halo = exp(-dist * 4.0);
                    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                    vec3 color = vColor * (alpha + halo * 0.6);
                    gl_FragColor = vec4(color, alpha * 0.85 + halo * 0.35);
                }
            `,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        ctx.milkyWayMaterials.push(material);
        const stars = new THREE.Points(geometry, material);
        ctx.milkyWayGroup.add(stars);
    });
}

function createMilkyWayMist(ctx, bandNormal, bandAxis) {
    const bandBinormal = new THREE.Vector3().crossVectors(bandNormal, bandAxis).normalize();
    const radius = 5200;
    const patches = 18;
    const baseGeometry = new THREE.PlaneGeometry(1600, 1000, 1, 1);
    let created = 0;
    let attempts = 0;
    while (created < patches && attempts < patches * 6) {
        attempts++;
        const t = (created / patches) * Math.PI * 2 + Math.random() * 0.35;
        const radialDir = new THREE.Vector3()
            .copy(bandAxis).multiplyScalar(Math.cos(t))
            .add(bandBinormal.clone().multiplyScalar(Math.sin(t)))
            .normalize();
        const heightWave = Math.sin(t * 2.5) * 0.5 + Math.sin(t * 5.7) * 0.25;
        const offset = (Math.random() - 0.5 + heightWave * 0.4) * 700;
        const distance = radius + (Math.random() - 0.5) * 350;
        const position = radialDir.clone().multiplyScalar(distance).add(bandNormal.clone().multiplyScalar(offset));
        if (position.y < 0) continue;
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                colorA: { value: new THREE.Color(0.86 + Math.random() * 0.08, 0.74 + Math.random() * 0.08, 0.94) },
                colorB: { value: new THREE.Color(0.64, 0.86, 1.0) },
                intensity: { value: 0.32 + Math.random() * 0.2 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform float time;
                uniform vec3 colorA;
                uniform vec3 colorB;
                uniform float intensity;
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
                    float v = 0.0;
                    float amp = 0.6;
                    float freq = 1.2;
                    for (int i = 0; i < 5; i++) {
                        v += amp * noise(p * freq);
                        freq *= 2.0;
                        amp *= 0.55;
                    }
                    return v;
                }
                void main() {
                    vec2 p = vUv * 2.0 - 1.0;
                    p.x *= 1.6;
                    float drift = time * 0.02;
                    float band = exp(-pow(abs(p.y) * 1.6, 1.2));
                    float cloud = fbm(p * 1.8 + vec2(drift, -drift * 0.7));
                    float filaments = fbm(p * 4.5 + vec2(-drift * 0.3, drift * 0.5));
                    float alpha = band * (0.28 + 0.55 * cloud) * intensity;
                    alpha *= 1.0 - smoothstep(0.55, 1.0, abs(p.x));
                    alpha *= 1.0 - smoothstep(0.35, 0.9, filaments);
                    if (alpha < 0.01) discard;
                    vec3 color = mix(colorB, colorA, 0.5 + 0.5 * cloud);
                    color += filaments * 0.25;
                    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        ctx.milkyWayMaterials.push(material);
        const patch = new THREE.Mesh(baseGeometry, material);
        patch.position.copy(position);
        patch.lookAt(0, 0, 0);
        patch.rotation.z += Math.random() * Math.PI * 2;
        patch.scale.setScalar(0.85 + Math.random() * 0.5);
        ctx.milkyWayGroup.add(patch);
        created++;
    }
}

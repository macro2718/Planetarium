import * as THREE from '../../three.module.js';

export function createIceSurface(ctx) {
    const iceGeometry = new THREE.CircleGeometry(9500, 160);
    iceGeometry.rotateX(-Math.PI / 2);
    iceGeometry.translate(0, -42, 0);

    const iceMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            moonPosition: { value: new THREE.Vector3(2000, 1500, -2000) },
            moonIntensity: { value: 0.55 },
            frostDepth: { value: 18.0 },
            auroraTint: { value: new THREE.Color(0.16, 0.32, 0.48) },
            iceBase: { value: new THREE.Color(0.045, 0.07, 0.11) },
            iceHighlight: { value: new THREE.Color(0.5, 0.65, 0.78) },
            milkyWayDirection: { value: new THREE.Vector3(0, 1, 0) },
            milkyWayIntensity: { value: 0 }
        },
        vertexShader: `
            uniform float time;
            uniform float frostDepth;
            varying float vHeight;
            varying float vRadial;
            varying vec3 vWorldPos;
            varying float vCrackMask;
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
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            float fbm(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                for (int i = 0; i < 5; i++) {
                    value += amplitude * noise(p * frequency);
                    frequency *= 2.0;
                    amplitude *= 0.55;
                }
                return value;
            }
            void main() {
                vec3 pos = position;
                float dist = clamp(length(pos.xz) / 9500.0, 0.0, 1.0);
                float timeFlow = time * 0.2;
                float slowDrift = fbm(pos.xz * 0.0007 + timeFlow * 0.01);
                float frostWaves = fbm(pos.xz * vec2(0.0016, 0.0012) - timeFlow * 0.015);
                float fractured = fbm(pos.xz * 0.008 + vec2(timeFlow * 0.08, -timeFlow * 0.05));
                float radialFade = smoothstep(0.0, 0.9, dist);
                float crystalRidge = sin(dot(pos.xz, vec2(0.32, -0.48)) * 0.08 + timeFlow * 0.35);
                float elevation = (slowDrift * 18.0) + (frostWaves * frostDepth) + (crystalRidge * 4.0);
                elevation *= mix(0.45, 1.1, radialFade);
                pos.y += elevation * (1.0 - smoothstep(0.8, 1.0, dist));
                vHeight = pos.y;
                vRadial = dist;
                vCrackMask = smoothstep(0.5, 0.9, fractured);
                vec4 worldPos = modelMatrix * vec4(pos, 1.0);
                vWorldPos = worldPos.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 moonPosition;
            uniform float moonIntensity;
            uniform vec3 milkyWayDirection;
            uniform float milkyWayIntensity;
            uniform vec3 auroraTint;
            uniform vec3 iceBase;
            uniform vec3 iceHighlight;
            varying float vHeight;
            varying float vRadial;
            varying vec3 vWorldPos;
            varying float vCrackMask;
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
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            float fbm(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                for (int i = 0; i < 4; i++) {
                    value += amplitude * noise(p);
                    p *= 2.0;
                    amplitude *= 0.55;
                }
                return value;
            }
            void main() {
                vec3 viewDir = normalize(cameraPosition - vWorldPos);
                vec3 moonDir = normalize(moonPosition - vWorldPos);
                float fresnel = pow(1.0 - max(dot(viewDir, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
                float frost = fbm(vWorldPos.xz * 0.15 + time * 0.18);
                float glaze = fbm(vWorldPos.xz * 0.05 - time * 0.05);
                float depthShade = smoothstep(-65.0, 40.0, vHeight);
                float horizonGlow = smoothstep(0.65, 0.95, vRadial);
                vec3 base = mix(iceBase, auroraTint * 0.55 + iceBase * 0.45, depthShade);
                vec3 caustic = mix(base, iceHighlight, glaze * 0.22 + fresnel * 0.32);
                caustic += iceHighlight * frost * 0.18 * (1.0 - horizonGlow);
                float crackPulse = sin(time * 0.8 + vHeight * 0.05) * 0.5 + 0.5;
                vec3 cracks = mix(vec3(0.06, 0.11, 0.18), iceHighlight, crackPulse) * vCrackMask * 0.72;
                vec3 moonGlow = vec3(0.6, 0.68, 0.78) * pow(max(dot(vec3(0.0, 1.0, 0.0), moonDir), 0.0), 4.0) * (moonIntensity * 0.9);
                vec3 milkyDir = normalize(milkyWayDirection);
                float milkyFacing = pow(max(dot(vec3(0.0, 1.0, 0.0), milkyDir), 0.0), 2.0);
                float milkyAltitude = smoothstep(0.0, 0.35, milkyDir.y);
                vec3 milkyGlow = vec3(0.08, 0.12, 0.18);
                float milkyMask = milkyWayIntensity * (0.45 + milkyAltitude * 0.55);
                vec3 color = base;
                color = mix(color, caustic, 0.85);
                color += cracks;
                color += milkyGlow * milkyFacing * milkyMask;
                color += moonGlow * (0.32 + fresnel * 0.48);
                color = mix(color, vec3(0.006, 0.01, 0.02), 0.4 + horizonGlow * 0.45);
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.DoubleSide,
        transparent: false
    });

    const iceMesh = new THREE.Mesh(iceGeometry, iceMaterial);

    const surface = {
        type: 'ice',
        meshes: [iceMesh],
        update(time, moonState, milkyWayLight) {
            iceMaterial.uniforms.time.value = time;
            if (moonState) {
                iceMaterial.uniforms.moonPosition.value.copy(moonState.position);
                iceMaterial.uniforms.moonIntensity.value = moonState.illumination;
            }
            if (milkyWayLight?.direction) {
                iceMaterial.uniforms.milkyWayDirection.value.copy(milkyWayLight.direction);
                iceMaterial.uniforms.milkyWayIntensity.value = milkyWayLight.intensity ?? 0;
            }
        },
        setActive(active) {
            iceMesh.visible = active;
        }
    };

    return surface;
}

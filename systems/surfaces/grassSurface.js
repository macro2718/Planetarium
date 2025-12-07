import * as THREE from '../../three.module.js';

export function createGrassSurface(ctx) {
    const grassRadius = 10500;
    const grassGeometry = new THREE.CircleGeometry(grassRadius, 180);
    grassGeometry.rotateX(-Math.PI / 2);
    grassGeometry.translate(0, -52, 0);

    const grassMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            moonPosition: { value: new THREE.Vector3(2000, 1500, -2000) },
            moonIntensity: { value: 0.5 }
        },
        vertexShader: `
            uniform float time;
            varying float vHeight;
            varying float vRadial;
            varying vec3 vWorldPos;
            varying float vBend;
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
                float dist = clamp(length(pos.xz) / ${grassRadius.toFixed(1)}, 0.0, 1.0);
                float flowTime = time * 0.28;
                float rollingHills = fbm(pos.xz * 0.0016 + flowTime * 0.016);
                float softMounds = fbm(pos.xz * vec2(0.001, 0.0013) - flowTime * 0.012);
                float elevation = (rollingHills * 28.0 + softMounds * 22.0);
                float meadowMask = smoothstep(0.08, 0.85, 1.0 - dist);
                float nearMask = 1.0 - smoothstep(0.0, 0.2, dist);
                elevation = mix(elevation, clamp(elevation, -14.0, 22.0), nearMask);
                float wind = sin(dot(pos.xz, vec2(0.24, -0.32)) * 0.06 + flowTime * 0.8) * 0.65;
                float breeze = fbm(pos.xz * 0.02 + flowTime * 0.6) * 0.85;
                float bend = (wind + breeze) * smoothstep(0.12, 0.92, dist);
                float rimRise = pow(smoothstep(0.48, 0.96, dist), 1.2);
                float rimHeight = mix(0.0, 210.0, rimRise);
                pos.y += elevation * meadowMask;
                pos.y += rimHeight;
                pos.xz += vec2(bend * 7.5, bend * -6.0) * (0.55 + dist * 0.65);
                vHeight = pos.y;
                vRadial = dist;
                vBend = bend;
                vec4 worldPos = modelMatrix * vec4(pos, 1.0);
                vWorldPos = worldPos.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 moonPosition;
            uniform float moonIntensity;
            varying float vHeight;
            varying float vRadial;
            varying vec3 vWorldPos;
            varying float vBend;
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
                float heightNorm = smoothstep(-48.0, 72.0, vHeight);
                float meadowMask = smoothstep(0.1, 0.9, 1.0 - vRadial);
                vec3 grassShadow = vec3(0.04, 0.07, 0.04);
                vec3 grassMid = vec3(0.12, 0.22, 0.11);
                vec3 grassHighlight = vec3(0.3, 0.45, 0.2);
                float patch = fbm(vWorldPos.xz * 0.02 + time * 0.15);
                float dew = pow(max(noise(vWorldPos.xz * 0.35 + time * 0.6), 0.0), 6.0);
                vec3 color = mix(grassShadow, grassMid, heightNorm);
                color = mix(color, grassHighlight, patch * 0.55 + dew * 0.35);
                float slopeX = dFdx(vHeight);
                float slopeZ = dFdy(vHeight);
                vec3 normal = normalize(vec3(-slopeX + vBend * 0.4, 1.6, -slopeZ - vBend * 0.3));
                vec3 moonDir = normalize(moonPosition - vWorldPos);
                float moonLight = pow(max(dot(normal, moonDir), 0.0), 1.4);
                vec3 moonGlow = vec3(0.55, 0.62, 0.72) * moonLight * (0.6 + moonIntensity * 0.8);
                float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
                vec3 rimColor = vec3(0.14, 0.24, 0.14) * rim;
                float path = smoothstep(0.7, 0.32, vRadial);
                float horizonRidge = smoothstep(0.42, 0.9, vRadial);
                vec3 horizonShade = mix(vec3(0.008, 0.012, 0.02), vec3(0.04, 0.075, 0.06), vRadial);
                vec3 silhouette = mix(vec3(0.0, 0.0, 0.0), horizonShade, horizonRidge);
                color += moonGlow * path * meadowMask;
                color += rimColor * meadowMask;
                color = mix(color, horizonShade, vRadial * 0.4);
                color = mix(color, silhouette, horizonRidge);
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.DoubleSide,
        transparent: false
    });

    const grassMesh = new THREE.Mesh(grassGeometry, grassMaterial);

    const surface = {
        type: 'grass',
        meshes: [grassMesh],
        update(time, moonState) {
            grassMaterial.uniforms.time.value = time;
            if (moonState) {
                grassMaterial.uniforms.moonPosition.value.copy(moonState.position);
                grassMaterial.uniforms.moonIntensity.value = moonState.illumination;
            }
        },
        setActive(active) {
            grassMesh.visible = active;
        }
    };

    return surface;
}

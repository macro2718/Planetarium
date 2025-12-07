import * as THREE from '../../three.module.js';

export function createDesertSurface(ctx) {
    const desertGeometry = new THREE.CircleGeometry(9500, 128);
    desertGeometry.rotateX(-Math.PI / 2);
    // 砂丘の頂点がカメラより上に来ないよう、ベースの高さを少し下げる
    desertGeometry.translate(0, -45, 0);

    const desertMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            moonPosition: { value: new THREE.Vector3(2000, 1500, -2000) },
            moonIntensity: { value: 0.45 },
            milkyWayDirection: { value: new THREE.Vector3(0, 1, 0) },
            milkyWayIntensity: { value: 0 }
        },
        vertexShader: `
            uniform float time;
            varying float vHeight;
            varying float vRadial;
            varying float vDuneMask;
            varying vec3 vWorldPos;
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
                float amplitude = 0.42;
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
                // 視点付近では地形アニメを止め、遠景のみ時間で流れるようにする
                float timeBlend = smoothstep(0.35, 0.6, dist);
                float animatedTime = time * timeBlend;
                float sweepingDunes = fbm(pos.xz * vec2(0.0009, 0.0016) - animatedTime * 0.006);
                float crest = fbm(pos.xz * 0.0025 + animatedTime * 0.01);
                float windRidges = sin(dot(pos.xz, vec2(0.42, 0.28)) * 0.04 + animatedTime * 0.015) * 0.5 + 0.5;
                float duneHeight = (sweepingDunes * 40.0) + (crest * 28.0) + (windRidges * 26.0 - 8.0);
                float ripple = sin(dot(pos.xz, vec2(0.9, -0.4)) * 0.12 + animatedTime * 0.4) * 1.8;
                duneHeight += ripple * (0.3 + (1.0 - dist) * 0.4);
                // 視点付近は抑えつつ遠景で大きく盛り上げるスケール
                float duneScale = mix(0.35, 1.4, smoothstep(0.2, 0.65, dist));
                duneHeight *= duneScale;
                // 視点周辺では高さを安全値でクランプして潜り込みを防ぐ
                float nearMask = 1.0 - smoothstep(0.0, 0.25, dist);
                duneHeight = mix(duneHeight, clamp(duneHeight, -16.0, 24.0), nearMask);
                float desertMask = smoothstep(0.12, 0.8, 1.0 - dist) * smoothstep(1.0, 0.55, dist);
                pos.y += duneHeight * desertMask;
                vHeight = pos.y;
                vRadial = dist;
                vDuneMask = desertMask;
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
            varying float vHeight;
            varying float vRadial;
            varying float vDuneMask;
            varying vec3 vWorldPos;
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
                // 地形を 20 下げたので正規化範囲も同じ分だけオフセット
                float heightNorm = smoothstep(-55.0, 100.0, vHeight);
                float horizonShade = smoothstep(0.65, 0.95, vRadial);
                float horizonLightMask = 1.0 - horizonShade * 0.7;
                vec3 sandShadow = vec3(0.16, 0.12, 0.10);
                vec3 sandBase = vec3(0.32, 0.27, 0.22);
                vec3 sandHighlight = vec3(0.62, 0.55, 0.44);
                float duneGrain = fbm(vec2(vHeight * 0.008, vRadial * 4.0));
                float windRipple = fbm(vec2(vHeight * 0.02 + time * 0.15, vRadial * 3.0 + time * 0.05));
                float sparkle = sin(vHeight * 0.06 + time * 0.5) * 0.5 + 0.5;
                float slopeX = dFdx(vHeight);
                float slopeZ = dFdy(vHeight);
                vec3 normal = normalize(vec3(-slopeX, 1.6, -slopeZ));
                vec3 moonDir = normalize(moonPosition - vWorldPos);
                float moonLight = pow(max(dot(normal, moonDir), 0.0), 1.2);
                float coolShade = 0.35 + heightNorm * 0.4;
                vec3 color = mix(sandShadow, sandBase, heightNorm);
                color = mix(color, sandHighlight, duneGrain * 0.7 + windRipple * 0.2);
                color = mix(color, vec3(0.08, 0.1, 0.16), coolShade * 0.25);
                color += sandHighlight * sparkle * 0.05 * vDuneMask * horizonLightMask;
                vec3 moonGlow = mix(vec3(0.24, 0.21, 0.18), vec3(0.65, 0.56, 0.48), heightNorm);
                color += moonGlow * (moonLight * (0.45 + moonIntensity * 0.85) * horizonLightMask);
                vec3 milkyDir = normalize(milkyWayDirection);
                float milkyFacing = pow(max(dot(normal, milkyDir), 0.0), 1.05);
                float milkyAltitude = smoothstep(0.0, 0.35, milkyDir.y);
                vec3 milkyGlow = mix(vec3(0.07, 0.1, 0.15), vec3(0.12, 0.16, 0.22), heightNorm);
                float milkyMask = milkyWayIntensity * (0.4 + milkyAltitude * 0.6) * horizonLightMask;
                color += milkyGlow * milkyFacing * milkyMask;
                float duneRim = smoothstep(0.45, 0.9, duneGrain + windRipple * 0.3);
                color += vec3(0.26, 0.24, 0.2) * duneRim * 0.08;
                float stardust = pow(max(noise(vWorldPos.xz * 0.08 + time * 0.6), 0.0), 4.0) * moonIntensity;
                color += vec3(0.5, 0.65, 0.9) * stardust * 0.08 * horizonLightMask;
                vec3 nightTint = vec3(0.02, 0.025, 0.035);
                color = mix(color, nightTint, 0.38 + horizonShade * 0.3);
                color = mix(color, vec3(0.015, 0.018, 0.03), horizonShade * 0.85);
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.DoubleSide,
        transparent: false
    });

    const desertMesh = new THREE.Mesh(desertGeometry, desertMaterial);

    const surface = {
        type: 'desert',
        meshes: [desertMesh],
        update(time, moonState, milkyWayLight) {
            desertMaterial.uniforms.time.value = time;
            if (moonState) {
                desertMaterial.uniforms.moonPosition.value.copy(moonState.position);
                desertMaterial.uniforms.moonIntensity.value = moonState.illumination;
            }
            if (milkyWayLight?.direction) {
                desertMaterial.uniforms.milkyWayDirection.value.copy(milkyWayLight.direction);
                desertMaterial.uniforms.milkyWayIntensity.value = milkyWayLight.intensity ?? 0;
            }
        },
        setActive(active) {
            desertMesh.visible = active;
        }
    };

    return surface;
}

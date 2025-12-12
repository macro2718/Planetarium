import * as THREE from '../../three.module.js';

export function createWaterSurface(ctx) {
    const waterRadius = 9500;
    const waterGeometry = new THREE.CircleGeometry(waterRadius, 256);
    waterGeometry.rotateX(-Math.PI / 2);
    waterGeometry.translate(0, -25, 0);

    const waterMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            moonPosition: { value: new THREE.Vector3(2000, 1500, -2000) },
            moonIntensity: { value: 0.5 },
            milkyWayDirection: { value: new THREE.Vector3(0, 1, 0) },
            milkyWayIntensity: { value: 0 },
            starReflectionIntensity: { value: 0.4 },
            waveScale: { value: 1.0 },
            choppiness: { value: 0.85 },
            roughness: { value: 0.06 },
            foamStrength: { value: 1.0 },
            deepColor: { value: new THREE.Color(0.01, 0.02, 0.06) },
            shallowColor: { value: new THREE.Color(0.03, 0.06, 0.12) },
            skyReflectionColor: { value: new THREE.Color(0.05, 0.08, 0.18) },
            foamColor: { value: new THREE.Color(0.86, 0.92, 1.0) },
            horizonTintColor: { value: new THREE.Color(0.16, 0.2, 0.32) },
            waterRadius: { value: waterRadius }
        },
        vertexShader: `
            uniform float time;
            uniform float waveScale;
            uniform float choppiness;
            uniform float waterRadius;
            varying vec2 vUv;
            varying vec3 vWorldPosition;
            varying vec3 vNormal;
            varying float vWaveHeight;
            varying float vFoamMask;
            varying float vRadial;
            const float PI = 3.141592653589793;

            void gerstner(
                inout vec3 pos,
                inout vec3 tangent,
                inout vec3 binormal,
                vec2 dir,
                float steepness,
                float amplitude,
                float wavelength,
                float speed,
                float phaseOffset,
                float strength
            ) {
                dir = normalize(dir);
                float k = 2.0 * PI / wavelength;
                float a = amplitude * strength;
                float q = clamp(steepness * choppiness, 0.0, 0.98);

                float f = k * dot(dir, pos.xz) + speed * time + phaseOffset;
                float s = sin(f);
                float c = cos(f);

                pos.x += dir.x * (q * a) * c;
                pos.z += dir.y * (q * a) * c;
                pos.y += a * s;

                float wa = k * a;
                tangent += vec3(
                    -dir.x * dir.x * q * wa * s,
                    dir.x * wa * c,
                    -dir.x * dir.y * q * wa * s
                );
                binormal += vec3(
                    -dir.x * dir.y * q * wa * s,
                    dir.y * wa * c,
                    -dir.y * dir.y * q * wa * s
                );
            }

            void main() {
                vUv = uv;
                vec3 pos = position;
                float radial = clamp(length(pos.xz) / waterRadius, 0.0, 1.0);
                vRadial = radial;

                float farFalloff = mix(1.0, 0.35, pow(radial, 0.75));
                float strength = waveScale * farFalloff;

                vec3 tangent = vec3(1.0, 0.0, 0.0);
                vec3 binormal = vec3(0.0, 0.0, 1.0);

                vec3 basePos = pos;

                gerstner(pos, tangent, binormal, vec2(1.0, 0.08), 0.38, 18.0, 1200.0, 0.18, 0.2, strength);
                gerstner(pos, tangent, binormal, vec2(0.72, 0.62), 0.32, 12.0, 820.0, 0.24, 1.5, strength);
                gerstner(pos, tangent, binormal, vec2(-0.58, 0.82), 0.26, 8.5, 520.0, 0.32, 3.1, strength);
                gerstner(pos, tangent, binormal, vec2(-1.0, 0.18), 0.20, 5.5, 320.0, 0.42, 4.2, strength);
                gerstner(pos, tangent, binormal, vec2(0.22, -1.0), 0.16, 3.2, 190.0, 0.56, 5.7, strength * mix(1.0, 0.0, pow(radial, 1.15)));

                vWaveHeight = pos.y - basePos.y;
                vNormal = normalize(cross(binormal, tangent));

                float slope = 1.0 - clamp(vNormal.y, 0.0, 1.0);
                float crest = smoothstep(0.08, 0.22, slope);
                float heightFoam = smoothstep(10.0, 26.0, vWaveHeight);
                float foam = max(crest, heightFoam);
                foam *= mix(1.0, 0.25, radial);
                vFoamMask = clamp(foam, 0.0, 1.0);

                vec4 worldPos = modelMatrix * vec4(pos, 1.0);
                vWorldPosition = worldPos.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 moonPosition;
            uniform float moonIntensity;
            uniform vec3 milkyWayDirection;
            uniform float milkyWayIntensity;
            uniform float starReflectionIntensity;
            uniform float roughness;
            uniform float foamStrength;
            uniform vec3 deepColor;
            uniform vec3 shallowColor;
            uniform vec3 skyReflectionColor;
            uniform vec3 foamColor;
            uniform vec3 horizonTintColor;
            varying vec2 vUv;
            varying vec3 vWorldPosition;
            varying vec3 vNormal;
            varying float vWaveHeight;
            varying float vFoamMask;
            varying float vRadial;
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
                for (int i = 0; i < 5; i++) {
                    value += amplitude * noise(p);
                    p *= 2.0;
                    amplitude *= 0.5;
                }
                return value;
            }

            float starPattern(vec2 uv, float t) {
                float stars = 0.0;
                vec2 grid = uv * 70.0;
                vec2 cell = floor(grid);
                vec2 f = fract(grid);
                for (float x = -1.0; x <= 1.0; x++) {
                    for (float y = -1.0; y <= 1.0; y++) {
                        vec2 c = cell + vec2(x, y);
                        float rand = hash(c);
                        if (rand > 0.985) {
                            vec2 center = vec2(hash(c + vec2(1.3, 2.1)), hash(c + vec2(3.7, 4.9)));
                            vec2 d = (vec2(x, y) + center) - f;
                            float dist = length(d);
                            float twinkle = sin(t * (2.0 + rand * 3.0) + rand * 6.28) * 0.5 + 0.5;
                            stars += smoothstep(0.18, 0.0, dist) * twinkle * (0.4 + rand * 0.6);
                        }
                    }
                }
                return stars;
            }

            float fresnelSchlick(float cosTheta, float f0) {
                return f0 + (1.0 - f0) * pow(1.0 - cosTheta, 5.0);
            }

            void main() {
                vec3 viewDir = normalize(cameraPosition - vWorldPosition);

                vec3 baseNormal = normalize(vNormal);
                float radial = clamp(vRadial, 0.0, 1.0);

                vec2 p = vWorldPosition.xz;
                float microFade = pow(1.0 - radial, 1.8);
                vec2 microUv = p * 0.06 + vec2(time * 0.22, -time * 0.18);
                float n = fbm(microUv);
                float eps = 0.18;
                float nx = fbm(microUv + vec2(eps, 0.0)) - n;
                float nz = fbm(microUv + vec2(0.0, eps)) - n;
                vec3 microNormal = normalize(vec3(-nx * 3.0, 1.0, -nz * 3.0));

                vec3 normal = normalize(mix(baseNormal, microNormal, 0.55 * microFade));
                float NoV = clamp(dot(normal, viewDir), 0.0, 1.0);
                float fresnel = fresnelSchlick(NoV, 0.02);

                float depth = pow(radial, 1.15);
                vec3 waterColor = mix(shallowColor, deepColor, depth);

                vec3 moonDir = normalize(moonPosition - vWorldPosition);
                vec3 reflectDir = reflect(-viewDir, normal);

                float NoR = clamp(dot(reflectDir, moonDir), 0.0, 1.0);
                float waveRough = roughness + (1.0 - normal.y) * 0.12 + (1.0 - microFade) * 0.05;
                waveRough = clamp(waveRough, 0.02, 0.28);
                float specPower = mix(900.0, 80.0, waveRough);
                float moonSpec = pow(NoR, specPower);
                vec3 moonReflection = vec3(0.92, 0.88, 0.82) * moonSpec * moonIntensity * (2.6 + fresnel * 1.2);

                vec2 reflectUV = reflectDir.xz / (abs(reflectDir.y) + 0.35);
                reflectUV += normal.xz * 0.05;
                float stars = starPattern(reflectUV * 0.18, time);
                vec3 starReflection = vec3(0.68, 0.74, 0.92) * stars * starReflectionIntensity * (0.3 + 0.7 * fresnel);

                vec3 skyReflect = skyReflectionColor * (0.22 + 0.78 * fresnel);

                vec3 milkyDir = normalize(milkyWayDirection);
                float milkyMask = pow(max(dot(reflectDir, milkyDir), 0.0), 2.2);
                milkyMask *= milkyWayIntensity;
                vec3 milkyColor = vec3(0.16, 0.18, 0.24) * milkyMask * (0.4 + 0.6 * fresnel);

                float horizon = smoothstep(0.62, 0.98, radial);
                vec3 horizonColor = horizonTintColor * horizon * (0.18 + 0.55 * fresnel);

                vec3 reflection = skyReflect + milkyColor + starReflection + moonReflection + horizonColor;
                vec3 finalColor = mix(waterColor, reflection, clamp(0.08 + fresnel * 0.92, 0.0, 1.0));

                float caustics = fbm(p * 0.05 + vec2(time * 0.08, -time * 0.06));
                caustics = pow(max(caustics, 0.0), 3.0) * (1.0 - depth);
                finalColor += vec3(0.14, 0.2, 0.28) * caustics * 0.25 * microFade;

                float foamNoise = fbm(p * 0.08 + vec2(time * 0.12, time * 0.09));
                float foam = smoothstep(0.28, 0.92, vFoamMask * foamStrength + (foamNoise - 0.55) * 0.35);
                vec3 foamContrib = foamColor * foam * (0.55 + 0.45 * fresnel);
                finalColor = mix(finalColor, foamContrib, clamp(foam * 0.65, 0.0, 0.85));

                float vignette = smoothstep(1.0, 0.6, radial);
                finalColor *= 0.85 + 0.15 * vignette;

                float alpha = 0.9 + fresnel * 0.08;
                alpha = clamp(alpha, 0.0, 0.98);
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true
    });

    const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    const { mesh: mistMesh, material: mistMaterial } = createWaterMist();

    const surface = {
        type: 'water',
        meshes: [waterMesh, mistMesh],
        update(time, moonState, milkyWayLight) {
            waterMaterial.uniforms.time.value = time;
            if (moonState) {
                waterMaterial.uniforms.moonPosition.value.copy(moonState.position);
                waterMaterial.uniforms.moonIntensity.value = moonState.illumination;
            }
            if (milkyWayLight) {
                waterMaterial.uniforms.milkyWayDirection.value.copy(milkyWayLight.direction);
                waterMaterial.uniforms.milkyWayIntensity.value = milkyWayLight.intensity;
            }
            if (mistMaterial) {
                mistMaterial.uniforms.time.value = time;
            }
        },
        setActive(active) {
            this.meshes.forEach((mesh) => {
                mesh.visible = active;
            });
        }
    };

    return surface;
}

function createWaterMist() {
    const mistGeometry = new THREE.RingGeometry(7500, 9500, 128, 1);
    mistGeometry.rotateX(-Math.PI / 2);
    mistGeometry.translate(0, 0, 0);
    const mistMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vWorldPosition;
            void main() {
                vUv = uv;
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPos.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec2 vUv;
            varying vec3 vWorldPosition;
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
                float amp = 0.5;
                for (int i = 0; i < 4; i++) {
                    value += amp * noise(p);
                    p *= 2.0;
                    amp *= 0.5;
                }
                return value;
            }
            void main() {
                vec2 pos = vWorldPosition.xz * 0.0003;
                float mist = fbm(pos * 3.0 + time * 0.05);
                mist *= fbm(pos * 5.0 - time * 0.03);
                float radial = 1.0 - vUv.y;
                mist *= smoothstep(0.0, 0.5, radial);
                vec3 mistColor = vec3(0.15, 0.18, 0.25);
                float alpha = mist * 0.4 * radial;
                gl_FragColor = vec4(mistColor, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const mistMesh = new THREE.Mesh(mistGeometry, mistMaterial);
    return { mesh: mistMesh, material: mistMaterial };
}

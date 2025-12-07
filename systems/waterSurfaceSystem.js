import * as THREE from '../three.module.js';

export function createWaterSurfaceSystem(ctx, moonStateProvider) {
    ctx.waterSurfaceGroup = new THREE.Group();
    const waterGeometry = new THREE.CircleGeometry(9500, 128);
    waterGeometry.rotateX(-Math.PI / 2);
    waterGeometry.translate(0, -25, 0);
    const desertGeometry = new THREE.CircleGeometry(9500, 128);
    desertGeometry.rotateX(-Math.PI / 2);
    desertGeometry.translate(0, -25, 0);
    ctx.waterMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            moonPosition: { value: new THREE.Vector3(2000, 1500, -2000) },
            moonIntensity: { value: 0.5 },
            starReflectionIntensity: { value: 0.4 },
            waveScale: { value: 1.0 },
            deepColor: { value: new THREE.Color(0.01, 0.02, 0.06) },
            shallowColor: { value: new THREE.Color(0.03, 0.06, 0.12) },
            skyReflectionColor: { value: new THREE.Color(0.05, 0.08, 0.18) },
            tintColor: { value: new THREE.Color(0.08, 0.12, 0.22) },
            foamColor: { value: new THREE.Color(0.85, 0.9, 0.98) },
            horizonTintColor: { value: new THREE.Color(0.16, 0.2, 0.32) },
            tintStrength: { value: 0.45 },
            bloomIntensity: { value: 0.25 }
        },
        vertexShader: `
            uniform float time;
            uniform float waveScale;
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
                float frequency = 1.0;
                for (int i = 0; i < 6; i++) {
                    value += amplitude * noise(p * frequency);
                    frequency *= 2.0;
                    amplitude *= 0.5;
                }
                return value;
            }
            void main() {
                vUv = uv;
                vec3 pos = position;
                float dist = length(pos.xz) * 0.0005;
                float wave1 = sin(pos.x * 0.008 + time * 0.3) * cos(pos.z * 0.006 + time * 0.25) * 15.0;
                float wave2 = sin(pos.x * 0.012 - time * 0.2 + pos.z * 0.01) * 8.0;
                float wave3 = cos(pos.z * 0.015 + time * 0.35) * sin(pos.x * 0.009 - time * 0.15) * 6.0;
                float swell = sin(length(pos.xz) * 0.002 - time * 0.15) * 10.0;
                float directionalFlow = sin(dot(pos.xz, vec2(0.6, -0.4)) * 0.01 + time * 0.1) * 5.0;
                float ripple1 = fbm(pos.xz * 0.02 + time * 0.4) * 4.0;
                float ripple2 = fbm(pos.xz * 0.05 - time * 0.3) * 2.0;
                float microWave = noise(pos.xz * 0.08 + time * 0.6) * 1.5;
                float totalWave = (wave1 + wave2 + wave3 + swell + directionalFlow + ripple1 + ripple2 + microWave) * waveScale;
                float calmZone = smoothstep(0.2, 0.85, dist);
                calmZone = pow(calmZone, 1.5);
                totalWave *= calmZone;
                totalWave *= smoothstep(1.0, 0.3, dist);
                pos.y += totalWave;
                vWaveHeight = totalWave;
                float foam = smoothstep(5.0, 18.0, abs(totalWave));
                foam += fbm(pos.xz * 0.12 + time * 0.5) * 0.35;
                vFoamMask = clamp(foam * (1.0 - dist * 0.3), 0.0, 1.0);
                vRadial = clamp(length(pos.xz) / 9500.0, 0.0, 1.0);
                float dx = 0.015 * cos(pos.x * 0.008 + time * 0.3) * 15.0 +
                           0.012 * cos(pos.x * 0.012 - time * 0.2) * 8.0;
                float dz = 0.006 * sin(pos.z * 0.006 + time * 0.25) * 15.0 +
                           0.015 * cos(pos.z * 0.015 + time * 0.35) * 6.0;
                vNormal = normalize(vec3(-dx, 1.0, -dz));
                vec4 worldPos = modelMatrix * vec4(pos, 1.0);
                vWorldPosition = worldPos.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 moonPosition;
            uniform float moonIntensity;
            uniform float starReflectionIntensity;
            uniform vec3 deepColor;
            uniform vec3 shallowColor;
            uniform vec3 skyReflectionColor;
            uniform vec3 tintColor;
            uniform vec3 foamColor;
            uniform vec3 horizonTintColor;
            uniform float tintStrength;
            uniform float bloomIntensity;
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
            float starPattern(vec2 p, float t) {
                float stars = 0.0;
                for (float i = 0.0; i < 3.0; i++) {
                    float scale = 50.0 + i * 80.0;
                    vec2 grid = floor(p * scale);
                    vec2 f = fract(p * scale);
                    float rand = hash(grid + i * 100.0);
                    if (rand > 0.97) {
                        vec2 center = vec2(hash(grid + vec2(1.0, 0.0)), hash(grid + vec2(0.0, 1.0)));
                        float dist = length(f - center);
                        float twinkle = sin(t * (2.0 + rand * 3.0) + rand * 6.28) * 0.5 + 0.5;
                        float star = smoothstep(0.1, 0.0, dist) * twinkle * (0.5 + rand * 0.5);
                        stars += star;
                    }
                }
                return stars;
            }
            void main() {
                vec3 viewDir = normalize(cameraPosition - vWorldPosition);
                vec3 normal = normalize(vNormal);
                float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
                fresnel = mix(0.2, 1.0, fresnel);
                float depth = smoothstep(0.0, 8000.0, length(vWorldPosition.xz));
                vec3 waterColor = mix(shallowColor, deepColor, depth);
                vec3 tintedWater = mix(waterColor, tintColor, tintStrength * (0.3 + fresnel * 0.7));
                waterColor = mix(waterColor, tintedWater, 0.6);
                float waveHighlight = smoothstep(0.0, 20.0, vWaveHeight) * 0.15;
                vec3 moonDir = normalize(moonPosition - vWorldPosition);
                vec3 reflectDir = reflect(-viewDir, normal);
                float moonSpec = pow(max(dot(reflectDir, moonDir), 0.0), 256.0);
                vec3 moonReflection = vec3(0.9, 0.88, 0.82) * moonSpec * moonIntensity * 3.0;
                float moonPathAngle = atan(vWorldPosition.z, vWorldPosition.x);
                float moonAngle = atan(moonPosition.z, moonPosition.x);
                float angleDiff = abs(moonPathAngle - moonAngle);
                angleDiff = min(angleDiff, 6.28318 - angleDiff);
                float moonPath = exp(-angleDiff * angleDiff * 8.0);
                float distFromCenter = length(vWorldPosition.xz);
                moonPath *= smoothstep(9000.0, 1000.0, distFromCenter);
                float pathSparkle = noise(vWorldPosition.xz * 0.02 + time * 0.5) * 0.5 + 0.5;
                pathSparkle *= noise(vWorldPosition.xz * 0.08 - time * 0.3) * 0.5 + 0.5;
                moonPath *= (0.6 + pathSparkle * 0.8);
                vec3 moonPathColor = vec3(0.6, 0.58, 0.52) * moonPath * moonIntensity * 0.5;
                vec2 reflectUV = vWorldPosition.xz * 0.0001;
                reflectUV += normal.xz * 0.02;
                reflectUV += vec2(
                    noise(vWorldPosition.xz * 0.01 + time * 0.2),
                    noise(vWorldPosition.xz * 0.01 - time * 0.15)
                ) * 0.005;
                float stars = starPattern(reflectUV, time);
                float twinklingStars = 0.0;
                for (float i = 0.0; i < 5.0; i++) {
                    vec2 starUV = reflectUV * (30.0 + i * 25.0);
                    starUV += time * 0.02 * vec2(cos(i), sin(i));
                    float sparkle = hash(floor(starUV));
                    if (sparkle > 0.985) {
                        float twinkle = sin(time * (3.0 + i) + sparkle * 10.0) * 0.5 + 0.5;
                        twinklingStars += twinkle * 0.3;
                    }
                }
                stars += twinklingStars;
                vec3 starReflection = vec3(0.7, 0.75, 0.9) * stars * starReflectionIntensity;
                float milkyWayReflect = fbm(reflectUV * 3.0 + time * 0.02);
                milkyWayReflect *= smoothstep(0.3, 0.7, milkyWayReflect);
                vec3 milkyWayColor = vec3(0.15, 0.18, 0.25) * milkyWayReflect * 0.3;
                float sparkle = noise(vWorldPosition.xz * 0.05 + time * 0.8);
                sparkle *= noise(vWorldPosition.xz * 0.12 - time * 0.5);
                sparkle = pow(sparkle, 3.0) * 2.0;
                vec3 sparkleColor = vec3(0.5, 0.55, 0.7) * sparkle * fresnel;
                float horizonGlow = smoothstep(7000.0, 9000.0, length(vWorldPosition.xz));
                horizonGlow *= 0.15;
                vec3 horizonColor = vec3(0.1, 0.08, 0.15) * horizonGlow;
                vec3 skyReflect = skyReflectionColor * fresnel * 0.3;
                vec3 finalColor = waterColor;
                finalColor += skyReflect;
                finalColor += milkyWayColor;
                finalColor += starReflection;
                finalColor += moonReflection;
                finalColor += moonPathColor;
                finalColor += sparkleColor;
                finalColor += horizonColor;
                finalColor += vec3(waveHighlight * 0.5, waveHighlight * 0.55, waveHighlight * 0.7);
                float caustics = fbm(vWorldPosition.xz * 0.04 + time * 0.15);
                caustics = pow(max(caustics, 0.0), 3.0) * (1.0 - depth);
                finalColor += vec3(0.18, 0.23, 0.3) * caustics * 0.35;
                float foam = smoothstep(0.35, 0.9, vFoamMask);
                vec3 foamContrib = foamColor * foam * (0.7 + fresnel * 0.3);
                finalColor = mix(finalColor, foamContrib, clamp(foam * 0.5, 0.0, 0.6));
                float bloom = smoothstep(0.6, 1.0, vRadial) * bloomIntensity;
                finalColor += horizonTintColor * bloom;
                float vignette = smoothstep(9500.0, 5000.0, length(vWorldPosition.xz));
                finalColor *= (0.7 + vignette * 0.3);
                float alpha = 0.92 + fresnel * 0.08;
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true
    });
    ctx.desertMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            uniform float time;
            varying float vHeight;
            varying float vRadial;
            varying float vDuneMask;
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
                float sweepingDunes = fbm(pos.xz * vec2(0.0009, 0.0016) - time * 0.006);
                float crest = fbm(pos.xz * 0.0025 + time * 0.01);
                float windRidges = sin(dot(pos.xz, vec2(0.42, 0.28)) * 0.04 + time * 0.015) * 0.5 + 0.5;
                float duneHeight = (sweepingDunes * 40.0) + (crest * 28.0) + (windRidges * 26.0 - 8.0);
                float ripple = sin(dot(pos.xz, vec2(0.9, -0.4)) * 0.12 + time * 0.4) * 1.8;
                duneHeight += ripple * (0.3 + (1.0 - dist) * 0.4);
                float desertMask = smoothstep(0.12, 0.8, 1.0 - dist) * smoothstep(1.0, 0.55, dist);
                pos.y += duneHeight * desertMask;
                vHeight = pos.y;
                vRadial = dist;
                vDuneMask = desertMask;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying float vHeight;
            varying float vRadial;
            varying float vDuneMask;
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
                float heightNorm = smoothstep(-35.0, 120.0, vHeight);
                vec3 sandShadow = vec3(0.58, 0.47, 0.34);
                vec3 sandBase = vec3(0.82, 0.7, 0.55);
                vec3 sandHighlight = vec3(0.95, 0.88, 0.73);
                float duneGrain = fbm(vec2(vHeight * 0.008, vRadial * 4.0));
                float windRipple = fbm(vec2(vHeight * 0.02 + time * 0.15, vRadial * 3.0 + time * 0.05));
                float sparkle = sin(vHeight * 0.06 + time * 0.5) * 0.5 + 0.5;
                vec3 color = mix(sandShadow, sandBase, heightNorm);
                color = mix(color, sandHighlight, duneGrain * 0.6 + windRipple * 0.2);
                color += sandHighlight * sparkle * 0.04 * vDuneMask;
                float dusk = smoothstep(0.65, 0.9, vRadial);
                color = mix(color, vec3(0.93, 0.64, 0.42), dusk * 0.3);
                float oasisGlow = smoothstep(0.0, 0.35, vRadial);
                color = mix(vec3(0.97, 0.82, 0.65), color, clamp(oasisGlow + 0.15, 0.0, 1.0));
                float shade = 0.9 + (1.0 - heightNorm) * 0.08;
                color *= shade;
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.DoubleSide,
        transparent: false
    });
    const water = new THREE.Mesh(waterGeometry, ctx.waterMaterial);
    const desert = new THREE.Mesh(desertGeometry, ctx.desertMaterial);
    const surfaces = { water, desert };
    ctx.desertMesh = desert;
    ctx.waterSurfaceGroup.add(water);
    ctx.waterSurfaceGroup.add(desert);
    const mist = createWaterMist(ctx);
    ctx.scene.add(ctx.waterSurfaceGroup);
    const system = {
        group: ctx.waterSurfaceGroup,
        update(time) {
            if (ctx.waterMaterial) {
                ctx.waterMaterial.uniforms.time.value = time;
                const moonState = moonStateProvider?.();
                if (moonState) {
                    ctx.waterMaterial.uniforms.moonPosition.value.copy(moonState.position);
                    ctx.waterMaterial.uniforms.moonIntensity.value = moonState.illumination;
                }
            }
            if (ctx.mistMaterial) {
                ctx.mistMaterial.uniforms.time.value = time;
            }
            if (ctx.desertMaterial) {
                ctx.desertMaterial.uniforms.time.value = time;
            }
        },
        setSurfaceType(type = 'water') {
            const normalizedType = type === 'land' ? 'desert' : type;
            const targetSurface = surfaces[normalizedType] ?? surfaces.water;
            Object.values(surfaces).forEach((surface) => {
                surface.visible = surface === targetSurface;
            });
            if (mist) {
                mist.visible = normalizedType === 'water';
            }
        }
    };
    system.setSurfaceType(ctx.settings?.surfaceType ?? 'water');
    return system;
}

function createWaterMist(ctx) {
    const mistGeometry = new THREE.RingGeometry(7500, 9500, 128, 1);
    mistGeometry.rotateX(-Math.PI / 2);
    mistGeometry.translate(0, 0, 0);
    ctx.mistMaterial = new THREE.ShaderMaterial({
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
    const mist = new THREE.Mesh(mistGeometry, ctx.mistMaterial);
    ctx.waterSurfaceGroup.add(mist);
    return mist;
}

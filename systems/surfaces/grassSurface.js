import * as THREE from '../../three.module.js';

export function createGrassSurface(ctx) {
    const grassRadius = 12000;
    
    // メインの草原メッシュ - より高い解像度で自然な起伏を表現
    const grassGeometry = new THREE.CircleGeometry(grassRadius, 256);
    grassGeometry.rotateX(-Math.PI / 2);
    grassGeometry.translate(0, -50, 0);

    const grassMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            moonPosition: { value: new THREE.Vector3(2000, 1500, -2000) },
            moonIntensity: { value: 0.5 },
            groundRadius: { value: grassRadius }
        },
        vertexShader: `
            uniform float time;
            uniform float groundRadius;
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
                    amplitude *= 0.5;
                }
                return value;
            }
            
            void main() {
                vec3 pos = position;
                float dist = clamp(length(pos.xz) / groundRadius, 0.0, 1.0);
                float flowTime = time * 0.25;
                
                // 自然な起伏 - なだらかな丘陵
                float rollingHills = fbm(pos.xz * 0.0012 + flowTime * 0.01);
                float softMounds = fbm(pos.xz * vec2(0.0008, 0.001) - flowTime * 0.008);
                float microDetail = noise(pos.xz * 0.01) * 4.0;
                
                // 起伏の計算
                float elevation = rollingHills * 20.0 + softMounds * 15.0 + microDetail;
                
                // 中心付近は平らに、外側に向かって起伏を増やす
                float nearMask = 1.0 - smoothstep(0.0, 0.15, dist);
                elevation = mix(elevation, clamp(elevation, -5.0, 10.0), nearMask);
                
                // 風による揺れ
                float wind = sin(dot(pos.xz, vec2(0.2, -0.3)) * 0.05 + flowTime * 0.7) * 0.5;
                float breeze = fbm(pos.xz * 0.015 + flowTime * 0.5) * 0.6;
                float bend = (wind + breeze) * smoothstep(0.1, 0.8, dist);
                
                // 地平線に向かって緩やかに持ち上げる（空を遮るため）
                float rimRise = smoothstep(0.5, 0.98, dist);
                float rimHeight = rimRise * rimRise * 150.0;
                
                // 最終的な高さ
                float meadowMask = smoothstep(0.05, 0.9, 1.0 - dist);
                pos.y += elevation * meadowMask;
                pos.y += rimHeight;
                
                // 風による水平方向のずれ
                pos.xz += vec2(bend * 5.0, bend * -4.0) * (0.5 + dist * 0.5);
                
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
                    amplitude *= 0.5;
                }
                return value;
            }
            
            void main() {
                vec3 viewDir = normalize(cameraPosition - vWorldPos);
                float heightNorm = smoothstep(-50.0, 80.0, vHeight);
                float meadowMask = smoothstep(0.05, 0.92, 1.0 - vRadial);

                // 草原の基調色 - 深い森の緑をベースに、湿った苔のハイライトを追加
                vec3 grassShadow = vec3(0.012, 0.02, 0.013);    // 影の深い緑
                vec3 grassMid = vec3(0.035, 0.075, 0.042);      // 中間色
                vec3 grassLight = vec3(0.09, 0.16, 0.08);       // ハイライト
                vec3 mossHighlight = vec3(0.12, 0.21, 0.15);    // 湿った苔の輝き

                // パッチ状のテクスチャと微細な色変化
                float patchPattern = fbm(vWorldPos.xz * 0.015 + time * 0.1);
                float grassDetail = noise(vWorldPos.xz * 0.08);
                float cloverSpeckle = noise(vWorldPos.xz * 0.4 + time * 0.6);

                // 基本色の計算
                vec3 color = mix(grassShadow, grassMid, heightNorm * 0.8 + 0.1);
                color = mix(color, grassLight, patchPattern * 0.45 + grassDetail * 0.25);
                color = mix(color, mossHighlight, smoothstep(0.1, 0.7, heightNorm) * 0.25 + cloverSpeckle * 0.08);

                // 法線計算（起伏と風によるしなりから推定）
                float slopeX = dFdx(vHeight);
                float slopeZ = dFdy(vHeight);
                vec3 normal = normalize(vec3(-slopeX + vBend * 0.35, 1.5, -slopeZ - vBend * 0.28));

                // 月光の計算（やわらかなディフューズ + しっとりしたグレア）
                vec3 moonDir = normalize(moonPosition - vWorldPos);
                float moonLight = pow(max(dot(normal, moonDir), 0.0), 1.2);
                vec3 moonGlow = vec3(0.42, 0.47, 0.58) * moonLight * (0.35 + moonIntensity * 0.7);

                // 湿った草のハイライト（フェイクなマイクロファイバー反射）
                float microSheen = pow(max(dot(normalize(moonDir + viewDir), normal), 0.0), 18.0);
                vec3 dewSheen = vec3(0.25, 0.32, 0.38) * microSheen * (0.15 + moonIntensity * 0.45) * (1.2 - vRadial * 0.6);

                // 空からの環境光 - 深い青緑の霧を混ぜる
                float skyWrap = 0.5 + 0.5 * pow(max(dot(normal, vec3(0.0, 1.0, 0.0)), 0.0), 2.0);
                vec3 skyTint = vec3(0.04, 0.07, 0.1);
                color += skyTint * skyWrap * (0.28 + heightNorm * 0.2) * meadowMask;

                // リムライトで葉先を際立たせる
                float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.5);
                vec3 rimColor = vec3(0.06, 0.12, 0.08) * rim;

                // 地平線のシルエット（完全に黒く）
                float horizonFade = smoothstep(0.6, 0.95, vRadial);
                vec3 horizonColor = vec3(0.005, 0.008, 0.012); // ほぼ黒
                vec3 silhouette = vec3(0.0, 0.0, 0.0);

                // 月光と環境光の適用（中央付近のみ強調）
                float lightMask = smoothstep(0.8, 0.3, vRadial) * meadowMask;
                color += moonGlow * lightMask;
                color += dewSheen * lightMask;
                color += rimColor * meadowMask * (1.0 - horizonFade);

                // しなりによる陰影（草が風で傾いて密集する部分を暗く）
                float occlusion = mix(1.0, 0.7, smoothstep(0.0, 0.9, abs(vBend)));
                color *= occlusion;

                // 地平線に向かって暗くし、外縁をシルエットに
                color = mix(color, horizonColor, vRadial * 0.55);
                float silhouetteMask = smoothstep(0.85, 0.98, vRadial);
                color = mix(color, silhouette, silhouetteMask);

                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.FrontSide,
        transparent: false,
        depthWrite: true,
        depthTest: true
    });

    const grassMesh = new THREE.Mesh(grassGeometry, grassMaterial);
    grassMesh.renderOrder = 10;

    // 地平線を完全に覆う不透明なスカートメッシュ
    const skirtGeometry = new THREE.CylinderGeometry(grassRadius, grassRadius * 1.5, 800, 128, 1, true);
    const skirtMaterial = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: `
            varying float vHeight;
            void main() {
                vHeight = position.y;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying float vHeight;
            void main() {
                // 上から下へ暗くなるグラデーション
                float t = smoothstep(400.0, -400.0, vHeight);
                vec3 topColor = vec3(0.005, 0.008, 0.012);
                vec3 bottomColor = vec3(0.0, 0.0, 0.0);
                vec3 color = mix(topColor, bottomColor, t);
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.DoubleSide,
        transparent: false,
        depthWrite: true,
        depthTest: true
    });

    const skirtMesh = new THREE.Mesh(skirtGeometry, skirtMaterial);
    skirtMesh.position.y = -450;
    skirtMesh.renderOrder = 9;

    // 地平線のリングエフェクト（微かな輝き）
    const horizonRingGeometry = new THREE.RingGeometry(grassRadius - 200, grassRadius + 100, 256);
    horizonRingGeometry.rotateX(-Math.PI / 2);
    
    const horizonRingMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec2 vUv;
            void main() {
                float dist = abs(vUv.y - 0.5) * 2.0;
                float glow = exp(-dist * 4.0) * 0.15;
                vec3 color = vec3(0.02, 0.035, 0.025) * glow;
                float alpha = glow * 0.5;
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const horizonRingMesh = new THREE.Mesh(horizonRingGeometry, horizonRingMaterial);
    horizonRingMesh.position.y = 95;
    horizonRingMesh.renderOrder = 11;

    const surface = {
        type: 'grass',
        meshes: [grassMesh, skirtMesh, horizonRingMesh],
        update(time, moonState) {
            grassMaterial.uniforms.time.value = time;
            horizonRingMaterial.uniforms.time.value = time;
            if (moonState) {
                grassMaterial.uniforms.moonPosition.value.copy(moonState.position);
                grassMaterial.uniforms.moonIntensity.value = moonState.illumination;
            }
        },
        setActive(active) {
            grassMesh.visible = active;
            skirtMesh.visible = active;
            horizonRingMesh.visible = active;
        }
    };

    return surface;
}

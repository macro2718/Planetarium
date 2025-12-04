import * as THREE from 'three';

export function createMoonSystem(ctx) {
    ctx.moonGroup = new THREE.Group();
    ctx.scene.add(ctx.moonGroup);
    const moonRadius = 120;
    ctx.moonUniforms = {
        time: { value: 0 },
        phaseAngle: { value: 0 },
        illumination: { value: 0 },
        sunDirection: { value: new THREE.Vector3(0, 0.2, -1).normalize() },
        albedo: { value: new THREE.Color(0.86, 0.85, 0.82) }
    };
    const moonGeometry = new THREE.SphereGeometry(moonRadius, 128, 128);
    const moonMaterial = new THREE.ShaderMaterial({
        uniforms: ctx.moonUniforms,
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vWorldNormal;
            varying vec3 vObjectNormal;
            varying vec3 vPosition;
            varying vec3 vWorldPos;
            void main() {
                vUv = uv;
                vObjectNormal = normalize(normal);
                vWorldNormal = normalize(mat3(modelMatrix) * normal);
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPos = worldPos.xyz;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float phaseAngle;
            uniform float illumination;
            uniform vec3 sunDirection;
            uniform vec3 albedo;
            varying vec2 vUv;
            varying vec3 vWorldNormal;
            varying vec3 vObjectNormal;
            varying vec3 vPosition;
            varying vec3 vWorldPos;
            float hash(vec3 p) {
                p = fract(p * 0.3183099 + vec3(0.1, 0.1, 0.1));
                p *= 17.0;
                return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
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
                float value = 0.0;
                float amp = 0.5;
                float freq = 1.5;
                for (int i = 0; i < 5; i++) {
                    value += amp * noise(p * freq);
                    freq *= 2.1;
                    amp *= 0.55;
                }
                return value;
            }
            float crater(vec2 uv, vec2 center, float radius, float rim) {
                float d = length(uv - center);
                float floor = smoothstep(radius, radius * 0.2, d);
                float ring = smoothstep(radius, radius - rim, d);
                return clamp(ring * 0.8 + floor * 0.2, 0.0, 1.0);
            }
            void main() {
                vec3 baseColor = albedo;
                vec3 coord = normalize(vObjectNormal);
                float large = fbm(coord * 2.5);
                float mid = fbm(coord * 6.0 + vec3(0.0, time * 0.01, 0.0));
                float fine = fbm(coord * 14.0);
                float height = large * 0.55 + mid * 0.3 + fine * 0.15;
                baseColor -= height * vec3(0.25, 0.26, 0.24);
                float craterMap = 0.0;
                craterMap += crater(vUv, vec2(0.32, 0.54), 0.08, 0.02);
                craterMap += crater(vUv, vec2(0.58, 0.46), 0.05, 0.015);
                craterMap += crater(vUv, vec2(0.42, 0.32), 0.06, 0.02);
                craterMap += crater(vUv, vec2(0.25, 0.38), 0.04, 0.012);
                craterMap += crater(vUv, vec2(0.7, 0.63), 0.07, 0.02);
                craterMap += crater(vUv, vec2(0.52, 0.72), 0.04, 0.01);
                baseColor -= craterMap * 0.08;
                float mare = smoothstep(0.18, 0.0, length(vUv - vec2(0.4, 0.45)) - 0.12);
                mare += smoothstep(0.14, 0.0, length(vUv - vec2(0.6, 0.55)) - 0.08);
                baseColor -= mare * vec3(0.15, 0.16, 0.18);
                vec3 lightDir = normalize(sunDirection);
                vec3 viewDir = normalize(cameraPosition - vWorldPos);
                float lambert = max(dot(vWorldNormal, lightDir), 0.0);
                float softness = smoothstep(-0.2, 0.25, dot(vWorldNormal, lightDir));
                vec3 diffuse = baseColor * (lambert * 0.9 + 0.2);
                float rim = pow(1.0 - max(dot(vWorldNormal, viewDir), 0.0), 2.0);
                vec3 rimLight = vec3(0.3, 0.32, 0.36) * rim * 0.6;
                float nightside = 1.0 - clamp(dot(vWorldNormal, lightDir) * 0.5 + 0.5, 0.0, 1.0);
                float earthshine = nightside * (1.0 - illumination) * max(dot(vWorldNormal, viewDir), 0.0) * 0.3;
                vec3 color = diffuse + rimLight + earthshine;
                float phaseGlow = 0.5 + 0.5 * cos(phaseAngle);
                color += vec3(0.02 * phaseGlow);
                color = mix(color, color * vec3(0.8, 0.85, 0.9), 0.2);
                color = clamp(color, 0.05, 1.2);
                gl_FragColor = vec4(color, 1.0);
            }
        `
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.userData = {
        name: '月',
        nameEn: 'Moon',
        type: 'moon',
        info: '現在の月齢と輝面比はリアルタイムに更新されます。'
    };
    ctx.moonCore = moon;
    ctx.moonGroup.add(moon);
    ctx.clickableObjects.push(moon);

    const moonState = { current: null };

    const updateState = (state) => {
        if (!state) return;
        ctx.currentMoonState = state;
        ctx.moonGroup.position.copy(state.position);
        ctx.moonGroup.lookAt(0, 0, 0);
        ctx.moonUniforms.phaseAngle.value = state.phaseAngle;
        ctx.moonUniforms.illumination.value = state.illumination;
        ctx.moonUniforms.sunDirection.value.copy(state.sunDirection);
        if (ctx.moonCore) {
            const illuminationPct = Math.round(state.illumination * 100);
            ctx.moonCore.userData.magnitude = `月齢 ${state.moonAge.toFixed(1)}日`;
            ctx.moonCore.userData.info = `現在は${state.phaseName}（輝面比 約${illuminationPct}%）。高度 ${state.altDeg.toFixed(1)}° / 方位 ${state.azDeg.toFixed(1)}° 付近に位置しています。`;
        }
    };

    moonState.current = calculateMoonState(new Date());
    updateState(moonState.current);

    return {
        group: ctx.moonGroup,
        calculateState(date = new Date()) {
            moonState.current = calculateMoonState(date);
            return moonState.current;
        },
        updateVisuals(state) {
            moonState.current = state;
            updateState(state);
        },
        getCurrentState() {
            return moonState.current;
        },
        update(time) {
            if (ctx.moonUniforms) {
                ctx.moonUniforms.time.value = time;
            }
            if (ctx.moonCore) {
                ctx.moonCore.rotation.y = time * 0.02;
            }
        }
    };
}

function getMoonPhaseLabel(phase) {
    const normalized = (phase % 1 + 1) % 1;
    const phases = [
        { max: 0.0625, name: '新月', emoji: '🌑' },
        { max: 0.1875, name: '三日月', emoji: '🌒' },
        { max: 0.3125, name: '上弦', emoji: '🌓' },
        { max: 0.4375, name: '十三夜', emoji: '🌔' },
        { max: 0.5625, name: '満月', emoji: '🌕' },
        { max: 0.6875, name: '十八夜', emoji: '🌖' },
        { max: 0.8125, name: '下弦', emoji: '🌗' },
        { max: 0.9375, name: '晦日月', emoji: '🌘' }
    ];
    for (const p of phases) {
        if (normalized < p.max) return p;
    }
    return { name: '新月', emoji: '🌑' };
}

function calculateMoonState(date = new Date()) {
    const lunarCycle = 29.530588;
    const reference = new Date('2024-01-11T11:57:00Z');
    const diffDays = (date - reference) / (1000 * 60 * 60 * 24);
    const moonAge = ((diffDays % lunarCycle) + lunarCycle) % lunarCycle;
    const phase = moonAge / lunarCycle;
    const phaseAngle = phase * Math.PI * 2;
    const illumination = 0.5 * (1 - Math.cos(phaseAngle));
    const label = getMoonPhaseLabel(phase);
    const moonDistance = 2600;
    const baseAltitude = THREE.MathUtils.degToRad(28);
    const seasonal = THREE.MathUtils.degToRad(10) * Math.sin((date.getMonth() / 12) * Math.PI * 2 + date.getDate() * 0.2);
    const altitude = baseAltitude + THREE.MathUtils.degToRad(12) * Math.sin(phaseAngle + seasonal) + THREE.MathUtils.degToRad(5);
    const azimuth = THREE.MathUtils.degToRad(110) + phaseAngle * 0.85;
    const y = Math.max(150, moonDistance * Math.sin(altitude));
    const projected = moonDistance * Math.cos(altitude);
    // 天文学的規約: 北から東へ時計回り（上から見ると反時計回り）
    // Three.jsの座標系に合わせてXを反転
    const x = -projected * Math.sin(azimuth);
    const z = projected * Math.cos(azimuth);
    const position = new THREE.Vector3(x, y, z);
    const viewDir = position.clone().normalize();
    const earthDir = viewDir.clone().negate();
    const sunDirection = new THREE.Vector3().copy(viewDir).lerp(earthDir, illumination).normalize();
    return {
        phase,
        phaseAngle,
        illumination,
        moonAge,
        emoji: label.emoji,
        phaseName: label.name,
        position,
        sunDirection,
        altDeg: THREE.MathUtils.radToDeg(altitude),
        azDeg: THREE.MathUtils.radToDeg(azimuth)
    };
}

import * as THREE from '../three.module.js';
import { equatorialToHorizontalVector, normalizeDegrees } from '../utils/astronomy.js';

export function createMoonSystem(ctx) {
    ctx.moonGroup = new THREE.Group();
    ctx.scene.add(ctx.moonGroup);
    const moonRadius = 120;
    ctx.moonUniforms = {
        time: { value: 0 },
        phaseAngle: { value: 0 },
        illumination: { value: 0 },
        sunDirection: { value: new THREE.Vector3(0, 0.2, -1).normalize() },
        albedo: { value: new THREE.Color(0.93, 0.92, 0.89) }
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
                vec3 diffuse = baseColor * (lambert * 1.15 + 0.03);
                vec3 halfVec = normalize(lightDir + viewDir);
                float spec = pow(max(dot(vWorldNormal, halfVec), 0.0), 12.0);
                float rim = pow(1.0 - max(dot(vWorldNormal, viewDir), 0.0), 2.0);
                vec3 rimLight = vec3(0.34, 0.36, 0.4) * rim * 0.3;
                float nightside = 1.0 - clamp(dot(vWorldNormal, lightDir) * 0.5 + 0.5, 0.0, 1.0);
                float earthshine = nightside * (1.0 - illumination) * max(dot(vWorldNormal, viewDir), 0.0) * 0.08;
                vec3 color = diffuse + rimLight * lambert + earthshine + spec * vec3(0.5, 0.5, 0.52) * lambert;
                float phaseGlow = 0.5 + 0.5 * cos(phaseAngle);
                color += vec3(0.015 * phaseGlow * lambert);
                color = mix(color, color * vec3(0.8, 0.85, 0.9), 0.2);
                color = clamp(color, 0.01, 1.4);
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
    const getCurrentDate = () => (typeof ctx.getSimulatedDate === 'function' ? ctx.getSimulatedDate() : new Date());

    const updateState = (state) => {
        if (!state) return;
        ctx.currentMoonState = state;
        ctx.moonGroup.position.copy(state.position);
        ctx.moonGroup.lookAt(0, 0, 0);
        ctx.moonUniforms.phaseAngle.value = state.phaseAngle;
        ctx.moonUniforms.illumination.value = state.illumination;
        ctx.moonUniforms.sunDirection.value.copy(state.sunDirection);
        ctx.moonGroup.visible = state.altDeg > 0;
        if (ctx.moonCore) {
            const illuminationPct = Math.round(state.illumination * 100);
            ctx.moonCore.userData.magnitude = `月齢 ${state.moonAge.toFixed(1)}日`;
            ctx.moonCore.userData.info = `現在は${state.phaseName}（輝面比 約${illuminationPct}%）。高度 ${state.altDeg.toFixed(1)}° / 方位 ${state.azDeg.toFixed(1)}° 付近に位置しています。`;
        }
    };

    const ensureStateUpToDate = () => {
        const date = getCurrentDate();
        const timestamp = date.getTime();
        if (moonState.current && moonState.current.timestamp === timestamp) {
            return moonState.current;
        }
        const state = calculateMoonState(ctx, date);
        state.timestamp = timestamp;
        moonState.current = state;
        updateState(state);
        return state;
    };

    const initialDate = getCurrentDate();
    moonState.current = calculateMoonState(ctx, initialDate);
    moonState.current.timestamp = initialDate.getTime();
    updateState(moonState.current);

    return {
        group: ctx.moonGroup,
        calculateState(date = null) {
            const targetDate = date ?? getCurrentDate();
            const state = calculateMoonState(ctx, targetDate);
            state.timestamp = targetDate.getTime();
            moonState.current = state;
            return state;
        },
        updateVisuals(state) {
            moonState.current = state;
            updateState(state);
        },
        getCurrentState() {
            return ensureStateUpToDate();
        },
        syncWithContextTime() {
            return ensureStateUpToDate();
        },
        update(time) {
            if (ctx.moonUniforms) {
                ctx.moonUniforms.time.value = time;
            }
            if (ctx.moonCore) {
                ctx.moonCore.rotation.y = time * 0.02;
            }
            ensureStateUpToDate();
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

function calculateMoonState(ctx, date = new Date()) {
    const lunarCycle = 29.530588;
    const reference = new Date('2024-01-11T11:57:00Z');
    const diffDays = (date - reference) / (1000 * 60 * 60 * 24);
    const moonAge = ((diffDays % lunarCycle) + lunarCycle) % lunarCycle;
    const daysSinceJ2000 = (date - new Date('2000-01-01T12:00:00Z')) / (1000 * 60 * 60 * 24);
    const L0 = normalizeDegrees(280.46646 + 0.98564736 * daysSinceJ2000);
    const M_sun = normalizeDegrees(357.5291092 + 0.98560028 * daysSinceJ2000); // Sun mean anomaly
    const sunEquation = 1.914602 * Math.sin(THREE.MathUtils.degToRad(M_sun))
        + 0.019993 * Math.sin(THREE.MathUtils.degToRad(2 * M_sun))
        + 0.000289 * Math.sin(THREE.MathUtils.degToRad(3 * M_sun));
    const sunLon = normalizeDegrees(L0 + sunEquation);

    const L = normalizeDegrees(218.3164477 + 13.17639648 * daysSinceJ2000); // Mean longitude
    const D = normalizeDegrees(297.8501921 + 12.19074912 * daysSinceJ2000); // Mean elongation
    const M_moon = normalizeDegrees(134.9633964 + 13.06499295 * daysSinceJ2000); // Moon mean anomaly
    const F = normalizeDegrees(93.2720950 + 13.22935024 * daysSinceJ2000); // Latitude argument

    let lon = L
        + 6.289 * Math.sin(THREE.MathUtils.degToRad(M_moon))
        + 1.274 * Math.sin(THREE.MathUtils.degToRad(2 * D - M_moon))
        + 0.658 * Math.sin(THREE.MathUtils.degToRad(2 * D))
        + 0.214 * Math.sin(THREE.MathUtils.degToRad(2 * M_moon))
        - 0.186 * Math.sin(THREE.MathUtils.degToRad(M_sun))
        - 0.059 * Math.sin(THREE.MathUtils.degToRad(2 * D - 2 * M_moon))
        - 0.057 * Math.sin(THREE.MathUtils.degToRad(2 * D - M_sun - M_moon))
        + 0.053 * Math.sin(THREE.MathUtils.degToRad(2 * D + M_moon))
        + 0.046 * Math.sin(THREE.MathUtils.degToRad(2 * D - M_sun))
        + 0.041 * Math.sin(THREE.MathUtils.degToRad(M_sun - M_moon));

    let lat = 5.128 * Math.sin(THREE.MathUtils.degToRad(F))
        + 0.280 * Math.sin(THREE.MathUtils.degToRad(M_moon + F))
        + 0.277 * Math.sin(THREE.MathUtils.degToRad(M_moon - F))
        + 0.173 * Math.sin(THREE.MathUtils.degToRad(2 * D - F));

    lon = normalizeDegrees(lon);
    const obliquity = 23.439291 - 0.0000137 * daysSinceJ2000;
    const lonRad = THREE.MathUtils.degToRad(lon);
    const latRad = THREE.MathUtils.degToRad(lat);
    const obRad = THREE.MathUtils.degToRad(obliquity);

    const sinLon = Math.sin(lonRad);
    const cosLon = Math.cos(lonRad);
    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);

    const x = cosLon * cosLat;
    const y = sinLon * cosLat;
    const z = sinLat;

    const xEq = x;
    const yEq = y * Math.cos(obRad) - z * Math.sin(obRad);
    const zEq = y * Math.sin(obRad) + z * Math.cos(obRad);

    let raRad = Math.atan2(yEq, xEq);
    if (raRad < 0) raRad += Math.PI * 2;
    const decRad = Math.asin(zEq);
    const raDeg = THREE.MathUtils.radToDeg(raRad);
    const decDeg = THREE.MathUtils.radToDeg(decRad);

    const sunRaDec = convertEclipticToEquatorial(sunLon, 0, obliquity);
    const sunHorizontal = convertEquatorialToHorizontal(ctx, sunRaDec.ra, sunRaDec.dec, 1);
    const sunVector = sunHorizontal?.position ?? new THREE.Vector3(1, 0, 0);

    const moonDistance = 2600;
    const { position, altDeg, azDeg } = convertEquatorialToHorizontal(ctx, raDeg, decDeg, moonDistance);

    const phaseDifference = normalizeDegrees(lon - sunLon);
    const phaseAngle = THREE.MathUtils.degToRad(phaseDifference);
    const illumination = 0.5 * (1 - Math.cos(phaseAngle));
    const phase = phaseDifference / 360;
    const label = getMoonPhaseLabel(phase);

    const sunDirection = sunVector.clone().normalize();

    return {
        phase,
        phaseAngle,
        illumination,
        moonAge,
        emoji: label.emoji,
        phaseName: label.name,
        position,
        sunDirection,
        altDeg,
        azDeg,
        raDeg,
        decDeg
    };
}

function convertEclipticToEquatorial(lonDeg, latDeg, obliquityDeg) {
    const lonRad = THREE.MathUtils.degToRad(lonDeg);
    const latRad = THREE.MathUtils.degToRad(latDeg);
    const obRad = THREE.MathUtils.degToRad(obliquityDeg);

    const sinDec = Math.sin(latRad) * Math.cos(obRad) + Math.cos(latRad) * Math.sin(obRad) * Math.sin(lonRad);
    const dec = Math.asin(Math.min(1, Math.max(-1, sinDec)));

    const y = Math.sin(lonRad) * Math.cos(obRad) - Math.tan(latRad) * Math.sin(obRad);
    const x = Math.cos(lonRad);
    const ra = Math.atan2(y, x);

    const raDeg = normalizeDegrees(THREE.MathUtils.radToDeg(ra));
    const decDeg = THREE.MathUtils.radToDeg(dec);
    return { ra: raDeg, dec: decDeg };
}

function convertEquatorialToHorizontal(ctx, raDeg, decDeg, radius) {
    const result = equatorialToHorizontalVector(
        raDeg,
        decDeg,
        ctx.localSiderealTime ?? 0,
        ctx.observer?.lat ?? 0,
        radius
    );
    if (!result) {
        return {
            position: new THREE.Vector3(0, -radius, 0),
            altDeg: -90,
            azDeg: 0
        };
    }
    return {
        position: result.vector,
        altDeg: result.altDeg,
        azDeg: result.azDeg
    };
}

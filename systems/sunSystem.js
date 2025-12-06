import * as THREE from '../three.module.js';
import { equatorialToHorizontalVector, normalizeDegrees } from '../utils/astronomy.js';

export function createSunSystem(ctx) {
    ctx.sunGroup = new THREE.Group();
    ctx.scene.add(ctx.sunGroup);

    const coreRadius = 140;
    const glowRadius = 200;

    const sunGeometry = new THREE.SphereGeometry(coreRadius, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.0, 0.93, 0.76)
    });
    const sunCore = new THREE.Mesh(sunGeometry, sunMaterial);
    sunCore.userData = {
        name: '太陽',
        nameEn: 'Sun',
        type: 'sun',
        info: '現在の太陽高度と方位を表示します。'
    };
    ctx.sunGroup.add(sunCore);
    ctx.clickableObjects.push(sunCore);

    const glowGeometry = new THREE.SphereGeometry(glowRadius, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.0, 0.78, 0.42),
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    ctx.sunGroup.add(sunGlow);

    const sunState = { current: null };
    const getDate = () => (typeof ctx.getSimulatedDate === 'function' ? ctx.getSimulatedDate() : new Date());

    const updateState = (state) => {
        if (!state) return;
        ctx.sunGroup.position.copy(state.position);
        ctx.sunGroup.lookAt(0, 0, 0);
        const visible = (ctx.settings?.showSun ?? false) && state.altDeg > -5;
        ctx.sunGroup.visible = visible;
        sunCore.userData.magnitude = `高度 ${state.altDeg.toFixed(1)}°`;
        sunCore.userData.info = `方位 ${state.azDeg.toFixed(1)}° / 赤経 ${state.raDeg.toFixed(1)}° / 赤緯 ${state.decDeg.toFixed(1)}°`;
    };

    const ensureState = () => {
        const date = getDate();
        const timestamp = date.getTime();
        if (sunState.current && sunState.current.timestamp === timestamp) {
            return sunState.current;
        }
        const state = calculateSunState(ctx, date);
        state.timestamp = timestamp;
        sunState.current = state;
        updateState(state);
        return state;
    };

    ensureState();

    return {
        group: ctx.sunGroup,
        getCurrentState: () => ensureState(),
        setEnabled: (enabled) => {
            ctx.settings.showSun = enabled;
            const state = ensureState();
            ctx.sunGroup.visible = enabled && state.altDeg > -5;
        },
        update: () => {
            ensureState();
        }
    };
}

function calculateSunState(ctx, date = new Date()) {
    const daysSinceJ2000 = (date - new Date('2000-01-01T12:00:00Z')) / (1000 * 60 * 60 * 24);
    const meanLongitude = normalizeDegrees(280.46646 + 0.98564736 * daysSinceJ2000);
    const meanAnomaly = normalizeDegrees(357.5291092 + 0.98560028 * daysSinceJ2000);
    const equationOfCenter = 1.914602 * Math.sin(THREE.MathUtils.degToRad(meanAnomaly))
        + 0.019993 * Math.sin(THREE.MathUtils.degToRad(2 * meanAnomaly))
        + 0.000289 * Math.sin(THREE.MathUtils.degToRad(3 * meanAnomaly));
    const eclipticLongitude = normalizeDegrees(meanLongitude + equationOfCenter);
    const obliquity = 23.439291 - 0.0000137 * daysSinceJ2000;

    const { raDeg, decDeg } = convertEclipticToEquatorial(eclipticLongitude, 0, obliquity);
    const radius = 2400;
    const { position, altDeg, azDeg } = convertEquatorialToHorizontal(ctx, raDeg, decDeg, radius);

    return {
        position,
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
    return { raDeg, decDeg };
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

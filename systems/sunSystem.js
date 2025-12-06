import * as THREE from '../three.module.js';
import { equatorialToHorizontalVector, normalizeDegrees } from '../utils/astronomy.js';

export function createSunSystem(ctx) {
    ctx.sunGroup = new THREE.Group();
    ctx.scene.add(ctx.sunGroup);

    // 太陽光（平行光源）を追加
    // 大気がないので、非常に鋭く明るい光
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.0);
    ctx.scene.add(sunLight);

    const coreRadius = 140;
    const glowRadius = 220;

    const sunTexture = createSunTexture();

    const sunGeometry = new THREE.SphereGeometry(coreRadius, 64, 64);
    // 大気がないため、太陽は純白に輝く
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.0, 1.0, 1.0),
        map: sunTexture,
        transparent: true
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

    const coronaTexture = createCoronaTexture();

    const glowGeometry = new THREE.SphereGeometry(glowRadius, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.0, 1.0, 1.0),
        transparent: true,
        opacity: 0.05, // 大気散乱がないので控えめに
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    ctx.sunGroup.add(sunGlow);

    const coronaSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: coronaTexture,
        color: new THREE.Color(1.0, 1.0, 1.0),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    }));
    coronaSprite.scale.set(glowRadius * 1.8, glowRadius * 1.8, 1);
    ctx.sunGroup.add(coronaSprite);

    const sunState = { current: null };
    const getDate = () => (typeof ctx.getSimulatedDate === 'function' ? ctx.getSimulatedDate() : new Date());

    const updateState = (state) => {
        if (!state) return;
        ctx.sunGroup.position.copy(state.position);
        ctx.sunGroup.lookAt(0, 0, 0);
        
        // 光源の位置を更新
        sunLight.position.copy(state.position);
        
        const visible = (ctx.settings?.showSun ?? false) && state.altDeg > -5;
        ctx.sunGroup.visible = visible;
        sunLight.visible = visible;

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
            const visible = enabled && state.altDeg > -5;
            ctx.sunGroup.visible = visible;
            sunLight.visible = visible;
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

function createSunTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx2d = canvas.getContext('2d');
    const center = size / 2;

    const coreGradient = ctx2d.createRadialGradient(center, center, size * 0.06, center, center, size * 0.48);
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    coreGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.98)');
    coreGradient.addColorStop(0.82, 'rgba(255, 255, 255, 0.9)');
    coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');

    ctx2d.fillStyle = coreGradient;
    ctx2d.fillRect(0, 0, size, size);

    ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx2d.lineWidth = size * 0.02;
    ctx2d.beginPath();
    ctx2d.arc(center, center, size * 0.48, 0, Math.PI * 2);
    ctx2d.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createCoronaTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx2d = canvas.getContext('2d');
    const center = size / 2;
    const coronaGradient = ctx2d.createRadialGradient(center, center, size * 0.12, center, center, size * 0.48);
    coronaGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    coronaGradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.1)');
    coronaGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx2d.fillStyle = coronaGradient;
    ctx2d.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

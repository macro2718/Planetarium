import * as THREE from 'three';

export function calculateLocalSiderealTime(date, longitudeDeg) {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const T = (jd - 2451545.0) / 36525;
    let gmst = 280.46061837
        + 360.98564736629 * (jd - 2451545.0)
        + 0.000387933 * T * T
        - T * T * T / 38710000;
    gmst = normalizeDegrees(gmst);
    const lst = gmst + longitudeDeg;
    return normalizeDegrees(lst);
}

export function equatorialToHorizontal(raDeg, decDeg, lstDeg, latitudeDeg) {
    if (![raDeg, decDeg, lstDeg, latitudeDeg].every(v => typeof v === 'number')) {
        return null;
    }
    const hourAngle = degToRad(normalizeDegrees(lstDeg - raDeg));
    const dec = degToRad(decDeg);
    const lat = degToRad(latitudeDeg);

    const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(hourAngle);
    const altRad = Math.asin(clamp(sinAlt, -1, 1));
    const cosAlt = Math.cos(altRad);

    const sinAz = -Math.sin(hourAngle) * Math.cos(dec) / Math.max(cosAlt, 1e-12);
    const cosAz = (Math.sin(dec) - Math.sin(altRad) * Math.sin(lat)) / Math.max(Math.cos(lat) * cosAlt, 1e-12);
    let azRad = Math.atan2(sinAz, cosAz);
    if (azRad < 0) azRad += Math.PI * 2;

    return {
        altRad,
        azRad,
        altDeg: radToDeg(altRad),
        azDeg: radToDeg(azRad)
    };
}

export function equatorialToHorizontalVector(raDeg, decDeg, lstDeg, latitudeDeg, radius = 1, target = null) {
    const result = equatorialToHorizontal(raDeg, decDeg, lstDeg, latitudeDeg);
    if (!result) return null;
    const { altRad, azRad } = result;
    const y = Math.sin(altRad) * radius;
    const projected = Math.cos(altRad) * radius;
    const x = -projected * Math.sin(azRad);
    const z = projected * Math.cos(azRad);
    const vector = target ?? new THREE.Vector3();
    vector.set(x, y, z);
    return { ...result, vector };
}

export function degToRad(deg) {
    return deg * Math.PI / 180;
}

export function radToDeg(rad) {
    return rad * 180 / Math.PI;
}

export function normalizeDegrees(value) {
    return ((value % 360) + 360) % 360;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

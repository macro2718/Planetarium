import * as THREE from '../three.module.js';

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

export function equatorialToHorizontal(raDeg, decDeg, lstDeg, latitudeDeg, target = null) {
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

    const result = target ?? {};
    result.altRad = altRad;
    result.azRad = azRad;
    result.altDeg = radToDeg(altRad);
    result.azDeg = radToDeg(azRad);
    return result;
}

export function equatorialToHorizontalVector(
    raDeg,
    decDeg,
    lstDeg,
    latitudeDeg,
    radius = 1,
    target = null,
    resultTarget = null
) {
    const result = equatorialToHorizontal(raDeg, decDeg, lstDeg, latitudeDeg, resultTarget);
    if (!result) return null;
    const { altRad, azRad } = result;
    const y = Math.sin(altRad) * radius;
    const projected = Math.cos(altRad) * radius;
    const x = -projected * Math.sin(azRad);
    const z = projected * Math.cos(azRad);
    const vector = target ?? new THREE.Vector3();
    vector.set(x, y, z);
    result.vector = vector;
    return result;
}

/**
 * Precomputes a fixed equatorial direction in the scene's axis convention:
 * X = RA 0h, Y = north celestial pole, Z = RA 6h.
 */
export function equatorialToSceneVector(raDeg, decDeg, target = null) {
    if (![raDeg, decDeg].every(Number.isFinite)) return null;
    const ra = degToRad(raDeg);
    const dec = degToRad(decDeg);
    const cosDec = Math.cos(dec);
    const vector = target ?? new THREE.Vector3();
    return vector.set(
        cosDec * Math.cos(ra),
        Math.sin(dec),
        cosDec * Math.sin(ra)
    );
}

/**
 * Updates a reusable matrix that maps scene equatorial directions to the
 * horizontal coordinate system. Applying it avoids recalculating altitude and
 * azimuth only to convert them back into a Cartesian render position.
 */
export function setEquatorialToHorizontalMatrix(target, lstDeg, latitudeDeg) {
    if (!target?.set || ![lstDeg, latitudeDeg].every(Number.isFinite)) return null;
    const lst = degToRad(lstDeg);
    const latitude = degToRad(latitudeDeg);
    const sinLst = Math.sin(lst);
    const cosLst = Math.cos(lst);
    const sinLat = Math.sin(latitude);
    const cosLat = Math.cos(latitude);
    return target.set(
        sinLst, 0, -cosLst,
        cosLat * cosLst, sinLat, cosLat * sinLst,
        -sinLat * cosLst, cosLat, -sinLat * sinLst
    );
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

export function angularDifferenceDegrees(a, b) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
    return Math.abs(((a - b + 540) % 360) - 180);
}

export function normalizeRadians(value) {
    const fullTurn = Math.PI * 2;
    return ((value % fullTurn) + fullTurn) % fullTurn;
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function julianDay(date) {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) return Number.NaN;
    return value.getTime() / 86400000 + 2440587.5;
}

export function evalPolynomial(coefficients, value) {
    let result = 0;
    let power = 1;
    for (const coefficient of coefficients) {
        result += coefficient * power;
        power *= value;
    }
    return result;
}

export function meanObliquityRad(julianCenturies) {
    // Laskar series, valid for +/- 10,000 years (Meeus 2nd ed., Chap. 22)
    const u = julianCenturies / 100;
    const u2 = u * u;
    const u3 = u2 * u;
    const u4 = u3 * u;
    const u5 = u4 * u;
    const u6 = u5 * u;
    const u7 = u6 * u;
    const u8 = u7 * u;
    const u9 = u8 * u;
    const u10 = u9 * u;
    const arcsec = 84381.448
        - 4680.93 * u
        - 1.55 * u2
        + 1999.25 * u3
        - 51.38 * u4
        - 249.67 * u5
        - 39.05 * u6
        + 7.12 * u7
        + 27.87 * u8
        + 5.79 * u9
        + 2.45 * u10;
    return degToRad(arcsec / 3600);
}

export function solveKeplerElliptic(meanAnomalyRad, eccentricity, maxIterations = 20) {
    let eccentricAnomaly = meanAnomalyRad;
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
        const residual = eccentricAnomaly
            - eccentricity * Math.sin(eccentricAnomaly)
            - meanAnomalyRad;
        const derivative = 1 - eccentricity * Math.cos(eccentricAnomaly);
        const delta = residual / derivative;
        eccentricAnomaly -= delta;
        if (Math.abs(delta) < 1e-12) break;
    }
    return eccentricAnomaly;
}

export function eclipticVectorToEquatorial(vector, obliquityRad, target = null) {
    const result = target ?? new THREE.Vector3();
    const cosObliquity = Math.cos(obliquityRad);
    const sinObliquity = Math.sin(obliquityRad);
    result.set(
        vector.x,
        vector.y * cosObliquity - vector.z * sinObliquity,
        vector.y * sinObliquity + vector.z * cosObliquity
    );
    return result;
}

export function eclipticToEquatorial(lonDeg, latDeg = 0, obliquityDeg = 23.439291) {
    const longitude = degToRad(lonDeg);
    const latitude = degToRad(latDeg);
    const obliquity = degToRad(obliquityDeg);
    const cosLatitude = Math.cos(latitude);
    const x = Math.cos(longitude) * cosLatitude;
    const eclipticY = Math.sin(longitude) * cosLatitude;
    const eclipticZ = Math.sin(latitude);
    const y = eclipticY * Math.cos(obliquity) - eclipticZ * Math.sin(obliquity);
    const z = eclipticY * Math.sin(obliquity) + eclipticZ * Math.cos(obliquity);
    const length = Math.hypot(x, y, z) || 1;
    return {
        raDeg: normalizeDegrees(radToDeg(Math.atan2(y, x))),
        decDeg: radToDeg(Math.asin(clamp(z / length, -1, 1)))
    };
}

export function precessEquatorialJ2000ToDate(raDeg, decDeg, date) {
    if (![raDeg, decDeg].every(v => typeof v === 'number')) return null;
    const epochDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    const jd = epochDate.getTime() / 86400000 + 2440587.5;
    const t = (jd - 2451545.0) / 36525;

    // Laskar's long-term precession formula (IAU 1976 with extended terms)
    // Valid to a few arcseconds over several millennia (Meeus 2nd ed., Chap. 21)
    const t2 = t * t;
    const t3 = t2 * t;
    const t4 = t3 * t;
    const t5 = t4 * t;

    const zetaArcsec = 2306.083227 * t + 0.2988499 * t2 + 0.01801828 * t3 - 0.000005971 * t4 - 0.0000003173 * t5;
    const zArcsec = 2306.083227 * t + 1.0927348 * t2 + 0.01826837 * t3 - 0.000028596 * t4 - 0.0000002904 * t5;
    const thetaArcsec = 2004.191903 * t - 0.4294934 * t2 - 0.04182264 * t3 - 0.000007089 * t4 - 0.0000001274 * t5;

    const zeta = degToRad(zetaArcsec / 3600);
    const z = degToRad(zArcsec / 3600);
    const theta = degToRad(thetaArcsec / 3600);

    const ra = degToRad(raDeg);
    const dec = degToRad(decDeg);

    const A = Math.cos(dec) * Math.sin(ra + zeta);
    const B = Math.cos(theta) * Math.cos(dec) * Math.cos(ra + zeta) - Math.sin(theta) * Math.sin(dec);
    const C = Math.sin(theta) * Math.cos(dec) * Math.cos(ra + zeta) + Math.cos(theta) * Math.sin(dec);

    const newRa = normalizeDegrees(radToDeg(Math.atan2(A, B) + z));
    const newDec = radToDeg(Math.asin(clamp(C, -1, 1)));

    return { ra: newRa, dec: newDec };
}

import * as THREE from '../three.module.js';
import {
    clamp,
    degToRad,
    eclipticVectorToEquatorial,
    equatorialToHorizontalVector,
    evalPolynomial,
    julianDay,
    meanObliquityRad,
    normalizeDegrees,
    normalizeRadians,
    radToDeg,
    solveKeplerElliptic
} from './astronomy.js';

const GAUSSIAN_GRAVITATIONAL_CONSTANT = 0.01720209895; // rad/day
const DISTANCE_SCALE = 2400;

const HALLEY_ELEMENTS = {
    perihelionJD: 2446470.9592, // 1986-02-09 11:01 UTC
    e: 0.967142908,
    q: 0.586, // perihelion distance (AU)
    i: 162.26269,
    argPeri: 111.33249,
    longNode: 58.42008
};

// Earth long-term elements (matches planetEphemeris.js)
const EARTH_ELEMENTS = {
    a: [1.00000261, 0.00000562],
    e: [0.01671123, -0.00004392, -0.000000126],
    i: [-0.00001531, -0.01294668, 0.000000007],
    L: [100.46457166, 35999.37244981, 0.00000568],
    longPeri: [102.93768193, 0.32327364, 0.00000002],
    longNode: [0, 0]
};

export function calculateHalleyState(date = new Date(), observer = { lat: 0, lon: 0 }, lstDeg = 0) {
    const jd = julianDay(date);
    const T = (jd - 2451545.0) / 36525;
    const obliquityRad = meanObliquityRad(T);
    const earthHelio = earthHeliocentricEcliptic(T);
    const halleyHelio = halleyHeliocentricEcliptic(jd);
    if (!earthHelio || !halleyHelio) return null;

    const geoEcl = new THREE.Vector3(
        halleyHelio.x - earthHelio.x,
        halleyHelio.y - earthHelio.y,
        halleyHelio.z - earthHelio.z
    );
    const distanceAu = geoEcl.length();
    const geoEq = eclipticVectorToEquatorial(geoEcl, obliquityRad);
    const rEq = geoEq.length();
    const ra = Math.atan2(geoEq.y, geoEq.x);
    const dec = Math.asin(clamp(rEq ? geoEq.z / rEq : 0, -1, 1));
    const raDeg = normalizeDegrees(radToDeg(ra));
    const decDeg = radToDeg(dec);
    const horiz = equatorialToHorizontalVector(
        raDeg,
        decDeg,
        lstDeg,
        observer?.lat ?? 0,
        DISTANCE_SCALE
    );

    const sunEq = eclipticVectorToEquatorial(
        new THREE.Vector3(-earthHelio.x, -earthHelio.y, -earthHelio.z),
        obliquityRad
    );
    const sunRa = Math.atan2(sunEq.y, sunEq.x);
    const sunDec = Math.asin(clamp(sunEq.length() ? sunEq.z / sunEq.length() : 0, -1, 1));
    const sunHoriz = equatorialToHorizontalVector(
        normalizeDegrees(radToDeg(sunRa)),
        radToDeg(sunDec),
        lstDeg,
        observer?.lat ?? 0,
        DISTANCE_SCALE
    );

    return {
        position: horiz?.vector ?? new THREE.Vector3(0, -DISTANCE_SCALE, 0),
        altDeg: horiz?.altDeg ?? -90,
        azDeg: horiz?.azDeg ?? 0,
        raDeg,
        decDeg,
        distanceAu,
        heliocentricDistanceAu: halleyHelio.r,
        sunVector: sunHoriz?.vector ?? new THREE.Vector3(1, 0, 0)
    };
}

function halleyHeliocentricEcliptic(jd) {
    const { e, q } = HALLEY_ELEMENTS;
    const a = q / (1 - e);
    const meanMotion = GAUSSIAN_GRAVITATIONAL_CONSTANT / Math.pow(a, 1.5); // rad/day
    const M = normalizeRadians(meanMotion * (jd - HALLEY_ELEMENTS.perihelionJD));
    const E = solveKeplerElliptic(M, e);
    const nu = 2 * Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
    );
    const r = a * (1 - e * Math.cos(E));

    const i = degToRad(HALLEY_ELEMENTS.i);
    const omega = degToRad(HALLEY_ELEMENTS.argPeri);
    const longNode = degToRad(HALLEY_ELEMENTS.longNode);

    const cosNuOmega = Math.cos(nu + omega);
    const sinNuOmega = Math.sin(nu + omega);
    const cosNode = Math.cos(longNode);
    const sinNode = Math.sin(longNode);
    const cosI = Math.cos(i);
    const sinI = Math.sin(i);

    const x = r * (cosNode * cosNuOmega - sinNode * sinNuOmega * cosI);
    const y = r * (sinNode * cosNuOmega + cosNode * sinNuOmega * cosI);
    const z = r * (sinNuOmega * sinI);
    return { x, y, z, r };
}

function earthHeliocentricEcliptic(T) {
    const a = evalPolynomial(EARTH_ELEMENTS.a, T);
    const e = evalPolynomial(EARTH_ELEMENTS.e, T);
    const i = degToRad(evalPolynomial(EARTH_ELEMENTS.i, T));
    const L = degToRad(normalizeDegrees(evalPolynomial(EARTH_ELEMENTS.L, T)));
    const longPeri = degToRad(normalizeDegrees(evalPolynomial(EARTH_ELEMENTS.longPeri, T)));
    const longNode = degToRad(normalizeDegrees(evalPolynomial(EARTH_ELEMENTS.longNode, T)));

    const M = normalizeDegrees(radToDeg(L - longPeri));
    const MRad = degToRad(M);
    const E = solveKeplerElliptic(MRad, e);
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const r = a * (1 - e * Math.cos(E));
    const omega = longPeri - longNode;

    const cosNuOmega = Math.cos(nu + omega);
    const sinNuOmega = Math.sin(nu + omega);
    const cosNode = Math.cos(longNode);
    const sinNode = Math.sin(longNode);
    const cosI = Math.cos(i);
    const sinI = Math.sin(i);

    const x = r * (cosNode * cosNuOmega - sinNode * sinNuOmega * cosI);
    const y = r * (sinNode * cosNuOmega + cosNode * sinNuOmega * cosI);
    const z = r * (sinNuOmega * sinI);
    return { x, y, z, r };
}

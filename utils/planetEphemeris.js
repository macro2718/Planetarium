import * as THREE from '../three.module.js';
import { degToRad, normalizeDegrees, radToDeg, equatorialToHorizontalVector } from './astronomy.js';

/**
 * Long-term heliocentric orbital elements derived from VSOP87/IMCCE tables
 * (J2000 epoch, T in Julian centuries). Good to a few arcseconds across
 * several millennia, keeping planetary positions stable even when time is
 * advanced by hundreds or thousands of years.
 */
const PLANET_ELEMENTS = {
    mercury: {
        a: [0.38709927, 0.00000037],
        e: [0.20563593, 0.00001906, -0.0000000003],
        i: [7.00497902, -0.00594749, 0.000000007],
        L: [252.25032350, 149472.67411175],
        longPeri: [77.45779628, 0.16047689],
        longNode: [48.33076593, -0.12534081]
    },
    venus: {
        a: [0.72333566, 0.00000390],
        e: [0.00677672, -0.00004107, 0.00000000062],
        i: [3.39467605, -0.00078890, -0.000000004],
        L: [181.97909950, 58517.81538729],
        longPeri: [131.60246718, 0.00268329],
        longNode: [76.67984255, -0.27769418]
    },
    earth: {
        a: [1.00000261, 0.00000562],
        e: [0.01671123, -0.00004392, -0.000000126],
        i: [-0.00001531, -0.01294668, 0.000000007],
        L: [100.46457166, 35999.37244981, 0.00000568],
        longPeri: [102.93768193, 0.32327364, 0.00000002],
        longNode: [0, 0]
    },
    mars: {
        a: [1.52371034, 0.00001847],
        e: [0.09339410, 0.00007882, -0.0000000002],
        i: [1.84969142, -0.00813131, -0.000000037],
        L: [-4.55343205, 19140.30268499, 0.00031090],
        longPeri: [-23.94362959, 0.44441088, -0.000000007],
        longNode: [49.55953891, -0.29257343, -0.000000000],
    },
    jupiter: {
        a: [5.20288700, -0.00011607],
        e: [0.04838624, -0.00013253, 0.000000477],
        i: [1.30439695, -0.00183714, -0.000000055],
        L: [34.39644051, 3034.74612775],
        longPeri: [14.72847983, 0.21252668],
        longNode: [100.47390909, 0.20469106]
    },
    saturn: {
        a: [9.53667594, -0.00125060],
        e: [0.05386179, -0.00050991, 0.000000048],
        i: [2.48599187, 0.00193609, -0.000000004],
        L: [49.95424423, 1222.49362201],
        longPeri: [92.59887831, -0.41897216, -0.000000005],
        longNode: [113.66242448, -0.28867794, -0.000000000]
    },
    uranus: {
        a: [19.18916464, -0.00196176, 0.000000007],
        e: [0.04725744, -0.00004397, 0.0000000006],
        i: [0.77263783, -0.00242939, -0.000000095],
        L: [313.23810451, 428.48202785],
        longPeri: [170.95427630, 0.40805281],
        longNode: [74.01692503, 0.04240589, -0.000000004]
    },
    neptune: {
        a: [30.06992276, 0.00026291],
        e: [0.00859048, 0.00005105, -0.000000637],
        i: [1.77004347, 0.00035372, -0.000000003],
        L: [-55.12002969, 218.45945325],
        longPeri: [44.96476227, -0.32241464, -0.000000183],
        longNode: [131.78422574, -0.00508664, -0.000000000]
    }
};

export const PLANET_DEFINITIONS = [
    { id: 'mercury', name: '水星', nameEn: 'Mercury', color: 0xbfa980, radius: 16 },
    { id: 'venus', name: '金星', nameEn: 'Venus', color: 0xe0c7a7, radius: 20 },
    { id: 'mars', name: '火星', nameEn: 'Mars', color: 0xc45d4a, radius: 18 },
    { id: 'jupiter', name: '木星', nameEn: 'Jupiter', color: 0xd0b8a0, radius: 36 },
    { id: 'saturn', name: '土星', nameEn: 'Saturn', color: 0xdac9a6, radius: 32 },
    { id: 'uranus', name: '天王星', nameEn: 'Uranus', color: 0xa8d6e5, radius: 28 },
    { id: 'neptune', name: '海王星', nameEn: 'Neptune', color: 0x6d8bd3, radius: 28 }
];

const PLANET_DISTANCE_SCALE = 2400;
const LOG10 = Math.log(10);

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function evalPoly(coeffs, t) {
    let sum = 0;
    let pow = 1;
    for (let i = 0; i < coeffs.length; i++) {
        sum += coeffs[i] * pow;
        pow *= t;
    }
    return sum;
}

function julianDay(date) {
    const t = Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        date.getUTCMilliseconds()
    );
    return t / 86400000 + 2440587.5;
}

function meanObliquityRad(T) {
    // Laskar series, valid for +/- 10,000 years (Meeus 2nd ed., Chap. 22)
    const u = T / 100;
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

function solveKepler(meanAnomalyRad, eccentricity) {
    let E = meanAnomalyRad;
    for (let i = 0; i < 8; i++) {
        const delta = (E - eccentricity * Math.sin(E) - meanAnomalyRad) / (1 - eccentricity * Math.cos(E));
        E -= delta;
        if (Math.abs(delta) < 1e-12) break;
    }
    return E;
}

function heliocentricEcliptic(bodyId, T) {
    const elements = PLANET_ELEMENTS[bodyId];
    if (!elements) return null;
    const a = evalPoly(elements.a, T);
    const e = evalPoly(elements.e, T);
    const i = degToRad(evalPoly(elements.i, T));
    const L = degToRad(normalizeDegrees(evalPoly(elements.L, T)));
    const longPeri = degToRad(normalizeDegrees(evalPoly(elements.longPeri, T)));
    const longNode = degToRad(normalizeDegrees(evalPoly(elements.longNode, T)));

    const M = normalizeDegrees(radToDeg(L - longPeri));
    const MRad = degToRad(M);
    const E = solveKepler(MRad, e);
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const r = a * (1 - e * Math.cos(E));
    const omega = longPeri - longNode; // argument of perihelion

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

function eclipticToEquatorial(vec, obliquityRad) {
    const cosOb = Math.cos(obliquityRad);
    const sinOb = Math.sin(obliquityRad);
    const x = vec.x;
    const y = vec.y * cosOb - vec.z * sinOb;
    const z = vec.y * sinOb + vec.z * cosOb;
    return new THREE.Vector3(x, y, z);
}

function computeSunDirection(obliquityRad, earthHelio, lstDeg, observer) {
    // Direction from observer to Sun (opposite of Earth's heliocentric vector)
    const sunEcl = new THREE.Vector3(-earthHelio.x, -earthHelio.y, -earthHelio.z);
    const sunEq = eclipticToEquatorial(sunEcl, obliquityRad);
    const ra = Math.atan2(sunEq.y, sunEq.x);
    const dec = Math.asin(clamp(sunEq.z / sunEq.length(), -1, 1));
    return equatorialToHorizontalVector(
        radToDeg(ra),
        radToDeg(dec),
        lstDeg,
        observer?.lat ?? 0,
        1
    )?.vector.normalize();
}

function calculatePhase(planetHelio, earthHelio, distanceAu) {
    const r = planetHelio.r;
    const R = Math.sqrt(earthHelio.x ** 2 + earthHelio.y ** 2 + earthHelio.z ** 2);
    const numerator = r * r + distanceAu * distanceAu - R * R;
    const denom = 2 * r * distanceAu;
    const cosPhase = clamp(numerator / denom, -1, 1);
    const phaseAngle = Math.acos(cosPhase);
    const illumination = 0.5 * (1 + Math.cos(phaseAngle));
    return { phaseAngle, illumination };
}

function calculateApparentMagnitude(id, heliocentricDistanceAu, geocentricDistanceAu, phaseAngleRad) {
    const alpha = radToDeg(phaseAngleRad);
    const logTerm = 5 * Math.log(heliocentricDistanceAu * geocentricDistanceAu) / LOG10;

    switch (id) {
        case 'mercury':
            return -0.613 + logTerm + 0.0380 * alpha - 0.000273 * alpha * alpha + 0.000002 * alpha * alpha * alpha;
        case 'venus':
            return -4.384 + logTerm + 0.01322 * alpha + 0.0000004247 * alpha * alpha * alpha;
        case 'mars':
            return -1.52 + logTerm + 0.016 * alpha;
        case 'jupiter':
            return -9.395 + logTerm + 0.005 * alpha;
        case 'saturn':
            return -8.88 + logTerm + 0.044 * alpha; // ring aspect omitted for simplicity
        case 'uranus':
            return -7.19 + logTerm;
        case 'neptune':
            return -6.87 + logTerm;
        default:
            return 0;
    }
}

export function calculatePlanetaryStates(date = new Date(), observer = { lat: 0, lon: 0 }, lstDeg = 0) {
    const jd = julianDay(date);
    const T = (jd - 2451545.0) / 36525;
    const obliquityRad = meanObliquityRad(T);
    const earthHelio = heliocentricEcliptic('earth', T);
    const sunDirection = computeSunDirection(obliquityRad, earthHelio, lstDeg, observer) ?? new THREE.Vector3(1, 0, 0);

    const states = {};
    for (const planet of PLANET_DEFINITIONS) {
        const helio = heliocentricEcliptic(planet.id, T);
        if (!helio) continue;
        const geoEcl = new THREE.Vector3(
            helio.x - earthHelio.x,
            helio.y - earthHelio.y,
            helio.z - earthHelio.z
        );
        const distanceAu = geoEcl.length();
        const geoEq = eclipticToEquatorial(geoEcl, obliquityRad);
        const rEq = geoEq.length();
        const ra = Math.atan2(geoEq.y, geoEq.x);
        const dec = Math.asin(clamp(geoEq.z / rEq, -1, 1));
        const raDeg = normalizeDegrees(radToDeg(ra));
        const decDeg = radToDeg(dec);
        const horiz = equatorialToHorizontalVector(
            raDeg,
            decDeg,
            lstDeg,
            observer.lat ?? 0,
            PLANET_DISTANCE_SCALE
        );
        const phase = calculatePhase(helio, earthHelio, distanceAu);
        const apparentMagnitude = calculateApparentMagnitude(
            planet.id,
            helio.r,
            distanceAu,
            phase.phaseAngle
        );
        states[planet.id] = {
            id: planet.id,
            name: planet.name,
            nameEn: planet.nameEn,
            position: horiz?.vector ?? new THREE.Vector3(0, -PLANET_DISTANCE_SCALE, 0),
            altDeg: horiz?.altDeg ?? -90,
            azDeg: horiz?.azDeg ?? 0,
            raDeg,
            decDeg,
            distanceAu,
            heliocentricDistanceAu: helio.r,
            phaseAngle: phase.phaseAngle,
            illumination: phase.illumination,
            apparentMagnitude,
            sunDirection
        };
    }
    return states;
}

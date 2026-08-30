import test from 'node:test';
import assert from 'node:assert/strict';
import {
    angularDifferenceDegrees,
    calculateLocalSiderealTime,
    eclipticToEquatorial,
    eclipticVectorToEquatorial,
    equatorialToHorizontal,
    evalPolynomial,
    julianDay,
    meanObliquityRad,
    normalizeDegrees,
    normalizeRadians,
    precessEquatorialJ2000ToDate,
    radToDeg,
    solveKeplerElliptic
} from '../utils/astronomy.js';
import { calculateHalleyState } from '../utils/cometEphemeris.js';
import { calculatePlanetaryStates } from '../utils/planetEphemeris.js';

const closeTo = (actual, expected, tolerance = 1e-9) => {
    assert.ok(
        Math.abs(actual - expected) <= tolerance,
        `expected ${actual} to be within ${tolerance} of ${expected}`
    );
};

test('angle normalization handles positive and negative turns', () => {
    assert.equal(normalizeDegrees(725), 5);
    assert.equal(normalizeDegrees(-5), 355);
    closeTo(normalizeRadians(-Math.PI / 2), Math.PI * 1.5);
    closeTo(angularDifferenceDegrees(359.9, 0.1), 0.2, 1e-12);
});

test('Julian day and Greenwich sidereal time match J2000', () => {
    const j2000 = new Date('2000-01-01T12:00:00.000Z');
    closeTo(julianDay(j2000), 2451545, 1e-9);
    closeTo(calculateLocalSiderealTime(j2000, 0), 280.46061837, 1e-7);
});

test('equatorial coordinates on the meridian reach the expected altitude', () => {
    const horizontal = equatorialToHorizontal(120, 35, 120, 35);
    assert.ok(horizontal);
    closeTo(horizontal.altDeg, 90, 1e-6);
});

test('ecliptic conversion uses the supplied obliquity consistently', () => {
    const origin = eclipticToEquatorial(0, 0, 23.439291);
    closeTo(origin.raDeg, 0, 1e-10);
    closeTo(origin.decDeg, 0, 1e-10);

    const solstice = eclipticToEquatorial(90, 0, 23.439291);
    closeTo(solstice.raDeg, 90, 1e-9);
    closeTo(solstice.decDeg, 23.439291, 1e-9);

    const vector = eclipticVectorToEquatorial(
        { x: 0, y: 1, z: 0 },
        23.439291 * Math.PI / 180
    );
    closeTo(radToDeg(Math.asin(vector.z / vector.length())), 23.439291, 1e-9);
});

test('shared numerical helpers preserve their mathematical invariants', () => {
    assert.equal(evalPolynomial([2, 3, 4], 5), 117);
    closeTo(radToDeg(meanObliquityRad(0)), 23.43929111111111, 1e-10);

    const meanAnomaly = 1.2;
    const eccentricity = 0.72;
    const eccentricAnomaly = solveKeplerElliptic(meanAnomaly, eccentricity);
    closeTo(
        eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly),
        meanAnomaly,
        1e-12
    );
});

test('precession is effectively identity at the J2000 epoch', () => {
    const result = precessEquatorialJ2000ToDate(101.287155, -16.716116, new Date('2000-01-01T12:00:00Z'));
    closeTo(result.ra, 101.287155, 1e-9);
    closeTo(result.dec, -16.716116, 1e-9);
});

test('planet and comet ephemerides return finite observable states', () => {
    const date = new Date('2024-04-08T18:00:00Z');
    const observer = { lat: 35.6895, lon: 139.6917 };
    const lst = calculateLocalSiderealTime(date, observer.lon);
    const planets = calculatePlanetaryStates(date, observer, lst);
    const planetStates = Object.values(planets);
    assert.equal(planetStates.length, 7);
    planetStates.forEach((planet) => {
        assert.ok(Number.isFinite(planet.raDeg));
        assert.ok(Number.isFinite(planet.decDeg));
        assert.ok(Number.isFinite(planet.altDeg));
        assert.ok(Number.isFinite(planet.azDeg));
    });

    const halley = calculateHalleyState(date, observer, lst);
    assert.ok(Number.isFinite(halley.raDeg));
    assert.ok(Number.isFinite(halley.decDeg));
    assert.ok(Number.isFinite(halley.distanceAu));
});

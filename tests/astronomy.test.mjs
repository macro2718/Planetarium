import assert from 'node:assert/strict';
import {
    calculateLocalSiderealTime,
    equatorialToHorizontal,
    equatorialToHorizontalVector,
    precessEquatorialJ2000ToDate,
    radToDeg
} from '../utils/astronomy.js';
import { calculateGalacticBasis } from '../systems/milkyWaySystem.js';

function approxEqual(actual, expected, toleranceDeg) {
    assert.ok(Math.abs(actual - expected) <= toleranceDeg, `${actual} not within ${toleranceDeg} of ${expected}`);
}

function horizontalVectorToAltAz(vector) {
    const radius = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z) || 1;
    const altRad = Math.asin(vector.y / radius);
    const azRad = Math.atan2(-vector.x, vector.z);
    return {
        altDeg: radToDeg(altRad),
        azDeg: radToDeg(azRad < 0 ? azRad + Math.PI * 2 : azRad)
    };
}

// Reference values computed using Astropy (FK5, equinox-of-date transformations).
const galacticPole = { ra: 192.85948, dec: 27.12825 };
const galacticCenter = { ra: 266.4051, dec: -28.936175 };
const tokyo = { lat: 35.6895, lon: 139.6917 };
const observationDate = new Date('2024-01-15T21:00:00+09:00');
const referenceLstDeg = 74.1350642288323;

{
    const lst = calculateLocalSiderealTime(observationDate, tokyo.lon);
    const delta = lst - referenceLstDeg;
    console.log('Local sidereal time deviation (deg):', delta);
    approxEqual(lst, referenceLstDeg, 0.02);
}

{
    const lst = calculateLocalSiderealTime(observationDate, tokyo.lon);
    const precessedCenter = precessEquatorialJ2000ToDate(galacticCenter.ra, galacticCenter.dec, observationDate);
    const precessedPole = precessEquatorialJ2000ToDate(galacticPole.ra, galacticPole.dec, observationDate);

    const centerHorizontal = equatorialToHorizontal(precessedCenter.ra, precessedCenter.dec, lst, tokyo.lat);
    const poleHorizontal = equatorialToHorizontal(precessedPole.ra, precessedPole.dec, lst, tokyo.lat);

    console.log('Galactic center alt/az deviation (deg):', {
        alt: centerHorizontal.altDeg + 77.38112559960396,
        az: centerHorizontal.azDeg - 298.7388773094573
    });
    console.log('Galactic north pole alt/az deviation (deg):', {
        alt: poleHorizontal.altDeg + 4.948208382560983,
        az: poleHorizontal.azDeg - 51.454103042052644
    });

    approxEqual(centerHorizontal.altDeg, -77.38112559960396, 0.05);
    approxEqual(centerHorizontal.azDeg, 298.7388773094573, 0.05);
    approxEqual(poleHorizontal.altDeg, -4.948208382560983, 0.05);
    approxEqual(poleHorizontal.azDeg, 51.454103042052644, 0.05);
}

{
    const lst = calculateLocalSiderealTime(observationDate, tokyo.lon);
    const ctx = {
        observer: { lat: tokyo.lat },
        localSiderealTime: lst,
        getSimulatedDate: () => observationDate
    };

    const basis = calculateGalacticBasis(ctx);
    assert.ok(basis, 'Galactic basis should be calculated');

    const poleAltAz = horizontalVectorToAltAz(basis.normal);
    console.log('Basis normal alt/az deviation (deg):', {
        alt: poleAltAz.altDeg + 4.948208382560983,
        az: poleAltAz.azDeg - 51.454103042052644
    });
    approxEqual(poleAltAz.altDeg, -4.948208382560983, 0.05);
    approxEqual(poleAltAz.azDeg, 51.454103042052644, 0.05);

    const precessedCenter = precessEquatorialJ2000ToDate(galacticCenter.ra, galacticCenter.dec, observationDate);
    const centerVector = equatorialToHorizontalVector(precessedCenter.ra, precessedCenter.dec, lst, tokyo.lat).vector;
    const projected = centerVector.clone().sub(basis.normal.clone().multiplyScalar(centerVector.dot(basis.normal)));
    projected.normalize();
    const axisDeviationDeg = radToDeg(basis.axis.angleTo(projected));
    console.log('Basis axis deviation from projected galactic center (deg):', axisDeviationDeg);
    approxEqual(axisDeviationDeg, 0, 0.05);
}

{
    const result = precessEquatorialJ2000ToDate(galacticPole.ra, galacticPole.dec, new Date('2000-01-01T12:00:00Z'));
    approxEqual(result.ra, galacticPole.ra, 1e-6);
    approxEqual(result.dec, galacticPole.dec, 1e-6);
}

{
    const result = precessEquatorialJ2000ToDate(galacticPole.ra, galacticPole.dec, new Date('2025-01-01T00:00:00Z'));
    approxEqual(result.ra, 193.16379330947183, 0.02);
    approxEqual(result.dec, 26.992647654515704, 0.02);
}

{
    const result = precessEquatorialJ2000ToDate(galacticPole.ra, galacticPole.dec, new Date('2050-01-01T00:00:00Z'));
    approxEqual(result.ra, 193.46786793473464, 0.02);
    approxEqual(result.dec, 26.857235534766176, 0.02);
}

console.log('All astronomy precession tests passed.');

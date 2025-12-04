import assert from 'node:assert/strict';
import { precessEquatorialJ2000ToDate } from '../utils/astronomy.js';

function approxEqual(actual, expected, toleranceDeg) {
    assert.ok(Math.abs(actual - expected) <= toleranceDeg, `${actual} not within ${toleranceDeg} of ${expected}`);
}

// Reference values computed using Astropy (FK5, equinox-of-date transformations).
const galacticPole = { ra: 192.85948, dec: 27.12825 };

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

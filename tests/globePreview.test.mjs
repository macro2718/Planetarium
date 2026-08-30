import test from 'node:test';
import assert from 'node:assert/strict';
import { latLonToVector } from '../ui/globePreview.js';

const closeTo = (actual, expected, tolerance = 1e-12) => {
    assert.ok(Math.abs(actual - expected) <= tolerance);
};

test('latitude/longitude conversion keeps points on the globe radius', () => {
    const radius = 0.9;
    const vector = latLonToVector(35.6895, 139.6917, radius);
    closeTo(vector.length(), radius);
});

test('latitude/longitude conversion places poles and equator consistently', () => {
    const northPole = latLonToVector(90, 0, 1);
    closeTo(northPole.x, 0);
    closeTo(northPole.y, 1);
    closeTo(northPole.z, 0);

    const equator = latLonToVector(0, 0, 1);
    closeTo(equator.y, 0);
    closeTo(equator.length(), 1);
});

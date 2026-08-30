import test from 'node:test';
import assert from 'node:assert/strict';
import { TimeController } from '../core/timeController.js';

test('custom time mode advances by elapsed performance time and scale', () => {
    let nowSeconds = 100;
    const controller = new TimeController({ nowProvider: () => nowSeconds });
    const base = new Date('2026-08-30T12:00:00.000Z');
    controller.setMode('custom', { date: base, timeScale: 60 });

    nowSeconds += 2;
    controller.update(nowSeconds, 139.6917);
    assert.equal(controller.getSimulatedDate().toISOString(), '2026-08-30T12:02:00.000Z');
});

test('pausing custom time freezes the current instant until resumed', () => {
    let nowSeconds = 10;
    const controller = new TimeController({ nowProvider: () => nowSeconds });
    controller.setMode('custom', {
        date: new Date('2026-01-01T00:00:00.000Z'),
        timeScale: 10
    });

    nowSeconds = 12;
    controller.togglePause(true, 0);
    const pausedAt = controller.getSimulatedDate().toISOString();
    nowSeconds = 30;
    controller.update(nowSeconds, 0);
    assert.equal(controller.getSimulatedDate().toISOString(), pausedAt);

    controller.togglePause(false, 0);
    nowSeconds = 31;
    controller.update(nowSeconds, 0);
    assert.equal(
        controller.getSimulatedDate().getTime(),
        new Date(pausedAt).getTime() + 10_000
    );
});

test('fixed-time mode advances whole days while preserving local time of day', () => {
    let nowSeconds = 50;
    const controller = new TimeController({ nowProvider: () => nowSeconds });
    const base = new Date(2026, 7, 30, 21, 45, 12, 345);
    controller.setMode('fixed-time', { date: base, dayScale: 2 });

    nowSeconds += 1.9;
    controller.update(nowSeconds, 0);
    const result = controller.getSimulatedDate();
    const expected = new Date(base);
    expected.setDate(expected.getDate() + 3);
    assert.equal(result.getFullYear(), expected.getFullYear());
    assert.equal(result.getMonth(), expected.getMonth());
    assert.equal(result.getDate(), expected.getDate());
    assert.equal(result.getHours(), 21);
    assert.equal(result.getMinutes(), 45);
    assert.equal(result.getSeconds(), 12);
    assert.equal(result.getMilliseconds(), 345);
});

test('unchanged simulation instants reuse their date and sidereal result', () => {
    let nowSeconds = 10;
    const controller = new TimeController({ nowProvider: () => nowSeconds });
    controller.setMode('custom', {
        date: new Date('2026-01-01T00:00:00.000Z'),
        timeScale: 10
    });
    controller.togglePause(true, 139);

    const firstResult = controller.update(nowSeconds, 139);
    const firstDate = controller.getSimulatedDate();
    nowSeconds += 60;
    const secondResult = controller.update(nowSeconds, 139);

    assert.equal(secondResult, firstResult);
    assert.equal(controller.getSimulatedDate(), firstDate);
    assert.equal(secondResult.localSiderealTime, firstResult.localSiderealTime);
});

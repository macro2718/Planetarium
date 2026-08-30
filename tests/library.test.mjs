import test from 'node:test';
import assert from 'node:assert/strict';
import {
    CelestialLibraryStore,
    normalizeConstellationName
} from '../ui/library/libraryStore.js';
import {
    buildConstellationContent,
    getRegisteredConstellationCount
} from '../ui/library/constellationContent.js';

class MemoryStorage {
    constructor(initial = {}) {
        this.values = new Map(Object.entries(initial));
    }

    getItem(key) {
        return this.values.get(key) ?? null;
    }

    setItem(key, value) {
        this.values.set(key, value);
    }
}

test('library store normalizes, deduplicates, persists, and reloads discoveries', () => {
    const storage = new MemoryStorage();
    const store = new CelestialLibraryStore(storage, 'test-library');
    assert.equal(store.unlock('  オリオン座  '), true);
    assert.equal(store.unlock('オリオン座'), false);
    assert.equal(store.unlock('星図外'), false);
    assert.deepEqual(store.getUnlockedNames(), ['オリオン座']);

    const restored = new CelestialLibraryStore(storage, 'test-library');
    restored.load();
    assert.deepEqual(restored.getUnlockedNames(), ['オリオン座']);
    assert.equal(normalizeConstellationName('  A   B  '), 'A B');
});

test('constellation content builder returns a complete presentation model', () => {
    const content = buildConstellationContent('オリオン座');
    assert.equal(content.name, 'オリオン座');
    assert.ok(content.lede);
    assert.ok(content.profile);
    assert.ok(content.guide);
    assert.ok(content.lore);
    assert.ok(content.spineCode);
    assert.ok(getRegisteredConstellationCount() > 0);
});

export const LIBRARY_STORAGE_KEY = 'celestial-library-unlocked-v1';

export function normalizeConstellationName(name) {
    if (!name) return '';
    return String(name).trim().replace(/\s+/g, ' ');
}

export class CelestialLibraryStore {
    constructor(storage = globalThis.localStorage, storageKey = LIBRARY_STORAGE_KEY) {
        this.storage = storage;
        this.storageKey = storageKey;
        this.unlocked = new Set();
    }

    load() {
        try {
            const stored = this.storage?.getItem(this.storageKey);
            if (!stored) return this.unlocked;
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                this.unlocked = new Set(
                    parsed.map(normalizeConstellationName).filter(Boolean)
                );
            }
        } catch (error) {
            console.warn('[celestialLibrary] Failed to load saved constellations', error);
            this.unlocked = new Set();
        }
        return this.unlocked;
    }

    unlock(name) {
        const normalized = normalizeConstellationName(name);
        if (!normalized || normalized === '星図外' || this.unlocked.has(normalized)) {
            return false;
        }
        this.unlocked.add(normalized);
        this.save();
        return true;
    }

    getUnlockedNames() {
        return Array.from(this.unlocked).sort((a, b) => a.localeCompare(b, 'ja'));
    }

    save() {
        try {
            this.storage?.setItem(this.storageKey, JSON.stringify(Array.from(this.unlocked)));
            return true;
        } catch (error) {
            console.warn('[celestialLibrary] Failed to save constellations', error);
            return false;
        }
    }
}

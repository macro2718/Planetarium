import { BASE_CONSTELLATION_DATA } from './data/constellations.js';
import { BASE_STAR_DATA } from './data/stars.js';

export class AstroCatalog {
    constructor({ stars = [], constellations = [] } = {}) {
        this.stars = [];
        this.constellations = [];
        this.starMap = new Map();
        stars.forEach(star => this.registerStar(star));
        constellations.forEach(constellation => this.registerConstellation(constellation));
    }

    registerStar(star) {
        if (!star || !star.id) {
            throw new Error('Star definition requires an "id" field.');
        }

        const normalized = {
            magnitude: star.magnitude ?? 2.5,
            distance: star.distance ?? null,
            spectralType: star.spectralType ?? 'G型',
            temperature: star.temperature ?? '約5,800K',
            colorHint: star.colorHint ?? '',
            featured: Boolean(star.featured),
            ...star
        };

        if (this.starMap.has(normalized.id)) {
            const idx = this.stars.findIndex(existing => existing.id === normalized.id);
            this.stars[idx] = normalized;
        } else {
            this.stars.push(normalized);
        }
        this.starMap.set(normalized.id, normalized);
        return normalized;
    }

    registerConstellation(definition = {}) {
        if (!definition.name && !definition.id) {
            throw new Error('Constellation definition requires "name" or "id".');
        }

        const normalized = {
            id: definition.id ?? definition.name,
            name: definition.name ?? definition.id,
            color: definition.color ?? 0x4488ff,
            starIds: [],
            lines: [],
            description: definition.description ?? '',
        };

        if (Array.isArray(definition.stars)) {
            definition.stars.forEach(starDef => {
                const registered = this.registerStar(starDef);
                normalized.starIds.push(registered.id);
            });
        }

        if (Array.isArray(definition.starIds)) {
            normalized.starIds.push(...definition.starIds);
        }
        normalized.starIds = [...new Set(normalized.starIds)];

        if (Array.isArray(definition.lines)) {
            normalized.lines = definition.lines.map(line => [...line]);
        }

        this.constellations.push(normalized);
        return normalized;
    }

    getStar(id) {
        return this.starMap.get(id);
    }

    getStars(filterFn) {
        const stars = [...this.stars];
        return typeof filterFn === 'function' ? stars.filter(filterFn) : stars;
    }

    getFeaturedStars() {
        return this.getStars(star => star.featured);
    }

    getStarMap() {
        return new Map(this.starMap);
    }

    getConstellations() {
        return this.constellations.map(constellation => ({
            ...constellation,
            starIds: [...constellation.starIds],
            lines: constellation.lines.map(line => [...line])
        }));
    }

    static createDefault() {
        return new AstroCatalog({
            stars: BASE_STAR_DATA,
            constellations: BASE_CONSTELLATION_DATA
        });
    }
}

import { LOCATIONS } from '../data/locations.js';

let currentLocation = LOCATIONS.find(loc => loc.id === 'tokyo') || null;

export function setCurrentLocation(location) {
    if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
        currentLocation = null;
        return;
    }

    const name = location.name || location.nameEn || '観測地点';
    currentLocation = {
        ...location,
        name,
        lat: location.lat,
        lon: location.lon
    };
}

export function getCurrentLocation() {
    return currentLocation;
}

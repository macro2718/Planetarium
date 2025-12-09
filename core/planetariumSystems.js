import { createSkyEnvironment } from '../systems/skyEnvironment.js';
import { createStarFieldSystem } from '../systems/starFieldSystem.js';
import { createMilkyWaySystem } from '../systems/milkyWaySystem.js';
import { createConstellationSystem } from '../systems/constellationSystem.js';
import { createNebulaSystem } from '../systems/nebulaSystem.js';
import { createSunSystem } from '../systems/sunSystem.js';
import { createMoonSystem } from '../systems/moonSystem.js';
import { createPlanetSystem } from '../systems/planetSystem.js';
import { createAuroraSystem } from '../systems/auroraSystem.js';
import { createCosmicDustSystem } from '../systems/cosmicDustSystem.js';
import { createSurfaceSystem } from '../systems/surfaceSystem.js';
import { createShootingStarSystem } from '../systems/shootingStarSystem.js';
import { createCometTailSystem } from '../systems/cometTailSystem.js';
import { createMeteorShowerSystem } from '../systems/meteorShowerSystem.js';
import {
    createHourCircleSystem,
    createDeclinationCircleSystem,
    createCelestialEquatorSystem,
    createEclipticSystem,
    createGalacticEquatorSystem,
    createLunarOrbitPlaneSystem
} from '../systems/hourCircleSystem.js';
import { createCardinalDirectionSystem } from '../systems/cardinalDirectionSystem.js';
import { createStarTrailSystem } from '../systems/starTrailSystem.js';
import { createLensFlareSystem } from '../systems/lensFlareSystem.js';

function register(updaters, system) {
    if (system?.update) {
        updaters.push(system.update);
    }
    return system;
}

export function createPlanetariumSystems(ctx) {
    const systems = {};
    const updaters = [];

    register(updaters, createSkyEnvironment(ctx));
    register(updaters, createStarFieldSystem(ctx));
    register(updaters, createMilkyWaySystem(ctx));

    systems.constellationSystem = createConstellationSystem(ctx);
    register(updaters, systems.constellationSystem);

    createNebulaSystem(ctx);

    systems.sunSystem = createSunSystem(ctx);
    register(updaters, systems.sunSystem);

    systems.planetSystem = createPlanetSystem(ctx);
    register(updaters, systems.planetSystem);

    systems.moonSystem = createMoonSystem(ctx);
    register(updaters, systems.moonSystem);

    register(updaters, createAuroraSystem(ctx));
    register(updaters, createCosmicDustSystem(ctx));

    systems.surfaceSystem = createSurfaceSystem(ctx, () => systems.moonSystem.getCurrentState());
    register(updaters, systems.surfaceSystem);

    register(updaters, createShootingStarSystem(ctx));

    systems.cometTailSystem = createCometTailSystem(ctx);
    register(updaters, systems.cometTailSystem);

    systems.meteorShowerSystem = createMeteorShowerSystem(ctx);
    register(updaters, systems.meteorShowerSystem);

    systems.hourCircleSystem = createHourCircleSystem(ctx);
    systems.declinationCircleSystem = createDeclinationCircleSystem(ctx);
    systems.celestialEquatorSystem = createCelestialEquatorSystem(ctx);
    systems.eclipticSystem = createEclipticSystem(ctx);
    systems.galacticEquatorSystem = createGalacticEquatorSystem(ctx);
    systems.lunarOrbitPlaneSystem = createLunarOrbitPlaneSystem(ctx);
    systems.cardinalDirectionSystem = createCardinalDirectionSystem(ctx);
    systems.starTrailSystem = createStarTrailSystem(ctx);

    register(updaters, systems.starTrailSystem);
    register(updaters, systems.celestialEquatorSystem);
    register(updaters, systems.eclipticSystem);
    register(updaters, systems.galacticEquatorSystem);
    register(updaters, systems.lunarOrbitPlaneSystem);

    systems.lensFlareSystem = createLensFlareSystem(ctx);
    register(updaters, systems.lensFlareSystem);

    return { systems, updaters };
}

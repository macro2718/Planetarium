import * as THREE from '../three.module.js';
import { equatorialToHorizontalVector, precessEquatorialJ2000ToDate } from '../utils/astronomy.js';

const GALACTIC_CENTER = { ra: 266.4051, dec: -28.936175 };
const FLARE_DISTANCE = 6;
const GALACTIC_RADIUS = 6000;

export function createLensFlareSystem(ctx) {
    const group = new THREE.Group();
    group.renderOrder = 9999;
    group.frustumCulled = false;
    ctx.scene.add(group);

    const ghostTexture = createGhostTexture();
    const streakTexture = createStreakTexture();

    const ghostConfigs = [
        { offset: -0.55, size: 180, opacity: 0.28, color: '#9bc8ff' },
        { offset: 0.32, size: 120, opacity: 0.55, color: '#ffe6b8' },
        { offset: 0.92, size: 220, opacity: 0.24, color: '#f7b5ff' },
        { offset: -1.18, size: 140, opacity: 0.22, color: '#7ae1ff' },
        { offset: 1.45, size: 160, opacity: 0.18, color: '#fff7d8' }
    ];

    const ghosts = ghostConfigs.map(config => {
        const material = new THREE.SpriteMaterial({
            map: ghostTexture,
            color: new THREE.Color(config.color),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            opacity: 0
        });
        const sprite = new THREE.Sprite(material);
        sprite.visible = false;
        group.add(sprite);
        return { sprite, config };
    });

    const haloMaterial = new THREE.SpriteMaterial({
        map: ghostTexture,
        color: new THREE.Color('#fff7c7'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        opacity: 0
    });
    const haloSprite = new THREE.Sprite(haloMaterial);
    haloSprite.visible = false;
    group.add(haloSprite);

    const streakMaterial = new THREE.SpriteMaterial({
        map: streakTexture,
        color: new THREE.Color('#c5e6ff'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        opacity: 0
    });
    const streakSprite = new THREE.Sprite(streakMaterial);
    streakSprite.visible = false;
    group.add(streakSprite);

    const tempVec = new THREE.Vector3();
    const ndcVec = new THREE.Vector3();
    const cameraDir = new THREE.Vector3();

    const placeSprite = (sprite, ndc, sizePx, opacity, stretch = 1) => {
        if (opacity <= 0.001) {
            sprite.visible = false;
            return;
        }
        tempVec.set(ndc.x, ndc.y, -1).unproject(ctx.camera);
        tempVec.sub(ctx.camera.position).normalize().multiplyScalar(FLARE_DISTANCE).add(ctx.camera.position);
        const scale = pixelsToWorldUnits(sizePx, FLARE_DISTANCE, ctx.camera);
        sprite.position.copy(tempVec);
        sprite.scale.set(scale * stretch, scale, 1);
        sprite.material.opacity = opacity;
        sprite.visible = true;
        sprite.quaternion.copy(ctx.camera.quaternion);
    };

    const projectToScreen = (worldPosition) => {
        ndcVec.copy(worldPosition).project(ctx.camera);
        if (ndcVec.z < -1 || ndcVec.z > 1) return null;
        tempVec.copy(worldPosition).sub(ctx.camera.position);
        ctx.camera.getWorldDirection(cameraDir);
        if (tempVec.dot(cameraDir) < 0) return null;
        return ndcVec.clone();
    };

    const collectSources = () => {
        const sources = [];
        if (ctx.settings?.showSun && ctx.sunGroup?.visible && ctx.sunSystem?.getCurrentState) {
            const state = ctx.sunSystem.getCurrentState();
            if (state?.position) {
                const altitudeBoost = THREE.MathUtils.smoothstep(-2, 10, state.altDeg ?? -90);
                const strength = 1.0 * altitudeBoost;
                sources.push({
                    position: state.position,
                    strength,
                    tint: new THREE.Color(1.0, 0.92, 0.75)
                });
            }
        }

        if (ctx.settings?.showMoon && ctx.moonGroup?.visible && ctx.moonSystem?.getCurrentState) {
            const state = ctx.moonSystem.getCurrentState();
            if (state?.position) {
                const altitudeBoost = THREE.MathUtils.smoothstep(0, 12, state.altDeg ?? -90);
                const illumination = Math.max(0, Math.min(1, state.illumination ?? 0));
                const strength = 0.55 * illumination * altitudeBoost;
                if (strength > 0.02) {
                    sources.push({
                        position: state.position,
                        strength,
                        tint: new THREE.Color(0.78, 0.88, 1.0)
                    });
                }
            }
        }

        const milkyCenter = getGalacticCorePosition(ctx);
        if (ctx.settings?.showMilkyWay && milkyCenter) {
            const { position, altDeg } = milkyCenter;
            const altitudeBoost = THREE.MathUtils.clamp((altDeg + 6) / 26, 0, 1);
            const strength = 0.35 * altitudeBoost;
            if (strength > 0.05) {
                sources.push({
                    position,
                    strength,
                    tint: new THREE.Color(0.92, 0.95, 1.05)
                });
            }
        }

        return sources;
    };

    const applyFlare = (source) => {
        const ndc = projectToScreen(source.position);
        if (!ndc) {
            hideAll();
            return;
        }

        const radial = Math.sqrt(ndc.x * ndc.x + ndc.y * ndc.y);
        const centerFade = 1 - THREE.MathUtils.smoothstep(0.45, 1.2, radial);
        const intensity = source.strength * centerFade;
        if (intensity <= 0.001) {
            hideAll();
            return;
        }

        const tint = source.tint ?? new THREE.Color(1, 1, 1);
        ghosts.forEach(({ sprite, config }) => {
            const ghostNdc = ndc.clone().multiplyScalar(config.offset);
            const edgeFade = 1 - THREE.MathUtils.smoothstep(0.9, 1.35, ghostNdc.length());
            const opacity = intensity * config.opacity * edgeFade;
            sprite.material.color.copy(tint);
            placeSprite(sprite, ghostNdc, config.size, opacity);
        });

        const haloOpacity = intensity * 0.5;
        haloSprite.material.color.copy(tint);
        placeSprite(haloSprite, ndc, 260, haloOpacity);

        const streakOpacity = intensity * 0.35;
        streakSprite.material.color.setRGB(
            tint.r * 0.9 + 0.1,
            tint.g * 0.95 + 0.05,
            tint.b * 1.05
        );
        placeSprite(streakSprite, ndc, 520, streakOpacity, 1.6);
    };

    const hideAll = () => {
        ghosts.forEach(({ sprite }) => { sprite.visible = false; });
        haloSprite.visible = false;
        streakSprite.visible = false;
    };

    return {
        setEnabled(enabled) {
            ctx.settings.showLensFlare = enabled;
            group.visible = !!enabled;
            if (!enabled) hideAll();
        },
        update() {
            if (!ctx.settings?.showLensFlare) {
                hideAll();
                return;
            }
            group.visible = true;
            const sources = collectSources();
            if (!sources.length) {
                hideAll();
                return;
            }
            let strongest = null;
            let strongestPower = 0;
            sources.forEach(src => {
                const ndc = projectToScreen(src.position);
                if (!ndc) return;
                const radial = Math.sqrt(ndc.x * ndc.x + ndc.y * ndc.y);
                const centerFade = 1 - THREE.MathUtils.smoothstep(0.45, 1.2, radial);
                const power = src.strength * centerFade;
                if (power > strongestPower) {
                    strongestPower = power;
                    strongest = src;
                }
            });
            if (!strongest) {
                hideAll();
                return;
            }
            applyFlare(strongest);
        }
    };
}

function pixelsToWorldUnits(pixels, distance, camera) {
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const height = 2 * Math.tan(vFov / 2) * distance;
    const pxRatio = pixels / Math.max(window.innerHeight, 1);
    return height * pxRatio;
}

function getGalacticCorePosition(ctx) {
    if (!ctx.localSiderealTime || ctx.observer?.lat == null) return null;
    const date = ctx.getSimulatedDate ? ctx.getSimulatedDate() : new Date();
    const equatorial = precessEquatorialJ2000ToDate(GALACTIC_CENTER.ra, GALACTIC_CENTER.dec, date);
    if (!equatorial) return null;
    const result = equatorialToHorizontalVector(
        equatorial.ra,
        equatorial.dec,
        ctx.localSiderealTime,
        ctx.observer.lat,
        GALACTIC_RADIUS
    );
    if (!result) return null;
    return { position: result.vector, altDeg: result.altDeg };
}

function createGhostTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx2d = canvas.getContext('2d');
    const center = size / 2;

    const gradient = ctx2d.createRadialGradient(center, center, size * 0.08, center, center, size * 0.48);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.35)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.12)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx2d.fillStyle = gradient;
    ctx2d.fillRect(0, 0, size, size);

    const rim = ctx2d.createRadialGradient(center, center, size * 0.28, center, center, size * 0.5);
    rim.addColorStop(0, 'rgba(255, 255, 255, 0)');
    rim.addColorStop(0.7, 'rgba(255, 255, 255, 0.18)');
    rim.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx2d.fillStyle = rim;
    ctx2d.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createStreakTexture() {
    const width = 512;
    const height = 128;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx2d = canvas.getContext('2d');

    const gradient = ctx2d.createLinearGradient(0, height / 2, width, height / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.35)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.75, 'rgba(255, 255, 255, 0.35)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx2d.fillStyle = gradient;
    ctx2d.fillRect(0, height * 0.35, width, height * 0.3);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

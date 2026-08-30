import * as THREE from '../three.module.js';
import {
    equatorialToSceneVector,
    setEquatorialToHorizontalMatrix
} from '../utils/astronomy.js';

const SKY_RADIUS = 5000;
const LST_UPDATE_THRESHOLD = 0.02;
const LAT_UPDATE_THRESHOLD = 0.0005;
const MIN_UPDATE_INTERVAL = 0.25;

export function createConstellationSystem(ctx) {
    ctx.constellationsGroup = new THREE.Group();
    ctx.constellationLines = [];

    const starEntries = new Map();
    const lineEntries = [];
    let lastLst = null;
    let lastLat = null;
    let lastUpdateTime = -Infinity;
    let positionsDirty = true;
    const horizontalMatrix = new THREE.Matrix3();
    setEquatorialToHorizontalMatrix(
        horizontalMatrix,
        ctx.localSiderealTime ?? 0,
        ctx.observer?.lat ?? 0
    );

    const ensureStar = (starId) => {
        if (starEntries.has(starId)) {
            return starEntries.get(starId);
        }
        const data = ctx.catalog.getStar(starId);
        if (!data) return null;

        // Interaction metadata lives on a draw-call-free anchor.
        const anchor = new THREE.Object3D();
        anchor.userData = createStarUserData(data);
        ctx.constellationsGroup.add(anchor);
        ctx.catalogPickables.push(anchor);

        const size = getStarSizeFromMagnitude(data.magnitude);
        const baseColor = new THREE.Color(data.glowColor || data.color || 0xffffff);
        const brightness = THREE.MathUtils.clamp(2.6 - (data.magnitude ?? 2.5) * 0.35, 0.45, 1.75)
            + (data.featured ? 0.25 : 0);
        const coreScale = size * (2.2 + brightness * 0.9);
        const entry = {
            id: data.id,
            index: starEntries.size,
            anchor,
            data,
            equatorialPosition: equatorialToSceneVector(data.ra, data.dec),
            position: new THREE.Vector3(),
            aboveHorizon: false,
            hasPosition: false,
            diameter: size * 2,
            starColor: new THREE.Color(data.color || 0xffffee),
            coreColor: baseColor.clone().multiplyScalar(1.15),
            hazeColor: baseColor,
            coreScale,
            hazeScale: coreScale * (1.6 + Math.random() * 0.25),
            pulseOffset: Math.random() * Math.PI * 2,
            pulseStrength: 0.04 + brightness * 0.02,
            hazeStrength: 0.015 + Math.random() * 0.02
        };
        starEntries.set(data.id, entry);
        updateStarEntry(entry, horizontalMatrix, SKY_RADIUS);
        return entry;
    };

    ctx.catalog.getFeaturedStars().forEach((star) => ensureStar(star.id));
    ctx.catalog.getConstellations().forEach((constellation) => {
        constellation.starIds.forEach((starId) => ensureStar(starId));
        constellation.lines.forEach(([startId, endId]) => {
            const startEntry = ensureStar(startId);
            const endEntry = ensureStar(endId);
            if (!startEntry || !endEntry) return;
            lineEntries.push({
                start: startEntry,
                end: endEntry,
                color: new THREE.Color(constellation.color || 0x4488ff),
                horizonVisible: true
            });
        });
    });

    const starEntryList = Array.from(starEntries.values());
    const stars = createBatchedStars(ctx, starEntryList);
    const lines = createBatchedLines(lineEntries);
    ctx.constellationLines.push(lines.object);
    ctx.constellationsGroup.add(stars.core, stars.coreGlow, stars.hazeGlow, lines.object);
    ctx.scene.add(ctx.constellationsGroup);

    updateStarBuffers(stars.geometry, starEntryList);
    updateLineBuffers(lines.geometry, lineEntries);
    updateConstellationLinesVisibility(ctx, ctx.settings.showConstellations);
    lastLst = ctx.localSiderealTime;
    lastLat = ctx.observer?.lat ?? null;

    return {
        group: ctx.constellationsGroup,
        updateVisibility(visible) {
            positionsDirty = true;
            updateConstellationLinesVisibility(ctx, visible);
        },
        update(time = 0) {
            syncPointScale(ctx, stars.materials);
            stars.materials.forEach((material) => {
                material.uniforms.time.value = time;
            });

            const lst = ctx.localSiderealTime ?? 0;
            const lat = ctx.observer?.lat ?? 0;
            const lstDelta = angularDifferenceDeg(lst, lastLst);
            const latDelta = lastLat === null ? Infinity : Math.abs(lat - lastLat);
            const shouldRefresh = positionsDirty
                || lstDelta > LST_UPDATE_THRESHOLD
                || latDelta > LAT_UPDATE_THRESHOLD;
            const enoughTimeElapsed = time - lastUpdateTime >= MIN_UPDATE_INTERVAL;
            if (!shouldRefresh || !enoughTimeElapsed) return;

            lastLst = lst;
            lastLat = lat;
            lastUpdateTime = time;
            positionsDirty = false;
            setEquatorialToHorizontalMatrix(horizontalMatrix, lst, lat);
            for (const entry of starEntryList) {
                updateStarEntry(entry, horizontalMatrix, SKY_RADIUS);
            }
            updateStarBuffers(stars.geometry, starEntryList);
            updateLineBuffers(lines.geometry, lineEntries);
            updateConstellationLinesVisibility(ctx, ctx.settings.showConstellations);
        }
    };
}

function createStarUserData(data) {
    return {
        id: data.id,
        name: data.name,
        nameEn: data.nameEn,
        type: 'star',
        constellation: data.constellation,
        magnitude: data.magnitude,
        distance: data.distance,
        spectralType: data.spectralType,
        temperature: data.temperature,
        colorHint: data.colorHint,
        info: data.info,
        fromCatalog: true,
        ra: data.ra,
        dec: data.dec
    };
}

function createBatchedStars(ctx, entries) {
    const geometry = new THREE.BufferGeometry();
    const count = entries.length;
    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage)
    );
    geometry.setAttribute(
        'visibility',
        new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage)
    );
    geometry.setAttribute('starDiameter', floatAttribute(entries, (entry) => entry.diameter));
    geometry.setAttribute('coreDiameter', floatAttribute(entries, (entry) => entry.coreScale));
    geometry.setAttribute('hazeDiameter', floatAttribute(entries, (entry) => entry.hazeScale));
    geometry.setAttribute('pulseOffset', floatAttribute(entries, (entry) => entry.pulseOffset));
    geometry.setAttribute('pulseStrength', floatAttribute(entries, (entry) => entry.pulseStrength));
    geometry.setAttribute('hazeStrength', floatAttribute(entries, (entry) => entry.hazeStrength));
    geometry.setAttribute('starColor', colorAttribute(entries, (entry) => entry.starColor));
    geometry.setAttribute('coreColor', colorAttribute(entries, (entry) => entry.coreColor));
    geometry.setAttribute('hazeColor', colorAttribute(entries, (entry) => entry.hazeColor));

    const texture = getStarGlowTexture(ctx);
    const pointScale = getPointScale(ctx);
    const coreMaterial = createStarPointMaterial({ layer: 0, pointScale });
    const coreGlowMaterial = createStarPointMaterial({ layer: 1, pointScale, texture });
    const hazeGlowMaterial = createStarPointMaterial({ layer: 2, pointScale, texture });

    const core = new THREE.Points(geometry, coreMaterial);
    const coreGlow = new THREE.Points(geometry, coreGlowMaterial);
    const hazeGlow = new THREE.Points(geometry, hazeGlowMaterial);
    core.frustumCulled = false;
    coreGlow.frustumCulled = false;
    hazeGlow.frustumCulled = false;
    coreGlow.renderOrder = 1;
    hazeGlow.renderOrder = 2;

    return {
        geometry,
        core,
        coreGlow,
        hazeGlow,
        materials: [coreMaterial, coreGlowMaterial, hazeGlowMaterial]
    };
}

function createStarPointMaterial({ layer, pointScale, texture = null }) {
    const isGlow = layer > 0;
    return new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib.fog,
            {
                time: { value: 0 },
                layer: { value: layer },
                pointScale: { value: pointScale },
                glowMap: { value: texture }
            }
        ]),
        vertexShader: STAR_VERTEX_SHADER,
        fragmentShader: isGlow ? STAR_GLOW_FRAGMENT_SHADER : STAR_CORE_FRAGMENT_SHADER,
        transparent: true,
        blending: isGlow ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: !isGlow,
        depthTest: true,
        fog: true,
        toneMapped: true
    });
}

function createBatchedLines(entries) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(entries.length * 6);
    const colors = new Float32Array(entries.length * 6);
    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)
    );
    geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage)
    );
    const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
    });
    const object = new THREE.LineSegments(geometry, material);
    object.frustumCulled = false;
    return { geometry, object };
}

function updateStarBuffers(geometry, entries) {
    const positions = geometry.getAttribute('position');
    const visibility = geometry.getAttribute('visibility');
    const positionValues = positions.array;
    const visibilityValues = visibility.array;
    for (const entry of entries) {
        const position = entry.hasPosition ? entry.position : ZERO_VECTOR;
        const offset = entry.index * 3;
        positionValues[offset] = position.x;
        positionValues[offset + 1] = position.y;
        positionValues[offset + 2] = position.z;
        visibilityValues[entry.index] = entry.aboveHorizon ? 1 : 0;
    }
    positions.needsUpdate = true;
    visibility.needsUpdate = true;
}

function updateLineBuffers(geometry, entries) {
    const positions = geometry.getAttribute('position');
    const colors = geometry.getAttribute('color');
    const positionValues = positions.array;
    const colorValues = colors.array;
    let visibleSegmentCount = 0;
    for (const entry of entries) {
        const { start, end } = entry;
        entry.horizonVisible = Boolean(
            start?.hasPosition
            && end?.hasPosition
            && (start.aboveHorizon || end.aboveHorizon)
        );
        if (!entry.horizonVisible) continue;

        const offset = visibleSegmentCount * 6;
        positionValues[offset] = start.position.x;
        positionValues[offset + 1] = start.position.y;
        positionValues[offset + 2] = start.position.z;
        positionValues[offset + 3] = end.position.x;
        positionValues[offset + 4] = end.position.y;
        positionValues[offset + 5] = end.position.z;
        colorValues[offset] = colorValues[offset + 3] = entry.color.r;
        colorValues[offset + 1] = colorValues[offset + 4] = entry.color.g;
        colorValues[offset + 2] = colorValues[offset + 5] = entry.color.b;
        visibleSegmentCount += 1;
    }
    geometry.setDrawRange(0, visibleSegmentCount * 2);
    positions.needsUpdate = true;
    colors.needsUpdate = true;
}

function updateConstellationLinesVisibility(ctx, visible) {
    ctx.constellationLines.forEach((line) => {
        line.visible = !!visible;
    });
}

function updateStarEntry(entry, horizontalMatrix, radius) {
    if (!entry.equatorialPosition || !horizontalMatrix) {
        entry.aboveHorizon = false;
        entry.hasPosition = false;
        entry.anchor.visible = false;
        entry.position.setScalar(0);
        return;
    }
    entry.hasPosition = true;
    entry.position.copy(entry.equatorialPosition).applyMatrix3(horizontalMatrix).multiplyScalar(radius);
    entry.anchor.position.copy(entry.position);
    entry.aboveHorizon = entry.position.y > 0;
    entry.anchor.visible = entry.aboveHorizon;
}

function getStarSizeFromMagnitude(magnitude) {
    const mag = magnitude ?? 2.5;
    const brightness = THREE.MathUtils.clamp(2.2 - mag, -1.5, 2.2);
    return 10 + brightness * 5;
}

function syncPointScale(ctx, materials) {
    const pointScale = getPointScale(ctx);
    materials.forEach((material) => {
        if (material.uniforms.pointScale.value !== pointScale) {
            material.uniforms.pointScale.value = pointScale;
        }
    });
}

function getPointScale(ctx) {
    return Math.max(1, (ctx.renderer?.domElement?.height ?? windowHeightFallback()) * 0.5);
}

function windowHeightFallback() {
    return typeof window === 'undefined' ? 540 : window.innerHeight * Math.min(window.devicePixelRatio || 1, 2);
}

function floatAttribute(entries, selector) {
    return new THREE.BufferAttribute(Float32Array.from(entries, selector), 1);
}

function colorAttribute(entries, selector) {
    const values = new Float32Array(entries.length * 3);
    entries.forEach((entry, index) => {
        const color = selector(entry);
        values[index * 3] = color.r;
        values[index * 3 + 1] = color.g;
        values[index * 3 + 2] = color.b;
    });
    return new THREE.BufferAttribute(values, 3);
}

function getStarGlowTexture(ctx) {
    if (ctx.starGlowTexture) return ctx.starGlowTexture;
    if (typeof document === 'undefined') return null;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const gradientCtx = canvas.getContext('2d');
    if (!gradientCtx) return null;
    const gradient = gradientCtx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2
    );
    gradient.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    gradientCtx.fillStyle = gradient;
    gradientCtx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    ctx.starGlowTexture = texture;
    return texture;
}

function angularDifferenceDeg(a, b) {
    if (a === null || b === null) return Infinity;
    const diff = ((a - b + 540) % 360) - 180;
    return Math.abs(diff);
}

const ZERO_VECTOR = Object.freeze({ x: 0, y: 0, z: 0 });

const STAR_VERTEX_SHADER = `
    uniform float time;
    uniform float layer;
    uniform float pointScale;
    attribute float visibility;
    attribute float starDiameter;
    attribute float coreDiameter;
    attribute float hazeDiameter;
    attribute float pulseOffset;
    attribute float pulseStrength;
    attribute float hazeStrength;
    attribute vec3 starColor;
    attribute vec3 coreColor;
    attribute vec3 hazeColor;
    varying vec3 vColor;
    varying float vOpacity;
    #include <fog_pars_vertex>

    void main() {
        float diameter = starDiameter;
        float pulse = 1.0;
        vColor = starColor;
        vOpacity = 1.0;
        if (layer > 1.5) {
            diameter = hazeDiameter;
            pulse = 1.0 + sin(time * 0.18 + pulseOffset * 0.5) * hazeStrength;
            float opacityPulse = 0.7 + 0.18 * sin(time * 0.55 + pulseOffset * 0.7);
            vOpacity = clamp(0.25 * opacityPulse + 0.12, 0.1, 0.5);
            vColor = hazeColor;
        } else if (layer > 0.5) {
            diameter = coreDiameter;
            pulse = 1.0 + sin(time * 0.4 + pulseOffset) * pulseStrength;
            float opacityPulse = 0.7 + 0.18 * sin(time * 0.55 + pulseOffset * 0.7);
            vOpacity = clamp(0.55 * opacityPulse + 0.2, 0.3, 0.85);
            vColor = coreColor;
        }

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        if (visibility < 0.5 || mvPosition.z >= 0.0) {
            gl_PointSize = 0.0;
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        } else {
            gl_PointSize = max(1.0, diameter * pulse * projectionMatrix[1][1] * pointScale / -mvPosition.z);
        }
        #include <fog_vertex>
    }
`;

const STAR_CORE_FRAGMENT_SHADER = `
    varying vec3 vColor;
    varying float vOpacity;
    #include <fog_pars_fragment>
    void main() {
        float distanceFromCenter = length(gl_PointCoord - vec2(0.5));
        if (distanceFromCenter > 0.5) discard;
        float edge = 1.0 - smoothstep(0.46, 0.5, distanceFromCenter);
        gl_FragColor = vec4(vColor, edge * vOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
    }
`;

const STAR_GLOW_FRAGMENT_SHADER = `
    uniform sampler2D glowMap;
    varying vec3 vColor;
    varying float vOpacity;
    #include <fog_pars_fragment>
    void main() {
        vec4 glow = texture2D(glowMap, gl_PointCoord);
        if (glow.a < 0.002) discard;
        gl_FragColor = vec4(glow.rgb * vColor, glow.a * vOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
    }
`;

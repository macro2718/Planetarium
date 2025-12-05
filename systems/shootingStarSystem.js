import * as THREE from '../three.module.js';

const DEFAULT_DELTA = 0.016;
const METEOR_RADIUS = 3200;
const TRAIL_SEGMENTS = 32;

export function createShootingStarSystem(ctx) {
    ctx.shootingStarsGroup = new THREE.Group();
    ctx.scene.add(ctx.shootingStarsGroup);
    ctx.shootingStars = [];
    ctx.shootingStarCooldown = 0;
    return {
        group: ctx.shootingStarsGroup,
        update(time, delta = DEFAULT_DELTA) {
            const visible = !!ctx.settings.showShootingStars;
            ctx.shootingStarsGroup.visible = visible;
            ctx.shootingStarCooldown -= delta;
            if (visible && ctx.shootingStarCooldown <= 0) {
                createShootingStar(ctx);
                ctx.shootingStarCooldown = getNextSpawnDelay();
            }
            for (let i = ctx.shootingStars.length - 1; i >= 0; i--) {
                const star = ctx.shootingStars[i];
                updateShootingStar(star, delta || DEFAULT_DELTA);
                if (star.userData.life <= 0) {
                    disposeShootingStar(star);
                    ctx.shootingStars.splice(i, 1);
                }
            }
        }
    };
}

function getNextSpawnDelay() {
    const burst = Math.random() < 0.12;
    return burst ? 0.15 + Math.random() * 0.35 : 1.2 + Math.random() * 1.8;
}

function createShootingStar(ctx) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.35;
    const radius = METEOR_RADIUS;
    const startPos = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
    startPos.y = Math.abs(startPos.y) + 600;
    const direction = new THREE.Vector3(
        -Math.cos(theta) + THREE.MathUtils.randFloatSpread(0.35),
        -0.85 - Math.random() * 0.35,
        -Math.sin(theta) + THREE.MathUtils.randFloatSpread(0.35)
    ).normalize();
    const speed = 3500 + Math.random() * 2500;
    const lifespan = 0.3 + Math.random() * 0.5;
    const trailLength = 1000 + Math.random() * 800;
    const headColor = new THREE.Color().setHSL(0.08 + Math.random() * 0.08, 0.7, 0.8);
    const tailColor = headColor.clone().offsetHSL(0.05, -0.25, -0.3);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((TRAIL_SEGMENTS + 1) * 3);
    const colors = new Float32Array((TRAIL_SEGMENTS + 1) * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    populateTrailColors(colors, headColor, tailColor);
    const trailMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const trail = new THREE.Line(geometry, trailMaterial);
    const trailPoints = createInitialTrailPoints(startPos, direction, trailLength);
    updateTrailAttribute(geometry.getAttribute('position'), trailPoints);
    
    const starGroup = new THREE.Group();
    starGroup.add(trail);
    starGroup.userData = {
        position: startPos.clone(),
        velocity: direction.clone().multiplyScalar(speed),
        curveDrift: new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(4),
            THREE.MathUtils.randFloat(-2, 0.5),
            THREE.MathUtils.randFloatSpread(4)
        ),
        trail,
        trailPoints,
        life: 1,
        lifespan,
        elapsed: 0,
        colorIntensity: 0.8 + Math.random() * 0.2
    };
    ctx.shootingStarsGroup.add(starGroup);
    ctx.shootingStars.push(starGroup);
}

function updateShootingStar(star, delta) {
    const data = star.userData;
    data.elapsed += delta;
    data.life = 1 - data.elapsed / data.lifespan;
    if (data.position.y < -200) {
        data.life -= delta * 2;
    }
    if (data.life <= 0) {
        return;
    }
    const driftFactor = Math.min(data.elapsed / data.lifespan, 1);
    data.position.addScaledVector(data.velocity, delta);
    data.position.addScaledVector(data.curveDrift, delta * driftFactor * 0.5);
    const trailPoints = data.trailPoints;
    for (let i = trailPoints.length - 1; i > 0; i--) {
        trailPoints[i].copy(trailPoints[i - 1]);
    }
    trailPoints[0].copy(data.position);
    updateTrailAttribute(data.trail.geometry.attributes.position, trailPoints);
    
    const intensity = Math.sin(data.life * Math.PI) * data.colorIntensity;
    data.trail.material.opacity = intensity;
}

function disposeShootingStar(star) {
    if (star.userData?.trail) {
        star.userData.trail.geometry.dispose();
        star.userData.trail.material.dispose();
    }
    if (star.parent) {
        star.parent.remove(star);
    }
}

function createInitialTrailPoints(startPos, direction, trailLength) {
    const points = [];
    const backwards = direction.clone().multiplyScalar(-trailLength / TRAIL_SEGMENTS);
    let current = startPos.clone();
    points.push(current.clone());
    for (let i = 1; i <= TRAIL_SEGMENTS; i++) {
        current = current.clone().add(backwards);
        points.push(current.clone());
    }
    return points;
}

function populateTrailColors(buffer, headColor, tailColor) {
    const temp = new THREE.Color();
    for (let i = 0; i <= TRAIL_SEGMENTS; i++) {
        const t = i / TRAIL_SEGMENTS;
        temp.copy(headColor).lerp(tailColor, t);
        const falloff = Math.pow(1 - t, 1.4);
        buffer[i * 3] = temp.r * falloff;
        buffer[i * 3 + 1] = temp.g * falloff;
        buffer[i * 3 + 2] = temp.b * falloff;
    }
}

function updateTrailAttribute(attribute, points) {
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        attribute.setXYZ(i, point.x, point.y, point.z);
    }
    attribute.needsUpdate = true;
}



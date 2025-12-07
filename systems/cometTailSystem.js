import * as THREE from '../three.module.js';

const PARTICLE_COUNT = 1400;
const BASE_LENGTH = 5200;
const BASE_RADIUS = 620;

export function createCometTailSystem(ctx) {
    const group = new THREE.Group();
    group.visible = false;
    ctx.scene.add(group);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 14,
        transparent: true,
        opacity: 0.8,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    group.add(points);

    populateTail(points, { intensity: 1, tint: '#b7f0ff' });

    const state = {
        enabled: false,
        intensity: 1,
        tint: '#b7f0ff'
    };

    return {
        setEnabled(enabled = true, params = {}) {
            state.enabled = !!enabled;
            group.visible = state.enabled;
            if (params.intensity !== undefined) {
                state.intensity = params.intensity;
            }
            if (params.tint) {
                state.tint = params.tint;
            }
            if (state.enabled) {
                populateTail(points, state);
            }
        },
        setIntensity(intensity = 1) {
            state.intensity = intensity;
            if (state.enabled) {
                populateTail(points, state);
            }
        },
        setTint(tint) {
            state.tint = tint || state.tint;
            if (state.enabled) {
                populateTail(points, state);
            }
        },
        update(_, delta) {
            if (!state.enabled) return;
            group.rotation.y += delta * 0.01;
        }
    };
}

function populateTail(points, { intensity = 1, tint = '#b7f0ff' } = {}) {
    const positions = points.geometry.attributes.position.array;
    const colors = points.geometry.attributes.color.array;
    const color = new THREE.Color(tint);
    const length = BASE_LENGTH * (0.75 + intensity * 0.75);
    const radius = BASE_RADIUS * (0.5 + intensity * 0.6);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const t = Math.random();
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius * (1 - t * 0.5);
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        const z = -t * length;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const fade = Math.pow(1 - t, 1.6) * (0.7 + 0.3 * Math.random());
        colors[i * 3] = color.r * fade;
        colors[i * 3 + 1] = color.g * fade;
        colors[i * 3 + 2] = color.b * fade;
    }

    points.geometry.attributes.position.needsUpdate = true;
    points.geometry.attributes.color.needsUpdate = true;
}

import * as THREE from '../three.module.js';

const MAX_METEORS = 120;
const BASE_COOLDOWN = 1.4;
const SKY_RADIUS = 3200;

export function createMeteorShowerSystem(ctx) {
    const group = new THREE.Group();
    group.visible = false;
    ctx.scene.add(group);

    const meteors = [];
    let cooldown = BASE_COOLDOWN;
    let intensity = 0;

    function spawnMeteor() {
        if (meteors.length >= MAX_METEORS) return;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.45;
        const radius = SKY_RADIUS;
        const startPos = new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
        startPos.y = Math.abs(startPos.y) + 500;

        const direction = new THREE.Vector3(
            -Math.cos(theta) + THREE.MathUtils.randFloatSpread(0.25),
            -0.9 - Math.random() * 0.25,
            -Math.sin(theta) + THREE.MathUtils.randFloatSpread(0.25)
        ).normalize();
        const speed = 2800 + Math.random() * 2200;
        const lifespan = 0.8 + Math.random() * 0.6;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -120], 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(createColorArray(), 3));
        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.9
        });

        const line = new THREE.Line(geometry, material);
        line.userData = {
            position: startPos.clone(),
            velocity: direction.multiplyScalar(speed),
            life: lifespan,
            elapsed: 0
        };
        updateGeometry(line, startPos, direction);
        meteors.push(line);
        group.add(line);
    }

    function removeMeteor(line) {
        line.geometry.dispose();
        line.material.dispose();
        if (line.parent) {
            line.parent.remove(line);
        }
    }

    return {
        setIntensity(value = 0) {
            intensity = Math.max(0, Math.min(1.5, value));
            group.visible = intensity > 0;
        },
        update(_, delta = 0.016) {
            if (intensity <= 0) return;
            cooldown -= delta * (1 + intensity * 4);
            if (cooldown <= 0) {
                spawnMeteor();
                const burst = intensity > 0.8 ? Math.random() < 0.35 : Math.random() < 0.08;
                cooldown = BASE_COOLDOWN * (0.45 + (1 - intensity) * 0.6) * (burst ? 0.4 : 1);
            }

            for (let i = meteors.length - 1; i >= 0; i--) {
                const meteor = meteors[i];
                const data = meteor.userData;
                data.elapsed += delta;
                data.life -= delta;
                data.position.addScaledVector(data.velocity, delta);
                updateGeometry(meteor, data.position, data.velocity.clone().normalize());
                meteor.material.opacity = Math.max(0, Math.min(1, data.life / 0.5));
                if (data.life <= 0 || data.position.y < -300) {
                    removeMeteor(meteor);
                    meteors.splice(i, 1);
                }
            }
        }
    };
}

function createColorArray() {
    const head = new THREE.Color().setHSL(0.1 + Math.random() * 0.05, 0.8, 0.8);
    const tail = head.clone().offsetHSL(0.08, -0.2, -0.3);
    return [head.r, head.g, head.b, tail.r, tail.g, tail.b];
}

function updateGeometry(line, position, direction) {
    const positions = line.geometry.attributes.position.array;
    const trail = direction.clone().multiplyScalar(-160 - Math.random() * 140);
    positions[0] = position.x;
    positions[1] = position.y;
    positions[2] = position.z;
    positions[3] = position.x + trail.x;
    positions[4] = position.y + trail.y;
    positions[5] = position.z + trail.z;
    line.geometry.attributes.position.needsUpdate = true;
}

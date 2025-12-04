import * as THREE from 'three';

/**
 * Builds the night-sky gradients, horizon ring, horizon lights, and compass labels.
 * Returns an object exposing an update hook for animated uniforms.
 */
export function createSkyEnvironment(ctx) {
    createSkyGradient(ctx);
    return {
        update(time) {
            if (ctx.horizonRingMaterial) {
                ctx.horizonRingMaterial.uniforms.time.value = time;
            }
        }
    };
}

function createSkyGradient(ctx) {
    const skyGeometry = new THREE.SphereGeometry(10000, 64, 64);
    const vertexShader = `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    const fragmentShader = `
        varying vec3 vWorldPosition;
        void main() {
            float h = normalize(vWorldPosition).y;
            vec3 ground = vec3(0.01, 0.01, 0.02);
            vec3 horizonGlow = vec3(0.08, 0.04, 0.12);
            vec3 lowSky = vec3(0.02, 0.02, 0.06);
            vec3 nightSky = vec3(0.0, 0.0, 0.02);
            vec3 zenith = vec3(0.0, 0.0, 0.0);
            vec3 color;
            if (h < 0.0) {
                color = mix(ground, horizonGlow, smoothstep(-0.3, 0.0, h));
            } else {
                color = mix(horizonGlow, lowSky, smoothstep(0.0, 0.15, h));
                color = mix(color, nightSky, smoothstep(0.1, 0.4, h));
                color = mix(color, zenith, smoothstep(0.5, 1.0, h));
            }
            gl_FragColor = vec4(color, 1.0);
        }
    `;
    const skyMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    ctx.scene.add(sky);
    createHorizonRing(ctx);
}

function createHorizonRing(ctx) {
    const ringGeometry = new THREE.TorusGeometry(9000, 30, 16, 128);
    ctx.horizonRingMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            uniform float time;
            void main() {
                vec3 color1 = vec3(0.15, 0.05, 0.1);
                vec3 color2 = vec3(0.12, 0.06, 0.16);
                vec3 color = mix(color1, color2, vUv.x);
                float wave = sin(time * 0.35 + vUv.x * 6.2831) * 0.05;
                float alpha = 0.32 + wave;
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeometry, ctx.horizonRingMaterial);
    ring.rotation.x = Math.PI / 2;
    ctx.scene.add(ring);

    const linePoints = [];
    const segments = 256;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        linePoints.push(new THREE.Vector3(
            Math.cos(angle) * 8500,
            0,
            Math.sin(angle) * 8500
        ));
    }
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x8866aa,
        transparent: true,
        opacity: 0.5
    });
    const horizonLine = new THREE.Line(lineGeometry, lineMaterial);
    ctx.scene.add(horizonLine);

    createHorizonLights(ctx);
    createCompassPoints(ctx, 8500);
}

function createHorizonLights(ctx) {
    const count = 200;
    const positions = [];
    const colors = [];
    const sizes = [];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 8000 + Math.random() * 500;
        const height = (Math.random() - 0.5) * 100;
        positions.push(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );
        const warmth = Math.random();
        colors.push(
            0.8 + warmth * 0.2,
            0.5 + warmth * 0.3,
            0.3 + (1 - warmth) * 0.4
        );
        sizes.push(5 + Math.random() * 15);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    const vertexShader = `
        attribute float size;
        varying vec3 vColor;
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `;
    const fragmentShader = `
        varying vec3 vColor;
        void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float alpha = 0.3 * exp(-dist * 4.0);
            gl_FragColor = vec4(vColor, alpha);
        }
    `;
    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const lights = new THREE.Points(geometry, material);
    ctx.scene.add(lights);
}

function createCompassPoints(ctx, radius = 8500) {
    if (ctx.compassGroup) {
        ctx.scene.remove(ctx.compassGroup);
    }
    ctx.compassGroup = new THREE.Group();
    const markers = [
        { label: 'N', angle: 0, color: 0x9fc7ff },
        { label: 'E', angle: Math.PI / 2, color: 0xb0ffd4 },
        { label: 'S', angle: Math.PI, color: 0xffcde0 },
        { label: 'W', angle: Math.PI * 1.5, color: 0xd2e3ff }
    ];
    markers.forEach(marker => {
        const sprite = createLabelSprite(marker.label, marker.color);
        const x = Math.cos(marker.angle) * radius;
        const z = Math.sin(marker.angle) * radius;
        sprite.position.set(x, 40, z);
        ctx.compassGroup.add(sprite);
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, 0, z),
            new THREE.Vector3(x, 120, z)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: marker.color,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending
        });
        ctx.compassGroup.add(new THREE.Line(lineGeometry, lineMaterial));
    });
    ctx.scene.add(ctx.compassGroup);
}

function createLabelSprite(text, color = 0xb7d4ff) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return new THREE.Sprite();
    ctx2d.clearRect(0, 0, size, size);
    ctx2d.font = '700 110px "Space Grotesk", "Zen Kaku Gothic New", sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx2d.lineWidth = 6;
    ctx2d.shadowColor = 'rgba(120, 180, 255, 0.85)';
    ctx2d.shadowBlur = 32;
    ctx2d.strokeText(text, size / 2, size / 2 + 8);
    ctx2d.fillText(text, size / 2, size / 2 + 8);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        color: new THREE.Color(color)
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(200, 200, 1);
    return sprite;
}

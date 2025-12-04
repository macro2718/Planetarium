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
            
            // 地平線付近（明るめの濃紺〜紫）
            vec3 horizonGlow = vec3(0.12, 0.08, 0.18);
            // 地平線少し上（やや暗い藍色）
            vec3 lowSky = vec3(0.04, 0.03, 0.10);
            // 中間の夜空（暗い紺）
            vec3 midSky = vec3(0.015, 0.012, 0.04);
            // 天頂付近（ほぼ真っ暗）
            vec3 zenith = vec3(0.002, 0.002, 0.008);
            // 地面（暗い）
            vec3 ground = vec3(0.01, 0.01, 0.015);
            
            vec3 color;
            if (h < 0.0) {
                // 地平線より下（地面側）
                color = mix(ground, horizonGlow, smoothstep(-0.5, 0.0, h));
            } else {
                // 地平線から天頂へのグラデーション
                // h=0（地平線）では明るく、h=1（天頂）では暗く
                float t1 = smoothstep(0.0, 0.12, h);
                float t2 = smoothstep(0.08, 0.35, h);
                float t3 = smoothstep(0.25, 0.7, h);
                
                color = mix(horizonGlow, lowSky, t1);
                color = mix(color, midSky, t2);
                color = mix(color, zenith, t3);
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

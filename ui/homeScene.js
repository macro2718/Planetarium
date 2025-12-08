import * as THREE from '../three.module.js';

export function initHomeScene() {
    const container = document.getElementById('home-three-container');
    const homeScreen = document.getElementById('home-screen');

    if (!container || !homeScreen) {
        console.warn('[homeScene] home container not found');
        return;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.setClearColor(0x02040b, 0);
    renderer.domElement.id = 'home-three-canvas';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050814, 0.007);

    const camera = new THREE.PerspectiveCamera(
        58,
        (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight),
        0.1,
        1600
    );
    camera.position.set(0, 16, 210);

    scene.add(new THREE.AmbientLight(0x89b0ff, 0.85));

    const keyLight = new THREE.PointLight(0x9fe0ff, 2.4, 980, 2.2);
    keyLight.position.set(0, 38, 168);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xf0b9ff, 1.65, 720, 2.5);
    rimLight.position.set(-90, -24, -40);
    scene.add(rimLight);

    const groundGlow = new THREE.SpotLight(0x6db8ff, 1.4, 260, Math.PI / 4, 0.65, 2);
    groundGlow.position.set(0, -6, 130);
    groundGlow.target.position.set(0, -28, 0);
    groundGlow.add(groundGlow.target);
    scene.add(groundGlow);

    const portalGroup = new THREE.Group();
    scene.add(portalGroup);

    const frame = createPortalFrame();
    portalGroup.add(frame);

    const crystal = createCrystalCore();
    portalGroup.add(crystal.mesh);
    portalGroup.add(crystal.highlight);

    const aurora = createAuroraCurtain();
    portalGroup.add(aurora);

    const atmosphere = new THREE.Mesh(
        new THREE.CircleGeometry(94, 72),
        new THREE.MeshBasicMaterial({
            color: 0x78d7ff,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        })
    );
    atmosphere.rotation.x = Math.PI / 2;
    atmosphere.position.y = 6;
    portalGroup.add(atmosphere);

    const baseGlow = new THREE.Mesh(
        new THREE.CircleGeometry(180, 64),
        new THREE.MeshBasicMaterial({
            color: 0x0d1b30,
            transparent: true,
            opacity: 0.34,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        })
    );
    baseGlow.rotation.x = Math.PI / 2;
    baseGlow.position.y = -16;
    scene.add(baseGlow);

    const orbitLines = [
        createOrbitLine(50, 0x9de0ff, 0.013, 0.3),
        createOrbitLine(86, 0xf0b9ff, -0.01, -0.2),
        createOrbitLine(124, 0x5ce8c8, 0.007, 0.16)
    ];
    orbitLines.forEach((line) => portalGroup.add(line));

    const particleField = createStarField(1500, 520);
    scene.add(particleField);

    const sparkField = createSparkField(120, 90);
    portalGroup.add(sparkField);

    const guideLights = createGuideLights();
    scene.add(guideLights);

    const pathGlow = createPathGlow();
    scene.add(pathGlow);

    const floorGrid = createFloorGrid();
    scene.add(floorGrid);

    const clock = new THREE.Clock();

    const animate = () => {
        requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();
        const visible = !homeScreen.classList.contains('hidden');

        renderer.domElement.style.opacity = visible ? '0.95' : '0';
        if (!visible) return;

        atmosphere.material.opacity = 0.08 + Math.sin(elapsed * 0.9) * 0.06;

        crystal.mesh.rotation.x += 0.004;
        crystal.mesh.rotation.y -= 0.0036;
        crystal.mesh.position.y = 4 + Math.sin(elapsed * 1.2) * 2.2;
        crystal.highlight.material.opacity = 0.28 + Math.sin(elapsed * 1.1) * 0.12;

        frame.rotation.y = Math.sin(elapsed * 0.12) * 0.12;
        frame.children.forEach((child, idx) => {
            child.material.opacity = 0.25 + Math.sin(elapsed * 0.7 + idx) * 0.12;
        });

        aurora.material.opacity = 0.26 + Math.sin(elapsed * 0.5) * 0.16;
        aurora.rotation.y = Math.sin(elapsed * 0.18) * 0.2;

        pathGlow.material.opacity = 0.18 + Math.sin(elapsed * 0.8) * 0.06;

        orbitLines.forEach((line, idx) => {
            line.rotation.z += line.userData.speed;
            line.material.opacity = 0.22 + Math.sin(elapsed * 0.8 + idx) * 0.1;
        });

        sparkField.rotation.y -= 0.0012;
        sparkField.material.size = 2 + Math.sin(elapsed * 1.6) * 0.7;

        particleField.rotation.y += 0.0004;
        particleField.rotation.x = Math.sin(elapsed * 0.05) * 0.08;

        guideLights.rotation.y = Math.sin(elapsed * 0.2) * 0.04;
        guideLights.children.forEach((light, idx) => {
            if (light.isLight) {
                light.intensity = 1.5 + Math.sin(elapsed * 1.4 + idx) * 0.4;
            }
        });

        renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
        const { clientWidth, clientHeight } = container;
        renderer.setSize(clientWidth || window.innerWidth, clientHeight || window.innerHeight);
        camera.aspect = (clientWidth || window.innerWidth) / Math.max(1, clientHeight || window.innerHeight);
        camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);
    resize();
}

function createPortalFrame() {
    const group = new THREE.Group();

    const outer = new THREE.TorusGeometry(76, 1.5, 48, 180);
    const inner = new THREE.TorusGeometry(48, 1.1, 48, 160);
    const materialA = new THREE.MeshBasicMaterial({
        color: 0x9fe0ff,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const materialB = new THREE.MeshBasicMaterial({
        color: 0xf0b9ff,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const outerRing = new THREE.Mesh(outer, materialA.clone());
    outerRing.rotation.x = Math.PI / 2;
    outerRing.scale.set(1.1, 1.2, 1.1);
    group.add(outerRing);

    const innerRing = new THREE.Mesh(inner, materialB.clone());
    innerRing.rotation.x = Math.PI / 2;
    innerRing.rotation.z = Math.PI / 6;
    group.add(innerRing);

    const verticalArc = new THREE.RingGeometry(32, 40, 120, 1, Math.PI * 0.28, Math.PI * 1.44);
    const arcMesh = new THREE.Mesh(
        verticalArc,
        new THREE.MeshBasicMaterial({
            color: 0x7ad6ff,
            transparent: true,
            opacity: 0.18,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    arcMesh.rotation.y = Math.PI / 2;
    arcMesh.position.set(0, 14, 0);
    group.add(arcMesh);

    return group;
}

function createCrystalCore() {
    const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(16, 1),
        new THREE.MeshStandardMaterial({
            color: 0xaad8ff,
            emissive: 0x447bcf,
            emissiveIntensity: 0.35,
            metalness: 0.65,
            roughness: 0.25,
            transparent: true,
            opacity: 0.55
        })
    );

    const highlight = new THREE.Mesh(
        new THREE.SphereGeometry(18, 32, 32),
        new THREE.MeshBasicMaterial({
            color: 0x9fe0ff,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );

    return { mesh, highlight };
}

function createAuroraCurtain() {
    const geometry = new THREE.PlaneGeometry(220, 140, 40, 40);
    const colors = [];
    const top = new THREE.Color(0x9fe0ff);
    const mid = new THREE.Color(0xf0b9ff);
    const bottom = new THREE.Color(0x0d1022);

    const position = geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
        const y = position.getY(i) / 140 + 0.5;
        const mix = bottom.clone().lerp(mid, y * 0.6).lerp(top, y * 0.4);
        colors.push(mix.r, mix.g, mix.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 40, -26);
    mesh.rotation.y = Math.PI / 10;
    mesh.rotation.x = Math.PI / 64;
    mesh.scale.set(0.9, 1.05, 1);
    return mesh;
}

function createOrbitLine(radius, color, speed = 0.01, tilt = 0) {
    const segments = 160;
    const positions = new Float32Array(segments * 3);

    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        positions[i * 3] = Math.cos(theta) * radius;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = Math.sin(theta) * radius;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const line = new THREE.LineLoop(geometry, material);
    line.rotation.x = tilt;
    line.userData.speed = speed;
    return line;
}

function createStarField(count, radius) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const colorA = new THREE.Color(0x9fe0ff);
    const colorB = new THREE.Color(0xf0b9ff);

    for (let i = 0; i < count; i++) {
        const r = Math.random() * radius;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const idx = i * 3;

        positions[idx] = r * Math.sin(phi) * Math.cos(theta);
        positions[idx + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.45;
        positions[idx + 2] = r * Math.cos(phi);

        const mixed = colorA.clone().lerp(colorB, Math.random());
        colors[idx] = mixed.r;
        colors[idx + 1] = mixed.g;
        colors[idx + 2] = mixed.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 2.2,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.7,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    points.position.z = -80;
    return points;
}

function createSparkField(count, spread) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color(0xffffff);

    for (let i = 0; i < count; i++) {
        const idx = i * 3;
        positions[idx] = (Math.random() - 0.5) * spread;
        positions[idx + 1] = (Math.random() - 0.2) * (spread * 0.6);
        positions[idx + 2] = (Math.random() - 0.5) * (spread * 0.6);

        const brightness = 0.7 + Math.random() * 0.3;
        colors[idx] = color.r * brightness;
        colors[idx + 1] = color.g * brightness;
        colors[idx + 2] = color.b * brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 2.4,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.95,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    points.position.y = 4;
    return points;
}

function createGuideLights() {
    const group = new THREE.Group();

    const positions = [
        [-60, -8, 120],
        [60, -8, 120],
        [-90, -10, 60],
        [90, -10, 60]
    ];

    positions.forEach(([x, y, z]) => {
        const light = new THREE.SpotLight(0x9fe0ff, 1.8, 220, Math.PI / 3, 0.35, 1.8);
        light.position.set(x, y, z);
        light.target.position.set(0, -16, 0);
        light.add(light.target);
        group.add(light);
    });

    return group;
}

function createPathGlow() {
    const geometry = new THREE.PlaneGeometry(140, 360, 1, 1);
    const material = new THREE.MeshBasicMaterial({
        color: 0x9fe0ff,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, -16, 90);
    mesh.scale.set(0.6, 1, 1);
    return mesh;
}

function createFloorGrid() {
    const grid = new THREE.GridHelper(420, 42, 0x9fe0ff, 0x2b3d65);
    grid.rotation.x = Math.PI / 2;
    grid.position.set(0, -16, 90);
    const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
    materials.forEach((mat) => {
        mat.transparent = true;
        mat.opacity = 0.16;
        mat.depthWrite = false;
    });
    return grid;
}

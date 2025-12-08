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
    renderer.domElement.id = 'home-three-canvas';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050814, 0.009);

    const camera = new THREE.PerspectiveCamera(
        55,
        (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight),
        0.1,
        1600
    );
    camera.position.set(0, 8, 220);

    scene.add(new THREE.AmbientLight(0x89b0ff, 0.7));

    const keyLight = new THREE.PointLight(0x9fe0ff, 2.8, 950, 2.2);
    keyLight.position.set(0, 40, 160);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xf0b9ff, 1.5, 640, 2.5);
    rimLight.position.set(-90, -30, -40);
    scene.add(rimLight);

    const portalGroup = new THREE.Group();
    scene.add(portalGroup);

    const halo = new THREE.Mesh(
        new THREE.RingGeometry(30, 38, 80),
        new THREE.MeshBasicMaterial({
            color: 0x9fe0ff,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    halo.rotation.x = Math.PI / 2;
    portalGroup.add(halo);

    const innerHalo = new THREE.Mesh(
        new THREE.RingGeometry(16, 24, 80),
        new THREE.MeshBasicMaterial({
            color: 0xf0b9ff,
            transparent: true,
            opacity: 0.32,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    innerHalo.rotation.x = Math.PI / 2;
    innerHalo.rotation.z = Math.PI / 6;
    portalGroup.add(innerHalo);

    const crystal = new THREE.Mesh(
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
    portalGroup.add(crystal);

    const atmosphere = new THREE.Mesh(
        new THREE.CircleGeometry(78, 72),
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
        new THREE.CircleGeometry(140, 48),
        new THREE.MeshBasicMaterial({
            color: 0x122138,
            transparent: true,
            opacity: 0.28,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        })
    );
    baseGlow.rotation.x = Math.PI / 2;
    baseGlow.position.y = -12;
    scene.add(baseGlow);

    const orbitLines = [
        createOrbitLine(46, 0x9de0ff, 0.015, 0.32),
        createOrbitLine(74, 0xf0b9ff, -0.01, -0.25),
        createOrbitLine(104, 0x5ce8c8, 0.006, 0.18)
    ];
    orbitLines.forEach((line) => portalGroup.add(line));

    const particleField = createStarField(1200, 480);
    scene.add(particleField);

    const sparkField = createSparkField(120, 90);
    portalGroup.add(sparkField);

    const clock = new THREE.Clock();

    const animate = () => {
        requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();
        const visible = !homeScreen.classList.contains('hidden');

        renderer.domElement.style.opacity = visible ? '0.95' : '0';
        if (!visible) return;

        halo.material.opacity = 0.26 + Math.sin(elapsed * 0.8) * 0.14;
        innerHalo.material.opacity = 0.2 + Math.cos(elapsed * 0.6) * 0.12;
        atmosphere.material.opacity = 0.08 + Math.sin(elapsed * 0.9) * 0.06;

        crystal.rotation.x += 0.005;
        crystal.rotation.y -= 0.004;

        orbitLines.forEach((line, idx) => {
            line.rotation.z += line.userData.speed;
            line.material.opacity = 0.22 + Math.sin(elapsed * 0.8 + idx) * 0.1;
        });

        particleField.rotation.y += 0.0004;
        particleField.rotation.x = Math.sin(elapsed * 0.05) * 0.08;

        sparkField.rotation.y -= 0.0012;
        sparkField.material.size = 2.1 + Math.sin(elapsed * 1.6) * 0.7;

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

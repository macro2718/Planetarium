import * as THREE from '../three.module.js';
import { destroyAllPlanetaria, resetPlanetariumBgm } from './planetariumContext.js';
import { findConstellationTale } from '../data/constellationTales.js';
import { BASE_CONSTELLATION_DATA } from '../data/constellations.js';
import { playModeSelectionBgm } from './bgmController.js';

const STORAGE_KEY = 'celestial-library-unlocked-v1';
const SHADOW_CAMERA_BASE = {
    near: 1,
    far: 70,
    halfWidth: 26,
    top: 22,
    bottom: -6
};
let unlockedConstellations = new Set();
let detailView = null;
let shelfScene = null;

const FALLBACK_STORY = '物語の断片はまだ集めているところです。星空で出会ったときの余韻を、そのままここに置いておきましょう。';
const FALLBACK_OBSERVATION = '星図を広げ、実際の夜空で形をなぞると新しい発見があります。';

const CONSTELLATION_DESCRIPTION_MAP = new Map(
    BASE_CONSTELLATION_DATA.map((entry) => [normalizeConstellationName(entry.name), entry])
);

function getRegisteredConstellationCount() {
    const baseCount = Array.isArray(BASE_CONSTELLATION_DATA) ? BASE_CONSTELLATION_DATA.length : 0;
    return Math.max(baseCount, CONSTELLATION_DESCRIPTION_MAP?.size || 0);
}

function prepareLibraryMode() {
    resetPlanetariumBgm();
    destroyAllPlanetaria();
    hideLibraryDetailScreen();
}

export function initCelestialLibrary() {
    unlockedConstellations = loadUnlockedConstellations();
    setupGatewayScreen();
    setupBackButton();
    setupDetailScreen();
    setupShelfScene();
    renderLibraryList();
}

export function showLibraryGatewayScreen() {
    const gatewayScreen = document.getElementById('library-gateway-screen');
    const homeScreen = document.getElementById('home-screen');
    const modeScreen = document.getElementById('mode-screen');
    prepareLibraryMode();
    hideCelestialLibraryScreen();
    playModeSelectionBgm();
    if (gatewayScreen) {
        gatewayScreen.classList.remove('hidden');
    }
    if (homeScreen) {
        homeScreen.classList.add('hidden');
    }
    if (modeScreen) {
        modeScreen.classList.add('hidden');
    }
    document.body.classList.remove('home-visible');
    document.body.classList.remove('mode-screen-visible');
}

export function hideLibraryGatewayScreen() {
    const gatewayScreen = document.getElementById('library-gateway-screen');
    if (gatewayScreen) {
        gatewayScreen.classList.add('hidden');
    }
}

export function showCelestialLibraryScreen() {
    const libraryScreen = document.getElementById('library-screen');
    const homeScreen = document.getElementById('home-screen');
    prepareLibraryMode();
    hideLibraryGatewayScreen();
    playModeSelectionBgm();
    if (libraryScreen) {
        libraryScreen.classList.remove('hidden');
    }
    if (homeScreen) {
        homeScreen.classList.add('hidden');
    }
    document.body.classList.remove('home-visible');
    renderLibraryList();
    resizeShelfScene();
}

export function hideCelestialLibraryScreen() {
    const libraryScreen = document.getElementById('library-screen');
    if (libraryScreen) {
        libraryScreen.classList.add('hidden');
    }
    hideLibraryDetailScreen();
}

export function unlockConstellation(constellationName) {
    const normalized = normalizeConstellationName(constellationName);
    if (!normalized) return;
    if (normalized === '星図外') return;
    if (unlockedConstellations.has(normalized)) return;

    unlockedConstellations.add(normalized);
    saveUnlockedConstellations();
    renderLibraryList();
}

function normalizeConstellationName(name) {
    if (!name) return '';
    return String(name).trim().replace(/\s+/g, ' ');
}

function formatConstellationCode(id) {
    if (!id) return '';
    return String(id)
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_\s]+/g, ' ')
        .trim()
        .toUpperCase();
}

function loadUnlockedConstellations() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return new Set();
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
            return new Set(parsed.map(normalizeConstellationName).filter(Boolean));
        }
    } catch (error) {
        console.warn('[celestialLibrary] Failed to load saved constellations', error);
    }
    return new Set();
}

function saveUnlockedConstellations() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(unlockedConstellations)));
    } catch (error) {
        console.warn('[celestialLibrary] Failed to save constellations', error);
    }
}

function hideLibraryDetailScreen() {
    const detailScreen = document.getElementById('library-detail-screen');
    if (detailScreen) {
        detailScreen.classList.add('hidden');
    }
}

function setupGatewayScreen() {
    const enterBtn = document.getElementById('library-enter-shelf');
    if (enterBtn) {
        enterBtn.addEventListener('click', () => {
            showCelestialLibraryScreen();
        });
    }

    const backBtn = document.getElementById('library-gateway-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            hideLibraryGatewayScreen();
            showModeScreen();
        });
    }
}

function setupBackButton() {
    const backBtn = document.getElementById('library-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showLibraryGatewayScreen();
        });
    }
}

function renderLibraryList() {
    const count = document.getElementById('library-count');
    const libraryScreen = document.getElementById('library-screen');
    const detailScreen = document.getElementById('library-detail-screen');

    const names = Array.from(unlockedConstellations).sort((a, b) => a.localeCompare(b, 'ja'));
    const contents = names.map(buildConstellationContent);

    if (count) {
        count.textContent = names.length;
    }

    if (!contents.length) {
        if (detailScreen) detailScreen.classList.add('hidden');
        if (libraryScreen) libraryScreen.classList.remove('hidden');
        updateShelfBooks([]);
        toggleEmptyState(true);
        return;
    }

    toggleEmptyState(false);
    updateShelfBooks(contents);
}

function toggleEmptyState(isEmpty) {
    const empty = document.getElementById('library-empty');
    if (empty) {
        empty.classList.toggle('hidden', !isEmpty);
    }
}

function showModeScreen() {
    const modeScreen = document.getElementById('mode-screen');
    const homeScreen = document.getElementById('home-screen');
    if (modeScreen) {
        modeScreen.classList.remove('hidden');
    }
    if (homeScreen) {
        homeScreen.classList.remove('hidden');
    }
    playModeSelectionBgm();
    document.body.classList.add('mode-screen-visible');
    document.body.classList.add('home-visible');
}

function buildConstellationContent(name) {
    const normalized = normalizeConstellationName(name);
    const tale = findConstellationTale(name) || findConstellationTale(normalized);
    const base = CONSTELLATION_DESCRIPTION_MAP.get(normalized);
    const canonicalName = tale?.name || base?.name || name;
    return {
        name: canonicalName,
        season: tale?.season || '',
        keywords: tale?.keywords || [],
        lede: tale?.lede || base?.description || '星空で出会った記憶が本棚に収まりました。',
        story: tale?.story || FALLBACK_STORY,
        observation: tale?.observation || FALLBACK_OBSERVATION,
        brightStars: tale?.brightStars || '',
        spineLabel: canonicalName,
        spineCode: formatConstellationCode(base?.id || normalized)
    };
}

function setupShelfScene() {
    if (shelfScene) return shelfScene;
    const container = document.getElementById('library-three-container');
    const screen = document.getElementById('library-screen');
    if (!container || !screen) return null;

    // Allow CSS background to show through while keeping normal blend mode for the canvas.
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.id = 'library-three-canvas';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x22150d, 0.0075);

    const camera = new THREE.PerspectiveCamera(
        40,
        (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight),
        0.1,
        260
    );
    camera.position.set(-4.5, 7.5, 28);
    camera.lookAt(new THREE.Vector3(0, 4, 0));

    scene.add(new THREE.AmbientLight(0xfff1e0, 0.48));

    const keyLight = new THREE.SpotLight(0xffd2a6, 2.55, 130, Math.PI / 4, 0.42, 2);
    keyLight.position.set(12, 18, 22);
    keyLight.target.position.set(-2, 4, 0);
    keyLight.add(keyLight.target);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(4096, 4096);
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.01;
    keyLight.shadow.radius = 4;
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xffe9c8, 1.1, 140, 2.2);
    rimLight.position.set(-16, 12, -10);
    scene.add(rimLight);

    const bounceLight = new THREE.PointLight(0x9ed5ff, 0.82, 110, 2.8);
    bounceLight.position.set(-18, 6, 12);
    scene.add(bounceLight);

    // Strong top-down shadow light to clearly drop book silhouettes on the shelf.
    const shadowLight = new THREE.DirectionalLight(0xf8dab4, 3.65);
    shadowLight.position.set(6, 16, 9);
    shadowLight.target.position.set(0, 3.4, -1.2);
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.set(4096, 4096);
    shadowLight.shadow.bias = -0.00025;
    shadowLight.shadow.normalBias = 0.02;
    shadowLight.shadow.radius = 2.5;
    shadowLight.shadow.camera.near = SHADOW_CAMERA_BASE.near;
    shadowLight.shadow.camera.far = SHADOW_CAMERA_BASE.far;
    shadowLight.shadow.camera.left = -SHADOW_CAMERA_BASE.halfWidth;
    shadowLight.shadow.camera.right = SHADOW_CAMERA_BASE.halfWidth;
    shadowLight.shadow.camera.top = SHADOW_CAMERA_BASE.top;
    shadowLight.shadow.camera.bottom = SHADOW_CAMERA_BASE.bottom;
    scene.add(shadowLight);
    scene.add(shadowLight.target);
    shadowLight.userData.baseOffsetX = shadowLight.position.x - shadowLight.target.position.x;
    shadowLight.userData.baseY = shadowLight.position.y;
    shadowLight.userData.baseZ = shadowLight.position.z;
    shadowLight.userData.targetY = shadowLight.target.position.y;
    shadowLight.userData.targetZ = shadowLight.target.position.z;

    const textureAnisotropy = renderer.capabilities?.getMaxAnisotropy
        ? renderer.capabilities.getMaxAnisotropy()
        : 4;
    const woodTextures = createWoodTextures(textureAnisotropy);
    applyWoodBackgroundTexture(screen, woodTextures.colorMap);

    // Group that moves as the user scrolls so the wall and shelf travel with the books.
    const shelfGroup = new THREE.Group();
    scene.add(shelfGroup);

    // Back wall behind the shelf for a warmer, enclosed feel that matches the shelf surface.
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: woodTextures.colorMap,
        normalMap: woodTextures.normalMap,
        color: 0x24150f,
        roughness: 0.62,
        metalness: 0.05,
        emissive: new THREE.Color(0x130c08).multiplyScalar(0.5),
        normalScale: new THREE.Vector2(0.6, 0.9),
        side: THREE.DoubleSide
    });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(220, 54), wallMaterial);
    backWall.position.set(0, 9, -12);
    backWall.receiveShadow = true;
    shelfGroup.add(backWall);

    // Lower wall panel uses the same material so the design stays consistent beneath the shelf line.
    const lowerWall = new THREE.Mesh(new THREE.PlaneGeometry(220, 46), wallMaterial);
    lowerWall.position.set(0, -28, -12.2);
    lowerWall.receiveShadow = true;
    shelfGroup.add(lowerWall);

    const shelfSurface = new THREE.Mesh(
        new THREE.BoxGeometry(160, 1.4, 12),
        new THREE.MeshStandardMaterial({
            map: woodTextures.colorMap,
            normalMap: woodTextures.normalMap,
            color: 0x4b2e1f,
            roughness: 0.5,
            metalness: 0.06,
            emissive: new THREE.Color(0x26160e).multiplyScalar(0.24),
            normalScale: new THREE.Vector2(0.8, 1.05)
        })
    );
    shelfSurface.position.y = -0.6;
    shelfSurface.position.z = -1.8;
    shelfSurface.castShadow = true;
    shelfSurface.receiveShadow = true;
    shelfGroup.add(shelfSurface);

    const shelfShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(180, 40),
        new THREE.ShadowMaterial({ color: 0x2a1a12, opacity: 0.75 })
    );
    shelfShadow.rotation.x = -Math.PI / 2;
    shelfShadow.position.set( 0, -0.1, -1.4 );
    shelfShadow.receiveShadow = true;
    shelfGroup.add(shelfShadow);

    const shelfGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(180, 36),
        new THREE.MeshBasicMaterial({
            color: 0xfff2d6,
            transparent: true,
            opacity: 0.22,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        })
    );
    shelfGlow.rotation.x = -Math.PI / 2;
    shelfGlow.position.y = -0.4;
    shelfGlow.position.z = -2;
    shelfGroup.add(shelfGlow);

    const bookGroup = new THREE.Group();
    bookGroup.position.y = 4.2;
    bookGroup.position.z = -0.8;
    shelfGroup.add(bookGroup);

    // Static fixtures that travel with the books (e.g., shelf dividers).
    const fixtureGroup = new THREE.Group();
    fixtureGroup.position.copy(bookGroup.position);
    shelfGroup.add(fixtureGroup);

    const leftDivider = createShelfDivider(woodTextures);
    leftDivider.position.set(-2.5, 0.35, -0.85);
    leftDivider.visible = false;
    fixtureGroup.add(leftDivider);

    const rightDivider = createShelfDivider(woodTextures);
    rightDivider.position.set(2.5, 0.35, -0.85);
    rightDivider.visible = false;
    fixtureGroup.add(rightDivider);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    shelfScene = {
        renderer,
        scene,
        camera,
        shelfGroup,
        bookGroup,
        fixtureGroup,
        leftDivider,
        rightDivider,
        container,
        shadowLight,
        shadowCameraBase: { ...SHADOW_CAMERA_BASE },
        shadowShelfSpan: 0,
        raycaster,
        pointer,
        hover: null,
        targetOffset: 0,
        currentOffset: 0,
        baseOffset: 0,
        maxOffset: 0,
        minOffset: 0,
        layoutMetrics: {
            leftEdge: 0,
            currentRightEdge: 0,
            finalRightEdge: 0
        },
        clock: new THREE.Clock()
    };

    let isDragging = false;
    let lastX = 0;
    let dragged = false;
    const endDrag = () => {
        isDragging = false;
        screen.classList.remove('dragging');
    };

    const handlePointerDown = (event) => {
        if (event.target.closest('.library-back-btn')) return;
        isDragging = true;
        lastX = event.clientX;
        dragged = false;
        screen.classList.add('dragging');
        const selection = window.getSelection?.();
        if (selection?.removeAllRanges) {
            selection.removeAllRanges();
        }
    };

    const handlePointerMove = (event) => {
        updatePointer(event);
        if (isDragging && event.buttons === 0) {
            // Stop dragging if the pointer release wasn't captured (e.g., pointerup on another element)
            endDrag();
        }
        if (isDragging) {
            const delta = (event.clientX - lastX) * 0.03;
            lastX = event.clientX;
            shelfScene.targetOffset = clampOffset(shelfScene.targetOffset + delta);
            if (Math.abs(delta) > 0.0001) {
                dragged = true;
            }
        }
        updateHover();
    };

    const handlePointerUp = () => {
        endDrag();
    };

    const handleClick = (event) => {
        if (event.target.closest('.library-back-btn')) return;
        if (dragged) return;
        if (shelfScene.hover?.userData?.content) {
            handleBookSelect(shelfScene.hover.userData.content, true);
        }
    };

    screen.addEventListener('pointerdown', handlePointerDown);
    screen.addEventListener('pointermove', handlePointerMove);
    screen.addEventListener('pointerup', handlePointerUp);
    screen.addEventListener('pointerleave', handlePointerUp);
    screen.addEventListener('pointercancel', handlePointerUp);
    screen.addEventListener('click', handleClick);

    const resize = () => resizeShelfScene();
    window.addEventListener('resize', resize);

    const animate = () => {
        requestAnimationFrame(animate);
        const visible = !screen.classList.contains('hidden');
        renderer.domElement.style.opacity = visible ? '1' : '0';
        if (!visible) return;

        const elapsed = shelfScene.clock.getElapsedTime();
        shelfScene.currentOffset += (shelfScene.targetOffset - shelfScene.currentOffset) * 0.08;
        const offset = shelfScene.baseOffset + shelfScene.currentOffset;
        shelfGroup.position.x = offset;
        updateShadowCameraBounds();

        bookGroup.children.forEach((book, idx) => {
            const baseRotation = book.userData?.baseRotation;
            const bob = Math.sin(elapsed * 0.65 + idx * 0.35) * 0.035;
            const hoverLift = shelfScene.hover === book ? 0.06 : 0;
            book.position.y = 0.2 + bob + hoverLift;
            if (baseRotation) {
                book.rotation.set(
                    baseRotation.x,
                    baseRotation.y + Math.sin(elapsed * 0.3 + idx) * 0.005,
                    baseRotation.z
                );
            }
        });

        shelfGlow.material.opacity = 0.18 + Math.sin(elapsed * 0.45) * 0.06;
        renderer.render(scene, camera);
    };
    animate();

    resize();
    return shelfScene;
}

function resizeShelfScene() {
    if (!shelfScene) return;
    const { renderer, camera, container } = shelfScene;
    const { clientWidth, clientHeight } = container;
    renderer.setSize(clientWidth || window.innerWidth, clientHeight || window.innerHeight);
    camera.aspect = (clientWidth || window.innerWidth) / Math.max(1, clientHeight || window.innerHeight);
    camera.updateProjectionMatrix();
    updateOffsetBounds();
}

function clampOffset(value) {
    if (!shelfScene) return 0;
    const min = Number.isFinite(shelfScene.minOffset) ? shelfScene.minOffset : 0;
    const max = Number.isFinite(shelfScene.maxOffset) ? shelfScene.maxOffset : 0;
    if (min > max) {
        return (min + max) / 2;
    }
    return THREE.MathUtils.clamp(value, min, max);
}

function getShelfHalfViewWidth() {
    if (!shelfScene?.camera) return 0;
    const { camera, container, shelfGroup } = shelfScene;
    if (!camera.isPerspectiveCamera) return 0;

    const aspect =
        container?.clientWidth && container?.clientHeight
            ? container.clientWidth / Math.max(1, container.clientHeight)
            : camera.aspect;

    const shelfPosition = new THREE.Vector3();
    shelfGroup?.getWorldPosition?.(shelfPosition);
    const distance = Math.max(0.1, camera.position.distanceTo(shelfPosition));
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance;
    return halfHeight * aspect;
}

function updateOffsetBounds() {
    if (!shelfScene) return;
    const hasBooks = (shelfScene.bookGroup?.children || []).length > 0;
    if (!hasBooks) {
        shelfScene.minOffset = 0;
        shelfScene.maxOffset = 0;
        shelfScene.targetOffset = 0;
        shelfScene.currentOffset = 0;
        return;
    }

    const leftMetrics = shelfScene.leftDivider?.userData?.metrics || { width: 0.62 };
    const rightMetrics = shelfScene.rightDivider?.userData?.metrics || { width: 0.62 };

    const leftEdge = shelfScene.leftDivider?.visible
        ? shelfScene.leftDivider.position.x - (leftMetrics.width || 0) / 2
        : shelfScene.layoutMetrics.leftEdge || 0;
    const visibleRightEdge = shelfScene.layoutMetrics.currentRightEdge || 0;
    const finalRightEdge = shelfScene.rightDivider?.visible
        ? shelfScene.rightDivider.position.x + (rightMetrics.width || 0) / 2
        : shelfScene.layoutMetrics.finalRightEdge || visibleRightEdge;

    const halfViewWidth = getShelfHalfViewWidth();
    const overscrollRight = 1.8; // slight cushion so drag doesn't feel hard-stopped
    const overscrollLeft = 2.6; // stronger cushion to shorten left travel
    const extraPanRight = Math.max(halfViewWidth * 0.15, 1.8); // allow a bit more travel past dividers (right)
    const extraPanLeft = Math.max(halfViewWidth * 0.22, 2.4);
    const minOffset = -halfViewWidth - shelfScene.baseOffset - leftEdge + overscrollLeft + extraPanLeft;
    const maxOffsetVisible = halfViewWidth - shelfScene.baseOffset - visibleRightEdge - overscrollRight - extraPanRight;
    const maxOffsetFuture = halfViewWidth - shelfScene.baseOffset - finalRightEdge - overscrollLeft - extraPanLeft;

    shelfScene.minOffset = Math.min(minOffset, maxOffsetFuture);
    shelfScene.maxOffset = Math.max(minOffset, maxOffsetVisible);
    shelfScene.targetOffset = clampOffset(shelfScene.targetOffset);
    shelfScene.currentOffset = clampOffset(shelfScene.currentOffset);
}

function updateShadowCameraBounds(shelfSpanOverride) {
    if (!shelfScene?.shadowLight) return;

    if (typeof shelfSpanOverride === 'number') {
        shelfScene.shadowShelfSpan = shelfSpanOverride;
    }

    const base = shelfScene.shadowCameraBase || SHADOW_CAMERA_BASE;
    const layout = shelfScene.layoutMetrics || {};
    const leftEdge = Number.isFinite(layout.leftEdge) ? layout.leftEdge : 0;
    const finalRightEdge = Number.isFinite(layout.finalRightEdge) ? layout.finalRightEdge : leftEdge;
    const span = Number.isFinite(shelfScene.shadowShelfSpan)
        ? shelfScene.shadowShelfSpan
        : Math.max(0, finalRightEdge - leftEdge);
    const halfSpan = Math.max(0, span / 2);
    const viewPad = Math.max(getShelfHalfViewWidth?.() || 0, 0);
    const horizontal = Math.max(base.halfWidth, halfSpan + viewPad + 8); // wider pad so dividers/deck edges stay inside
    const growth = horizontal - base.halfWidth;
    const camera = shelfScene.shadowLight.shadow.camera;
    camera.left = -horizontal;
    camera.right = horizontal;
    camera.top = base.top + growth * 0.9;
    camera.bottom = base.bottom - growth * 0.55;
    camera.near = Math.max(0.1, base.near - 0.2);
    camera.far = base.far + growth * 2.4;
    camera.updateProjectionMatrix();

    const centerLocal = (leftEdge + finalRightEdge) / 2;
    const centerX = (shelfScene.baseOffset || 0) + (shelfScene.currentOffset || 0) + centerLocal;
    const light = shelfScene.shadowLight;
    const offsetX = light.userData?.baseOffsetX ?? 0;
    light.position.x = centerX + offsetX;
    light.position.y = light.userData?.baseY ?? light.position.y;
    light.position.z = light.userData?.baseZ ?? light.position.z;
    light.target.position.x = centerX;
    light.target.position.y = light.userData?.targetY ?? light.target.position.y;
    light.target.position.z = light.userData?.targetZ ?? light.target.position.z;
    light.target.updateMatrixWorld();
}

function updateShelfBooks(contents) {
    if (!shelfScene) setupShelfScene();
    if (!shelfScene) return;

    const bookSpacing = 1.6;
    const bookWidth = 1.2;
    const bookGap = 0.18;
    const dividerPad = 1;
    const unlockedBooks = contents.length;
    const totalBooks = Math.max(unlockedBooks, 1);
    const registeredConstellations = Math.max(getRegisteredConstellationCount(), totalBooks);

    const leftDivider = shelfScene.leftDivider;
    const rightDivider = shelfScene.rightDivider;
    const hasBooks = unlockedBooks > 0;

    if (leftDivider) {
        leftDivider.visible = hasBooks;
        if (hasBooks) {
            const metrics = leftDivider.userData?.metrics || { width: 0.62 };
            leftDivider.position.x = -(bookWidth / 2 + bookGap + (metrics.width || 0) / 2 + dividerPad);
        }
    }

    if (rightDivider) {
        rightDivider.visible = hasBooks;
        if (hasBooks) {
            const metrics = rightDivider.userData?.metrics || { width: 0.62 };
            const lastBookIndex = Math.max(registeredConstellations - 1, 0);
            // Anchor the right divider just beyond the final book position when the shelf is complete.
            rightDivider.position.x =
                lastBookIndex * bookSpacing + (bookWidth / 2 + bookGap + (metrics.width || 0) / 2 + dividerPad);
        }
    }

    const group = shelfScene.bookGroup;
    while (group.children.length) {
        const child = group.children[0];
        group.remove(child);
        child.geometry?.dispose?.();
        if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
                mat.map?.dispose?.();
                mat.dispose?.();
            });
        } else {
            child.material?.map?.dispose?.();
            child.material?.dispose?.();
        }
    }

    shelfScene.hover = null;
    const totalWidth = Math.max(totalBooks - 1, 0) * bookSpacing;
    shelfScene.baseOffset = totalWidth > 0 ? -(totalWidth / 2) : 0;

    if (!contents.length) {
        shelfScene.shadowShelfSpan = 0;
        updateShadowCameraBounds(0);
        shelfScene.minOffset = 0;
        shelfScene.maxOffset = 0;
        shelfScene.targetOffset = 0;
        shelfScene.currentOffset = 0;
        return;
    }

    const anisotropy = shelfScene.renderer.capabilities?.getMaxAnisotropy
        ? shelfScene.renderer.capabilities.getMaxAnisotropy()
        : 4;

    contents.forEach((content, idx) => {
        const book = createBookMesh(content, idx, anisotropy);
        book.position.set(idx * bookSpacing, 0, (Math.random() - 0.5) * 0.35);
        group.add(book);
    });

    const leftEdge = leftDivider?.visible
        ? leftDivider.position.x - (leftDivider.userData?.metrics?.width || 0.62) / 2
        : 0;
    const currentRightEdge = hasBooks
        ? Math.max(unlockedBooks - 1, 0) * bookSpacing + (bookWidth / 2 + bookGap)
        : 0;
    const finalRightEdge = rightDivider?.visible
        ? rightDivider.position.x + (rightDivider.userData?.metrics?.width || 0.62) / 2
        : currentRightEdge;
    const shelfSpan = Math.max(finalRightEdge - leftEdge, 0);
    shelfScene.shadowShelfSpan = shelfSpan;
    shelfScene.layoutMetrics = {
        leftEdge,
        currentRightEdge,
        finalRightEdge
    };

    updateShadowCameraBounds(shelfSpan);
    updateOffsetBounds();
}

function createBookMesh(content, index, anisotropy = 4) {
    const baseColor = pickAccentColor(content.name, index);
    const coverColor = new THREE.Color(baseColor);
    coverColor.offsetHSL(0, -0.04, -0.08);
    const accentColor = new THREE.Color(baseColor);
    accentColor.offsetHSL(0.015, 0.04, 0.02);

    const geometry = new THREE.BoxGeometry(1.2, 9.4, 3.0);   // Width, Height, Depth of the book
    const spineTexture = createSpineTexture(
        content.name || content.spineLabel,
        content.spineCode || content.keywords?.[0] || '',
        baseColor,
        accentColor
    );
    spineTexture.anisotropy = anisotropy;

    const spineMaterial = new THREE.MeshStandardMaterial({
        map: spineTexture,
        roughness: 0.28,
        metalness: 0.38,
        emissive: new THREE.Color(baseColor).multiplyScalar(0.15),
        emissiveIntensity: 0.42
    });

    const coverMaterial = new THREE.MeshStandardMaterial({
        color: coverColor,
        roughness: 0.48,
        metalness: 0.24
    });

    const sideMaterial = new THREE.MeshStandardMaterial({
        color: accentColor,
        roughness: 0.5,
        metalness: 0.16
    });

    const mesh = new THREE.Mesh(
        geometry,
        [
            sideMaterial,
            sideMaterial.clone(),
            coverMaterial.clone(),
            coverMaterial.clone(),
            spineMaterial,
            coverMaterial
        ]
    );

    mesh.position.y = 0.2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
        content,
        baseRotation: {
            x: (Math.random() - 0.5) * 0.02,
            y: (Math.random() - 0.5) * 0.08,
            z: (Math.random() - 0.5) * 0.015
        }
    };
    return mesh;
}

function createShelfDivider(woodTextures) {
    const metrics = { width: 0.62, height: 11.2, depth: 5.2 };
    const dividerMaterial = new THREE.MeshStandardMaterial({
        map: woodTextures?.colorMap || null,
        normalMap: woodTextures?.normalMap || null,
        color: 0xb29070,
        roughness: 0.5,
        metalness: 0.06,
        emissive: new THREE.Color(0xc8a782).multiplyScalar(0.16),
        normalScale: new THREE.Vector2(0.8, 1.05)
    });

    const dividerGeometry = createRoundedDividerGeometry(metrics);
    const divider = new THREE.Mesh(dividerGeometry, dividerMaterial);
    divider.castShadow = true;
    divider.receiveShadow = true;
    divider.userData = { ...(divider.userData || {}), metrics };
    return divider;
}

function createRoundedDividerGeometry(metrics) {
    const width = metrics.width || 0.62;
    const height = metrics.height || 11.2;
    const depth = metrics.depth || 5.2;
    const radius = Math.min(width, height) * 0.18;
    const halfW = width / 2;
    const halfH = height / 2;
    const depthRadius = Math.min(depth * 0.10, 0.9); // deeper rounding for front/back edges

    const shape = new THREE.Shape();
    shape.moveTo(-halfW, -halfH);
    shape.lineTo(-halfW, halfH - radius);
    shape.quadraticCurveTo(-halfW, halfH, -halfW + radius, halfH);
    shape.lineTo(halfW - radius, halfH);
    shape.quadraticCurveTo(halfW, halfH, halfW, halfH - radius);
    shape.lineTo(halfW, -halfH);
    shape.lineTo(-halfW, -halfH);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSegments: 10,
        bevelThickness: depthRadius,
        bevelSize: depthRadius,
        bevelOffset: 0,
        curveSegments: 16
    });
    geometry.center();
    geometry.computeVertexNormals();
    return geometry;
}

function createSpineTexture(title, subtitle, baseColor, accentColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Deep leather base with subtle warm banding.
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, toRgba(baseColor, 1));
    gradient.addColorStop(0.22, toRgba(accentColor, 0.95));
    gradient.addColorStop(0.5, toRgba(baseColor, 0.98));
    gradient.addColorStop(0.78, toRgba(accentColor, 0.96));
    gradient.addColorStop(1, toRgba(baseColor, 1));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Darkened edges to give the spine thickness.
    const edgeShade = ctx.createLinearGradient(0, 0, width, 0);
    edgeShade.addColorStop(0, 'rgba(10, 6, 4, 0.52)');
    edgeShade.addColorStop(0.22, 'rgba(10, 6, 4, 0)');
    edgeShade.addColorStop(0.78, 'rgba(10, 6, 4, 0)');
    edgeShade.addColorStop(1, 'rgba(10, 6, 4, 0.48)');
    ctx.fillStyle = edgeShade;
    ctx.fillRect(0, 0, width, height);

    // Central burnished bulge.
    const centerGlow = ctx.createRadialGradient(width / 2, height / 2, width * 0.1, width / 2, height / 2, width * 0.8);
    centerGlow.addColorStop(0, 'rgba(255, 226, 200, 0.08)');
    centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, width, height);

    // Leather grain and scuffs for weight.
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    for (let i = 0; i < 1200; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const len = 14 + Math.random() * 34;
        const curve = (Math.random() - 0.5) * 0.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len * 0.3, y + len * curve, x + len, y + len * 0.12);
        ctx.stroke();
    }
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 600; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 10 + Math.random() * 22;
        const shade = Math.random() > 0.5 ? 'rgba(0, 0, 0, 0.35)' : 'rgba(255, 255, 255, 0.16)';
        ctx.fillStyle = shade;
        ctx.fillRect(x, y, size * 0.4, size);
    }
    ctx.restore();

    // Raised bands along the spine.
    const bandHeights = [0.2, 0.8];
    bandHeights.forEach((ratio) => {
        const bandY = ratio * height;
        const bandH = 70;
        const band = ctx.createLinearGradient(0, bandY - bandH / 2, 0, bandY + bandH / 2);
        band.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
        band.addColorStop(0.35, 'rgba(255, 235, 200, 0.28)');
        band.addColorStop(0.5, 'rgba(255, 255, 255, 0.42)');
        band.addColorStop(0.65, 'rgba(255, 235, 200, 0.26)');
        band.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        ctx.fillStyle = band;
        ctx.fillRect(60, bandY - bandH / 2, width - 120, bandH);

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 6;
        ctx.strokeRect(60, bandY - bandH / 2, width - 120, bandH);
    });

    // Top and bottom metal caps.
    const capHeight = 94;
    ['top', 'bottom'].forEach((pos, idx) => {
        const y = pos === 'top' ? 18 : height - capHeight - 18;
        const grad = ctx.createLinearGradient(0, y, 0, y + capHeight);
        grad.addColorStop(0, 'rgba(255, 248, 230, 0.38)');
        grad.addColorStop(0.45, toRgba(accentColor, 0.66));
        grad.addColorStop(0.9, 'rgba(40, 26, 16, 0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(32, y, width - 64, capHeight);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 6;
        ctx.strokeRect(32, y, width - 64, capHeight);

        const rivetXs = [width * 0.22, width * 0.5, width * 0.78];
        rivetXs.forEach((rx) => {
            const ry = y + capHeight * (idx === 0 ? 0.3 : 0.7);
            const rivet = ctx.createRadialGradient(rx, ry, 4, rx, ry, 16);
            rivet.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            rivet.addColorStop(0.4, 'rgba(210, 210, 210, 0.8)');
            rivet.addColorStop(1, 'rgba(40, 26, 16, 0.8)');
            ctx.fillStyle = rivet;
            ctx.beginPath();
            ctx.arc(rx, ry, 14, 0, Math.PI * 2);
            ctx.fill();
        });
    });

    // Ornamental crest at center.
    const crestY = height * 0.52;
    const crestR = 86;
    const crest = ctx.createRadialGradient(width * 0.28, crestY, crestR * 0.25, width * 0.28, crestY, crestR);
    crest.addColorStop(0, 'rgba(255, 242, 220, 0.65)');
    crest.addColorStop(0.4, 'rgba(255, 220, 150, 0.38)');
    crest.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
    ctx.fillStyle = crest;
    ctx.beginPath();
    ctx.arc(width * 0.28, crestY, crestR, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(width * 0.28, crestY);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(40, 26, 16, 0.85)';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const inner = 24;
        const outer = 56;
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.lineTo(Math.cos(angle + Math.PI / 8) * inner, Math.sin(angle + Math.PI / 8) * inner);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Heavy frame lines.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 9;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Foil sheen that catches the light as books tilt.
    const foil = ctx.createLinearGradient(0, 0, width, height);
    foil.addColorStop(0, 'rgba(255, 245, 230, 0.22)');
    foil.addColorStop(0.48, 'rgba(255, 255, 255, 0.08)');
    foil.addColorStop(1, 'rgba(190, 220, 255, 0.18)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = foil;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // Subtle diagonal brushed texture.
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 2;
    for (let y = -height; y < height * 1.5; y += 56) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y + width * 0.5);
        ctx.stroke();
    }
    ctx.restore();

    // Vignette for depth.
    const vignette = ctx.createLinearGradient(0, 0, 0, height);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0.22)');
    vignette.addColorStop(0.12, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.88, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const safeTitle = (title || '').trim() || '星座';
    const titleLength = Array.from(safeTitle).length;
    const titleSize = Math.max(84, Math.min(96, 100 - Math.max(0, titleLength - 6) * 4));
    ctx.save();
    ctx.translate(width * 0.5, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = `${titleSize}px "Zen Kaku Gothic New", "Space Grotesk", sans-serif`;
    const titleGradient = ctx.createLinearGradient(0, -width * 0.12, 0, width * 0.12);
    titleGradient.addColorStop(0, 'rgba(255, 250, 240, 0.95)');
    titleGradient.addColorStop(1, 'rgba(210, 224, 255, 0.85)');
    ctx.fillStyle = titleGradient;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 3.5;
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.strokeText(safeTitle, 0, 0);
    ctx.shadowBlur = 0.5;
    ctx.fillText(safeTitle, 0, 0);
    ctx.restore();

    const safeSubtitle = (subtitle || '').trim() || 'CONSTELLATION';
    const subtitleLength = Array.from(safeSubtitle).length;
    const subtitleSize = Math.max(34, Math.min(50, 56 - Math.max(0, subtitleLength - 8) * 2));
    ctx.save();
    ctx.translate(width * 0.82, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = `${subtitleSize}px "Space Grotesk", "Zen Kaku Gothic New", sans-serif`;
    ctx.fillStyle = 'rgba(210, 230, 255, 0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 2.4;
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.strokeText(safeSubtitle, 0, width * -0.06);
    ctx.shadowBlur = 0.6;
    ctx.fillText(safeSubtitle, 0, width * -0.06);
    ctx.restore();

    return new THREE.CanvasTexture(canvas);
}

function toRgba(color, alpha = 1) {
    const c = new THREE.Color(color);
    const r = Math.round(c.r * 255);
    const g = Math.round(c.g * 255);
    const b = Math.round(c.b * 255);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function pickAccentColor(name, index) {
    const palette = [0x3f2b24, 0x4b332b, 0x2f3b4f, 0x2b3c32, 0x553a2a, 0x2e273d, 0x3f5667];
    const hash = Array.from(name || '').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[(hash + index) % palette.length];
}

function createWoodTextures(anisotropy = 4) {
    const { colorCanvas, normalCanvas } = generateWoodGrainCanvases();
    const repeat = new THREE.Vector2(4.5, 2.4);

    const colorMap = new THREE.CanvasTexture(colorCanvas);
    colorMap.wrapS = THREE.RepeatWrapping;
    colorMap.wrapT = THREE.RepeatWrapping;
    colorMap.repeat.copy(repeat);
    colorMap.anisotropy = anisotropy;

    const normalMap = new THREE.CanvasTexture(normalCanvas);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.copy(repeat);
    normalMap.anisotropy = anisotropy;

    return { colorMap, normalMap };
}

function applyWoodBackgroundTexture(element, colorTexture) {
    const canvas = colorTexture?.image;
    if (!element || !canvas?.toDataURL) return;
    const dataUrl = canvas.toDataURL('image/png');

    element.style.backgroundImage = [
        'radial-gradient(120% 130% at 50% -12%, rgba(255, 230, 204, 0.12), transparent 56%)',
        'linear-gradient(165deg, rgba(24, 14, 10, 0.72), rgba(24, 14, 10, 0.62))',
        `url('${dataUrl}')`
    ].join(', ');
    element.style.backgroundSize = 'cover, cover, 320px 160px';
    element.style.backgroundRepeat = 'no-repeat, no-repeat, repeat';
    element.style.backgroundPosition = 'center, center, top left';
    element.style.backgroundBlendMode = 'soft-light, multiply, normal';
}

function generateWoodGrainCanvases(width = 1024, height = 512) {
    const baseColor = { r: 88, g: 60, b: 44 };
    const heightMap = buildWoodHeightMap(width, height);

    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = width;
    colorCanvas.height = height;
    const colorCtx = colorCanvas.getContext('2d');
    const colorData = colorCtx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const h = heightMap[y * width + x];
            const v = y / height;
            const verticalTint = Math.cos((v - 0.5) * Math.PI) * 0.08;
            const brightness = 0.76 + h * 0.22 + verticalTint;
            const r = clamp255(baseColor.r * brightness + h * 12);
            const g = clamp255(baseColor.g * brightness + h * 10);
            const b = clamp255(baseColor.b * brightness + h * 6);
            colorData.data[idx] = r;
            colorData.data[idx + 1] = g;
            colorData.data[idx + 2] = b;
            colorData.data[idx + 3] = 255;
        }
    }
    colorCtx.putImageData(colorData, 0, 0);

    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = width;
    normalCanvas.height = height;
    const normalCtx = normalCanvas.getContext('2d');
    const normalData = normalCtx.createImageData(width, height);
    const strength = 1.35;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const hL = heightMap[y * width + (x > 0 ? x - 1 : x)];
            const hR = heightMap[y * width + (x < width - 1 ? x + 1 : x)];
            const hT = heightMap[(y > 0 ? y - 1 : y) * width + x];
            const hB = heightMap[(y < height - 1 ? y + 1 : y) * width + x];
            const nx = (hL - hR) * strength;
            const ny = (hT - hB) * strength;
            const nz = 1.0;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            normalData.data[idx] = clamp255((nx / len) * 127 + 128);
            normalData.data[idx + 1] = clamp255((ny / len) * 127 + 128);
            normalData.data[idx + 2] = clamp255((nz / len) * 127 + 128);
            normalData.data[idx + 3] = 255;
        }
    }
    normalCtx.putImageData(normalData, 0, 0);

    return { colorCanvas, normalCanvas };
}

function buildWoodHeightMap(width, height) {
    const map = new Float32Array(width * height);
    const seed = 47.13;
    for (let y = 0; y < height; y++) {
        const v = y / height;
        for (let x = 0; x < width; x++) {
            const u = x / width;
            const ring = Math.sin(u * 12 + Math.sin(v * 8) * 0.6);
            const fineGrain = Math.sin(u * 36 + Math.sin(v * 22) * 0.6);
            const swirl = Math.sin(v * 14 + u * 2) * 0.05;
            const noise = woodNoise(x * 0.8, y * 0.4, seed);
            const heightValue = 0.5 + ring * 0.08 + fineGrain * 0.06 + noise * 0.18 + swirl;
            map[y * width + x] = Math.min(1, Math.max(0, heightValue));
        }
    }
    return map;
}

function woodNoise(x, y, seed = 0) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
}

function clamp255(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function updatePointer(event) {
    if (!shelfScene) return;
    const rect = shelfScene.container.getBoundingClientRect();
    shelfScene.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    shelfScene.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function updateHover() {
    if (!shelfScene) return;
    shelfScene.raycaster.setFromCamera(shelfScene.pointer, shelfScene.camera);
    const hits = shelfScene.raycaster.intersectObjects(shelfScene.bookGroup.children, false);
    const target = hits.find((hit) => hit.object.userData?.content)?.object || null;

    if (target === shelfScene.hover) return;

    if (shelfScene.hover) {
        shelfScene.hover.scale.set(1, 1, 1);
    }
    shelfScene.hover = target;
    if (target) {
        target.scale.set(1.02, 1.05, 1.02);
    }
}

function handleBookSelect(content, openDetail) {
    if (!content) return;
    if (openDetail) openConstellationDetail(content);
}

function openConstellationDetail(content) {
    const refs = detailView || setupDetailScreen();
    if (!refs) return;
    refs.title.textContent = content.name;
    refs.lede.textContent = content.lede;
    refs.story.textContent = content.story;
    refs.observation.textContent = content.observation;
    refs.bright.textContent = content.brightStars || '—';

    if (refs.meta) {
        refs.meta.innerHTML = '';
        if (content.season) {
            const chip = document.createElement('span');
            chip.className = 'library-chip';
            chip.textContent = content.season;
            refs.meta.appendChild(chip);
        }
        if (content.keywords?.length) {
            const chip = document.createElement('span');
            chip.className = 'library-chip subtle';
            chip.textContent = content.keywords[0];
            refs.meta.appendChild(chip);
        }
    }

    if (refs.tags) {
        refs.tags.innerHTML = '';
        (content.keywords || []).forEach((tag) => {
            const el = document.createElement('span');
            el.className = 'library-tag';
            el.textContent = tag;
            refs.tags.appendChild(el);
        });
    }

    if (refs.detailScreen) refs.detailScreen.classList.remove('hidden');
    if (refs.libraryScreen) refs.libraryScreen.classList.add('hidden');
}

function closeConstellationDetail() {
    if (!detailView) return;
    if (detailView.detailScreen) detailView.detailScreen.classList.add('hidden');
    if (detailView.libraryScreen) detailView.libraryScreen.classList.remove('hidden');
}

function setupDetailScreen() {
    if (detailView) return detailView;
    const detailScreen = document.getElementById('library-detail-screen');
    const libraryScreen = document.getElementById('library-screen');
    if (!detailScreen) return null;

    detailView = {
        detailScreen,
        libraryScreen,
        backBtn: document.getElementById('library-detail-back'),
        title: document.getElementById('library-detail-title'),
        lede: document.getElementById('library-detail-lede'),
        story: document.getElementById('library-detail-story'),
        observation: document.getElementById('library-detail-observation'),
        bright: document.getElementById('library-detail-bright'),
        meta: document.getElementById('library-detail-meta'),
        tags: document.getElementById('library-detail-tags')
    };

    if (detailView.backBtn) {
        detailView.backBtn.addEventListener('click', closeConstellationDetail);
    }
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeConstellationDetail();
    });

    return detailView;
}

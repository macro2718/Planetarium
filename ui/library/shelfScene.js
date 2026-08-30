import * as THREE from '../../three.module.js';
import { getRegisteredConstellationCount } from './constellationContent.js';
import {
    applyWoodBackgroundTexture,
    createSpineTexture,
    createWoodTextures,
    pickAccentColor
} from './textureGenerators.js';

const SHADOW_CAMERA_BASE = {
    near: 1,
    far: 70,
    halfWidth: 26,
    top: 22,
    bottom: -6
};

let shelfScene = null;
let onBookSelect = null;

export function setupShelfScene(options = {}) {
    if (typeof options.onSelect === 'function') onBookSelect = options.onSelect;
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

    const shelfMaterial = new THREE.MeshStandardMaterial({
        map: woodTextures.colorMap,
        normalMap: woodTextures.normalMap,
        color: 0x4b2e1f,
        roughness: 0.5,
        metalness: 0.06,
        emissive: new THREE.Color(0x26160e).multiplyScalar(0.24),
        normalScale: new THREE.Vector2(0.8, 1.05)
    });

    const shelfSurface = new THREE.Mesh(new THREE.BoxGeometry(160, 1.4, 16), shelfMaterial);
    shelfSurface.position.y = -0.6;
    // Extend depth backward to meet the rear wall while keeping the front near its original spot.
    shelfSurface.position.z = -4;
    shelfSurface.castShadow = true;
    shelfSurface.receiveShadow = true;
    shelfGroup.add(shelfSurface);

    const shelfShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(180, 40),
        new THREE.ShadowMaterial({ color: 0x2a1a12, opacity: 0.75 })
    );
    shelfShadow.rotation.x = -Math.PI / 2;
    shelfShadow.position.set( 0, -0.1, -4 );
    shelfShadow.receiveShadow = true;
    shelfGroup.add(shelfShadow);

    const shelfGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(170, 0),
        new THREE.MeshBasicMaterial({
            color: 0xffe4bd,
            transparent: true,
            opacity: 0.08,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        })
    );
    shelfGlow.rotation.x = -Math.PI / 2;
    shelfGlow.position.y = -2.2; // hide glow plane under the deck so it doesn't wash lower geometry
    shelfGlow.position.z = -4;
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

    const dividerMetrics = leftDivider.userData?.metrics || { height: 11.2 };
    const shelfThickness = shelfSurface.geometry?.parameters?.height || 1.4;
    const dividerTopY = fixtureGroup.position.y + leftDivider.position.y + (dividerMetrics.height || 0) / 2;
    const upperShelfOffset = 1.2;
    const upperShelfSurface = shelfSurface.clone();
    upperShelfSurface.position.set(
        shelfSurface.position.x,
        dividerTopY + shelfThickness / 2 + upperShelfOffset,
        shelfSurface.position.z
    );
    upperShelfSurface.castShadow = true;
    upperShelfSurface.receiveShadow = true;
    shelfGroup.add(upperShelfSurface);

    // Side panels now run deeper to extend forward as well as back.
    const sidePanelMetrics = { width: 1.3, height: 64, depth: 20 };
    const sidePanelGap = 0.32;
    // Center the panel using shelf height, bias slightly upward so the top rises higher while still piercing the deck.
    const sidePanelY = shelfSurface.position.y - fixtureGroup.position.y + 0.4;

    const leftSidePanel = createShelfSidePanel(shelfMaterial.clone(), sidePanelMetrics);
    leftSidePanel.position.set(0, sidePanelY, shelfSurface.position.z);
    leftSidePanel.visible = false;
    fixtureGroup.add(leftSidePanel);

    const rightSidePanel = createShelfSidePanel(shelfMaterial.clone(), sidePanelMetrics);
    rightSidePanel.position.set(0, sidePanelY, shelfSurface.position.z);
    rightSidePanel.visible = false;
    fixtureGroup.add(rightSidePanel);

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
        leftSidePanel,
        rightSidePanel,
        sidePanelMetrics,
        sidePanelGap,
        sidePanelY,
        container,
        shadowLight,
        shadowCameraBase: { ...SHADOW_CAMERA_BASE },
        shadowShelfSpan: 0,
        shelfPosition: new THREE.Vector3(),
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
        clock: new THREE.Clock(false),
        screen,
        running: false,
        frameId: null,
        animate: null,
        eventHandlers: null
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
            onBookSelect?.(
                shelfScene.hover.userData.content,
                shelfScene.hover.userData.contentIndex
            );
        }
    };

    screen.addEventListener('pointerdown', handlePointerDown);
    screen.addEventListener('pointermove', handlePointerMove);
    screen.addEventListener('pointerup', handlePointerUp);
    screen.addEventListener('pointerleave', handlePointerUp);
    screen.addEventListener('pointercancel', handlePointerUp);
    screen.addEventListener('click', handleClick);

    const resize = () => resizeShelfScene();
    shelfScene.eventHandlers = {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleClick,
        resize
    };

    const animate = () => {
        if (!shelfScene?.running) return;
        shelfScene.frameId = requestAnimationFrame(animate);
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
    shelfScene.animate = animate;

    resize();
    return shelfScene;
}

export function startShelfScene() {
    const current = shelfScene || setupShelfScene();
    if (!current || current.running) return;
    current.running = true;
    current.clock.start();
    window.addEventListener('resize', current.eventHandlers.resize);
    resizeShelfScene();
    current.animate();
}

export function stopShelfScene() {
    if (!shelfScene?.running) return;
    shelfScene.running = false;
    shelfScene.clock.stop();
    if (shelfScene.frameId !== null) {
        cancelAnimationFrame(shelfScene.frameId);
        shelfScene.frameId = null;
    }
    window.removeEventListener('resize', shelfScene.eventHandlers.resize);
}

export function disposeShelfScene() {
    if (!shelfScene) return;
    stopShelfScene();
    const { screen, eventHandlers, renderer, scene } = shelfScene;
    screen.removeEventListener('pointerdown', eventHandlers.handlePointerDown);
    screen.removeEventListener('pointermove', eventHandlers.handlePointerMove);
    screen.removeEventListener('pointerup', eventHandlers.handlePointerUp);
    screen.removeEventListener('pointerleave', eventHandlers.handlePointerUp);
    screen.removeEventListener('pointercancel', eventHandlers.handlePointerUp);
    screen.removeEventListener('click', eventHandlers.handleClick);
    scene.traverse((object) => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.filter(Boolean).forEach(disposeMaterial);
    });
    scene.clear();
    renderer.dispose();
    renderer.forceContextLoss?.();
    renderer.domElement.remove();
    shelfScene = null;
    onBookSelect = null;
}

function disposeMaterial(material) {
    [
        'map',
        'normalMap',
        'roughnessMap',
        'metalnessMap',
        'emissiveMap',
        'alphaMap'
    ].forEach((key) => material[key]?.dispose?.());
    material.dispose?.();
}

export function resizeShelfScene() {
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

    const shelfPosition = shelfScene.shelfPosition;
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
    const overscrollLeft = 3.2; // stronger cushion to further shorten left travel
    const extraPanRight = Math.max(halfViewWidth * 0.15, 1.8); // allow a bit more travel past dividers (right)
    const extraPanLeft = Math.max(halfViewWidth * 0.22, 2.4);
    const minOffset = -halfViewWidth - shelfScene.baseOffset - leftEdge + overscrollLeft - extraPanLeft;
    const maxOffsetVisible = halfViewWidth - shelfScene.baseOffset - visibleRightEdge - overscrollRight - 3 * extraPanRight;   // extra pan reduced on visible edge
    const maxOffsetFuture = halfViewWidth - shelfScene.baseOffset - finalRightEdge - overscrollLeft - extraPanLeft;

    shelfScene.minOffset = Math.min(minOffset, maxOffsetFuture);
    shelfScene.maxOffset = Math.max(minOffset, maxOffsetVisible);
    shelfScene.targetOffset = clampOffset(shelfScene.targetOffset);
    shelfScene.currentOffset = clampOffset(shelfScene.currentOffset);
}

export function snapShelfToLeftEdge() {
    if (!shelfScene) return;
    // Reset to a neutral position so the view bounds are computed consistently,
    // then jump to the leftmost allowed offset.
    shelfScene.currentOffset = 0;
    shelfScene.targetOffset = 0;
    if (shelfScene.shelfGroup) {
        shelfScene.shelfGroup.position.x = shelfScene.baseOffset || 0;
    }
    updateOffsetBounds();
    const leftOffset = Number.isFinite(shelfScene.maxOffset) ? shelfScene.maxOffset : 0;
    shelfScene.targetOffset = leftOffset;
    shelfScene.currentOffset = leftOffset;
    if (shelfScene.shelfGroup) {
        shelfScene.shelfGroup.position.x = (shelfScene.baseOffset || 0) + leftOffset;
    }
    updateShadowCameraBounds();
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

export function updateShelfBooks(contents) {
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
    const leftSidePanel = shelfScene.leftSidePanel;
    const rightSidePanel = shelfScene.rightSidePanel;
    const sidePanelMetrics = shelfScene.sidePanelMetrics || {};
    const sidePanelGap = Number.isFinite(shelfScene.sidePanelGap) ? shelfScene.sidePanelGap : 0;
    const sidePanelHalfWidth = (sidePanelMetrics.width || 0) / 2;
    const sidePanelOffset = sidePanelHalfWidth > 0 ? dividerPad + sidePanelGap + sidePanelHalfWidth : 0;
    const sidePanelY = Number.isFinite(shelfScene.sidePanelY) ? shelfScene.sidePanelY : null;
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

    if (leftSidePanel) {
        leftSidePanel.visible = hasBooks;
        if (sidePanelY !== null) {
            leftSidePanel.position.y = sidePanelY;
        }
        if (hasBooks && leftDivider) {
            const metrics = leftDivider.userData?.metrics || { width: 0.62 };
            leftSidePanel.position.x =
                leftDivider.position.x - (metrics.width || 0) / 2 - sidePanelOffset;
        }
    }

    if (rightSidePanel) {
        rightSidePanel.visible = hasBooks;
        if (sidePanelY !== null) {
            rightSidePanel.position.y = sidePanelY;
        }
        if (hasBooks && rightDivider) {
            const metrics = rightDivider.userData?.metrics || { width: 0.62 };
            rightSidePanel.position.x =
                rightDivider.position.x + (metrics.width || 0) / 2 + sidePanelOffset;
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
        book.userData.contentIndex = idx;
        book.position.set(idx * bookSpacing, 0, (Math.random() - 0.5) * 0.35);
        group.add(book);
    });

    const leftEdge = leftDivider?.visible
        ? leftDivider.position.x - (leftDivider.userData?.metrics?.width || 0.62) / 2 - sidePanelOffset
        : 0;
    const currentRightEdge = hasBooks
        ? Math.max(unlockedBooks - 1, 0) * bookSpacing + (bookWidth / 2 + bookGap) + sidePanelOffset
        : 0;
    const finalRightEdge = rightDivider?.visible
        ? rightDivider.position.x + (rightDivider.userData?.metrics?.width || 0.62) / 2 + sidePanelOffset
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

function createShelfSidePanel(material, metrics = {}) {
    const width = metrics.width || 1.2;
    const height = metrics.height || 12;
    const depth = metrics.depth || 12.2;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const panel = new THREE.Mesh(geometry, material || new THREE.MeshStandardMaterial());
    panel.castShadow = true;
    panel.receiveShadow = true;
    return panel;
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

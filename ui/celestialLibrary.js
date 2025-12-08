import * as THREE from '../three.module.js';
import { destroyAllPlanetaria, resetPlanetariumBgm } from './planetariumContext.js';
import { findConstellationTale } from '../data/constellationTales.js';
import { BASE_CONSTELLATION_DATA } from '../data/constellations.js';

const STORAGE_KEY = 'celestial-library-unlocked-v1';
let unlockedConstellations = new Set();
let detailView = null;
let shelfScene = null;

const FALLBACK_STORY = '物語の断片はまだ集めているところです。星空で出会ったときの余韻を、そのままここに置いておきましょう。';
const FALLBACK_OBSERVATION = '星図を広げ、実際の夜空で形をなぞると新しい発見があります。';

const CONSTELLATION_DESCRIPTION_MAP = new Map(
    BASE_CONSTELLATION_DATA.map((entry) => [normalizeConstellationName(entry.name), entry])
);

export function initCelestialLibrary() {
    unlockedConstellations = loadUnlockedConstellations();
    setupBackButton();
    setupDetailScreen();
    setupShelfScene();
    renderLibraryList();
}

export function showCelestialLibraryScreen() {
    const libraryScreen = document.getElementById('library-screen');
    const homeScreen = document.getElementById('home-screen');
    resetPlanetariumBgm();
    destroyAllPlanetaria();
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

function setupBackButton() {
    const backBtn = document.getElementById('library-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showModeScreen();
            hideCelestialLibraryScreen();
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
    if (modeScreen) {
        modeScreen.classList.remove('hidden');
    }
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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.id = 'library-three-canvas';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f0a08, 0.022);

    const camera = new THREE.PerspectiveCamera(
        40,
        (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight),
        0.1,
        260
    );
    camera.position.set(0, 7.2, 28);

    scene.add(new THREE.AmbientLight(0xffd7b0, 0.55));

    const keyLight = new THREE.SpotLight(0xffb86c, 1.6, 120, Math.PI / 4, 0.45, 2);
    keyLight.position.set(8, 18, 26);
    keyLight.target.position.set(0, 4, 0);
    keyLight.add(keyLight.target);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xc5a37a, 1.05, 120, 2);
    rimLight.position.set(-16, 10, -10);
    scene.add(rimLight);

    const shelfSurface = new THREE.Mesh(
        new THREE.BoxGeometry(160, 1.2, 10),
        new THREE.MeshStandardMaterial({
            color: 0x2b1a12,
            roughness: 0.55,
            metalness: 0.12,
            emissive: new THREE.Color(0x3a2418).multiplyScalar(0.25)
        })
    );
    shelfSurface.position.y = -0.6;
    shelfSurface.position.z = -1.2;
    scene.add(shelfSurface);

    const shelfGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(180, 36),
        new THREE.MeshBasicMaterial({
            color: 0xffc27a,
            transparent: true,
            opacity: 0.06,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        })
    );
    shelfGlow.rotation.x = -Math.PI / 2;
    shelfGlow.position.y = -0.4;
    shelfGlow.position.z = -2;
    scene.add(shelfGlow);

    const bookGroup = new THREE.Group();
    bookGroup.position.y = 4.2;
    scene.add(bookGroup);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    shelfScene = {
        renderer,
        scene,
        camera,
        bookGroup,
        container,
        raycaster,
        pointer,
        hover: null,
        targetOffset: 0,
        currentOffset: 0,
        baseOffset: 0,
        maxOffset: 0,
        clock: new THREE.Clock()
    };

    let isDragging = false;
    let lastX = 0;
    let dragged = false;

    const handlePointerDown = (event) => {
        if (event.target.closest('.library-back-btn')) return;
        isDragging = true;
        lastX = event.clientX;
        dragged = false;
    };

    const handlePointerMove = (event) => {
        updatePointer(event);
        if (isDragging && event.buttons === 0) {
            // Stop dragging if the pointer release wasn't captured (e.g., pointerup on another element)
            isDragging = false;
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
        isDragging = false;
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
        bookGroup.position.x = offset;

        bookGroup.children.forEach((book, idx) => {
            const wobble = book.userData?.wobble ?? 0;
            book.position.y = 0.2 + Math.sin(elapsed * 1.2 + wobble) * 0.12;
            book.rotation.z = Math.sin(elapsed * 0.6 + wobble) * 0.02;
            book.rotation.y += 0.0015;
            if (idx % 3 === 0) {
                book.rotation.x = Math.sin(elapsed * 0.4 + wobble) * 0.01;
            }
        });

        shelfGlow.material.opacity = 0.05 + Math.sin(elapsed * 0.5) * 0.02;
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
}

function clampOffset(value) {
    if (!shelfScene) return 0;
    return THREE.MathUtils.clamp(value, -shelfScene.maxOffset, shelfScene.maxOffset);
}

function updateShelfBooks(contents) {
    if (!shelfScene) setupShelfScene();
    if (!shelfScene) return;

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
    shelfScene.maxOffset = Math.max(0, (contents.length - 1) * 3.6 * 0.55);
    shelfScene.baseOffset = contents.length > 1 ? -((contents.length - 1) * 3.6) / 2 : 0;
    shelfScene.targetOffset = clampOffset(shelfScene.targetOffset);
    shelfScene.currentOffset = clampOffset(shelfScene.currentOffset);

    if (!contents.length) return;

    const spacing = 3.6;
    const anisotropy = shelfScene.renderer.capabilities?.getMaxAnisotropy
        ? shelfScene.renderer.capabilities.getMaxAnisotropy()
        : 4;

    contents.forEach((content, idx) => {
        const book = createBookMesh(content, idx, anisotropy);
        book.position.set(idx * spacing, 0, 0);
        group.add(book);
    });
}

function createBookMesh(content, index, anisotropy = 4) {
    const baseColor = pickAccentColor(content.name, index);
    const coverColor = new THREE.Color(baseColor);
    coverColor.offsetHSL(0, -0.08, -0.06);
    const accentColor = new THREE.Color(baseColor);
    accentColor.offsetHSL(0.04, 0.08, 0.08);

    const geometry = new THREE.BoxGeometry(3.2, 9.4, 1.1);
    const spineTexture = createSpineTexture(
        content.spineLabel || content.name,
        content.spineCode || content.keywords?.[0] || '',
        baseColor,
        accentColor
    );
    spineTexture.anisotropy = anisotropy;

    const spineMaterial = new THREE.MeshStandardMaterial({
        map: spineTexture,
        roughness: 0.35,
        metalness: 0.32,
        emissive: new THREE.Color(baseColor).multiplyScalar(0.15),
        emissiveIntensity: 0.35
    });

    const coverMaterial = new THREE.MeshStandardMaterial({
        color: coverColor,
        roughness: 0.58,
        metalness: 0.18
    });

    const sideMaterial = new THREE.MeshStandardMaterial({
        color: accentColor,
        roughness: 0.6,
        metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, [
        sideMaterial,
        sideMaterial.clone(),
        coverMaterial.clone(),
        coverMaterial.clone(),
        spineMaterial,
        coverMaterial
    ]);

    mesh.userData = { content, wobble: Math.random() * Math.PI * 2 };
    return mesh;
}

function createSpineTexture(title, subtitle, baseColor, accentColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, toRgba(baseColor, 0.92));
    gradient.addColorStop(0.5, toRgba(accentColor, 0.88));
    gradient.addColorStop(1, toRgba(baseColor, 0.92));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 6;
    ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

    const safeTitle = (title || '').trim() || '星座';
    const titleLength = Array.from(safeTitle).length;
    const titleSize = Math.max(54, Math.min(80, 88 - Math.max(0, titleLength - 6) * 4));
    ctx.save();
    ctx.translate(canvas.width * 0.66, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = `${titleSize}px "Zen Kaku Gothic New", "Space Grotesk", sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 8;
    ctx.fillText(safeTitle, 0, 0);
    ctx.restore();

    const safeSubtitle = (subtitle || '').trim() || 'CONSTELLATION';
    const subtitleLength = Array.from(safeSubtitle).length;
    const subtitleSize = Math.max(30, Math.min(46, 52 - Math.max(0, subtitleLength - 8) * 2));
    ctx.save();
    ctx.translate(canvas.width * 0.82, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = `${subtitleSize}px "Space Grotesk", "Zen Kaku Gothic New", sans-serif`;
    ctx.fillStyle = 'rgba(210, 230, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 6;
    ctx.fillText(safeSubtitle, 0, canvas.width * -0.06);
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
    const palette = [0xc68f6a, 0x5b3a29, 0x7a4f6d, 0x36505a, 0xa97c50, 0x4a6f62];
    const hash = Array.from(name || '').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[(hash + index) % palette.length];
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

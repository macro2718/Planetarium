import * as THREE from 'three';

export function attachUIInteractions(ctx) {
    setupResizeHandler(ctx);
    setupClickHandler(ctx);
    setupControlButtons(ctx);
    return {
        showStarInfo: (data) => showStarInfo(ctx, data),
        hideStarInfo: () => hideStarInfo(ctx)
    };
}

function setupResizeHandler(ctx) {
    window.addEventListener('resize', () => {
        ctx.camera.aspect = window.innerWidth / window.innerHeight;
        ctx.camera.updateProjectionMatrix();
        ctx.renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function setupClickHandler(ctx) {
    window.addEventListener('click', (event) => {
        const selection = pickObject(ctx, event);
        if (selection) {
            showStarInfo(ctx, selection);
        } else {
            hideStarInfo(ctx);
        }
    });
}

function pickObject(ctx, event) {
    ctx.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    ctx.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    ctx.raycaster.setFromCamera(ctx.mouse, ctx.camera);
    const cameraDistance = ctx.camera.position.length();
    ctx.raycaster.params.Points.threshold = Math.max(30, 80 * (cameraDistance / 10));
    const intersects = ctx.raycaster.intersectObjects(ctx.clickableObjects, false);
    for (const hit of intersects) {
        const object = hit.object;
        if (!object?.userData) continue;
        if (!isObjectWorldVisible(object)) continue;
        if (!shouldShowStarInfo(ctx, object.userData)) continue;
        return object.userData;
    }
    return findNearestCatalogStar(ctx, event.clientX, event.clientY, 32);
}

function setupControlButtons(ctx) {
    const toggleButton = (id, flag, apply) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            const next = !ctx.settings[flag];
            ctx.settings[flag] = next;
            e.target.classList.toggle('active');
            apply(next);
        });
    };
    toggleButton('btn-stars', 'showStars', (visible) => {
        if (ctx.starsGroup) ctx.starsGroup.visible = visible;
    });
    toggleButton('btn-milkyway', 'showMilkyWay', (visible) => {
        if (ctx.milkyWayGroup) ctx.milkyWayGroup.visible = visible;
    });
    toggleButton('btn-constellations', 'showConstellations', (visible) => {
        if (ctx.constellationSystem) {
            ctx.constellationSystem.updateVisibility(visible);
        }
    });
    toggleButton('btn-shooting', 'showShootingStars', (visible) => {
        if (ctx.shootingStarsGroup) {
            ctx.shootingStarsGroup.visible = visible;
        }
    });
    toggleButton('btn-moon', 'showMoon', (visible) => {
        if (ctx.moonGroup) ctx.moonGroup.visible = visible;
    });
    toggleButton('btn-aurora', 'showAurora', (visible) => {
        if (ctx.auroraGroup) ctx.auroraGroup.visible = visible;
    });
    const autoBtn = document.getElementById('btn-auto');
    if (autoBtn) {
        autoBtn.addEventListener('click', (e) => {
            ctx.settings.autoRotate = !ctx.settings.autoRotate;
            e.target.classList.toggle('active');
            ctx.controls.autoRotate = ctx.settings.autoRotate;
        });
    }
    const musicBtn = document.getElementById('btn-music');
    if (musicBtn) {
        musicBtn.addEventListener('click', (e) => {
            ctx.settings.playMusic = !ctx.settings.playMusic;
            e.target.classList.toggle('active');
            if (ctx.settings.playMusic) {
                ctx.startAmbientSound();
            } else {
                ctx.stopAmbientSound();
            }
        });
    }
}

function isObjectWorldVisible(object) {
    let current = object;
    while (current) {
        if (current.visible === false) return false;
        current = current.parent;
    }
    return true;
}

function shouldShowStarInfo(ctx, data) {
    if (!data) return false;
    if (data.type && data.type !== 'star') return true;
    if (data.fromCatalog) return true;
    if (data.id && ctx.starCatalogMap.has(data.id)) return true;
    return false;
}

function findNearestCatalogStar(ctx, clientX, clientY, thresholdPx = 28) {
    if (!ctx.catalogPickables.length) return null;
    const dom = ctx.renderer?.domElement;
    const screenW = dom?.clientWidth || window.innerWidth;
    const screenH = dom?.clientHeight || window.innerHeight;
    const limitSq = thresholdPx * thresholdPx;
    const worldPos = new THREE.Vector3();
    const projected = new THREE.Vector3();
    let bestData = null;
    let bestDistSq = limitSq;
    for (const mesh of ctx.catalogPickables) {
        if (!mesh?.userData) continue;
        if (!shouldShowStarInfo(ctx, mesh.userData)) continue;
        if (!isObjectWorldVisible(mesh)) continue;
        mesh.getWorldPosition(worldPos);
        projected.copy(worldPos).project(ctx.camera);
        if (projected.z < -1 || projected.z > 1) continue;
        const screenX = (projected.x + 1) * 0.5 * screenW;
        const screenY = (-projected.y + 1) * 0.5 * screenH;
        const dx = screenX - clientX;
        const dy = screenY - clientY;
        const distSq = dx * dx + dy * dy;
        if (distSq <= bestDistSq) {
            bestDistSq = distSq;
            bestData = mesh.userData;
        }
    }
    return bestData;
}

function showStarInfo(ctx, data) {
    const infoPanel = document.getElementById('star-info');
    const content = document.getElementById('star-info-content');
    if (!infoPanel || !content) return;
    let html = `<h3>✦ ${data.name}</h3>`;
    if (data.nameEn) {
        html += `<p style="opacity: 0.7; margin-top: -10px;">${data.nameEn}</p>`;
    }
    if (data.type) {
        const typeLabel = data.type === 'planet' ? '惑星' : data.type === 'moon' ? '衛星' : '恒星';
        html += `<p class="star-type">種類: ${typeLabel}</p>`;
    }
    const detailLines = [];
    if (data.constellation) detailLines.push(`星座: ${data.constellation}`);
    if (data.magnitude !== undefined) {
        const magLabel = typeof data.magnitude === 'number' ? data.magnitude.toFixed(2) : data.magnitude;
        detailLines.push(`視等級: ${magLabel}`);
    }
    if (data.distance) {
        const distanceLabel = typeof data.distance === 'number' ? data.distance.toLocaleString('ja-JP') : data.distance;
        detailLines.push(`距離: 約${distanceLabel}光年`);
    }
    if (data.spectralType) detailLines.push(`スペクトル型: ${data.spectralType}`);
    if (data.temperature) detailLines.push(`表面温度: ${data.temperature}`);
    if (data.colorHint) detailLines.push(`色合い: ${data.colorHint}`);
    detailLines.forEach(line => {
        html += `<p class="star-detail">${line}</p>`;
    });
    if (data.info) {
        html += `<p>${data.info}</p>`;
    }
    content.innerHTML = html;
    infoPanel.classList.add('visible');
    clearTimeout(ctx.infoTimeout);
    ctx.infoTimeout = setTimeout(() => hideStarInfo(ctx), 4000);
}

function hideStarInfo(ctx) {
    const infoPanel = document.getElementById('star-info');
    if (!infoPanel) return;
    infoPanel.classList.remove('visible');
}

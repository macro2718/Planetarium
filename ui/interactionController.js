import * as THREE from '../three.module.js';
import { getPhotoAlbumSystem } from './photoAlbum.js';

export function attachUIInteractions(getPlanetarium) {
    setupResizeHandler(getPlanetarium);
    setupClickHandler(getPlanetarium);
    setupControlButtons(getPlanetarium);
    setupTimeControls(getPlanetarium);
    
    // PhotoAlbumSystemの初期化（DOMが準備されてから）
    const albumSystem = getPhotoAlbumSystem();
    albumSystem.init();
    
    return {
        showStarInfo: (data) => {
            const ctx = getPlanetarium();
            if (ctx) {
                showStarInfo(ctx, data);
            }
        },
        hideStarInfo: () => {
            const ctx = getPlanetarium();
            if (ctx) {
                hideStarInfo(ctx);
            }
        }
    };
}

function setupResizeHandler(getPlanetarium) {
    window.addEventListener('resize', () => {
        const ctx = getPlanetarium();
        if (!ctx) return;
        ctx.camera.aspect = window.innerWidth / window.innerHeight;
        ctx.camera.updateProjectionMatrix();
        ctx.renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function setupClickHandler(getPlanetarium) {
    window.addEventListener('click', (event) => {
        const ctx = getPlanetarium();
        if (!ctx) return;
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

function setupControlButtons(getPlanetarium) {
    setupSurfaceButtons(getPlanetarium);
    const toggleButton = (id, flag, apply) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            const ctx = getPlanetarium();
            if (!ctx) return;
            const next = !ctx.settings[flag];
            ctx.settings[flag] = next;
            e.target.classList.toggle('active');
            apply(ctx, next);
        });
    };
    toggleButton('btn-milkyway', 'showMilkyWay', (ctx, visible) => {
        if (ctx.milkyWayGroup) ctx.milkyWayGroup.visible = visible;
    });
    toggleButton('btn-constellations', 'showConstellations', (ctx, visible) => {
        if (ctx.constellationSystem) {
            ctx.constellationSystem.updateVisibility(visible);
        }
    });
    toggleButton('btn-shooting', 'showShootingStars', (ctx, visible) => {
        if (ctx.shootingStarsGroup) {
            ctx.shootingStarsGroup.visible = visible;
        }
    });
    toggleButton('btn-sun', 'showSun', (ctx, visible) => {
        if (ctx.sunSystem?.setEnabled) {
            ctx.sunSystem.setEnabled(visible);
        } else if (ctx.sunGroup) {
            ctx.sunGroup.visible = visible;
        }
    });
    toggleButton('btn-moon', 'showMoon', (ctx, visible) => {
        if (ctx.moonGroup) ctx.moonGroup.visible = visible;
    });
    toggleButton('btn-aurora', 'showAurora', (ctx, visible) => {
        if (ctx.auroraGroup) ctx.auroraGroup.visible = visible;
    });
    toggleButton('btn-lensflare', 'showLensFlare', (ctx, visible) => {
        if (ctx.lensFlareSystem?.setEnabled) {
            ctx.lensFlareSystem.setEnabled(visible);
        }
    });
    toggleButton('btn-star-trails', 'showStarTrails', (ctx, visible) => {
        if (ctx.starTrailSystem) {
            ctx.starTrailSystem.setEnabled(visible);
        }
    });
    
    // ホームに戻るボタン
    const homeBtn = document.getElementById('btn-home');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
        const albumSystem = getPhotoAlbumSystem();
        albumSystem.showHomeFromPlanetarium();
    });
    }

    const autoBtn = document.getElementById('btn-auto');
    if (autoBtn) {
        autoBtn.addEventListener('click', (e) => {
            const ctx = getPlanetarium();
            if (!ctx) return;
            ctx.settings.autoRotate = !ctx.settings.autoRotate;
            e.target.classList.toggle('active');
            ctx.controls.autoRotate = ctx.settings.autoRotate;
        });
    }
    const musicBtn = document.getElementById('btn-music');
    if (musicBtn) {
        musicBtn.addEventListener('click', (e) => {
            const ctx = getPlanetarium();
            if (!ctx) return;
            ctx.settings.playMusic = !ctx.settings.playMusic;
            e.target.classList.toggle('active');
            if (ctx.settings.playMusic) {
                ctx.startAmbientSound();
            } else {
                ctx.stopAmbientSound();
            }
        });
    }
    
    // 時圏表示ボタン
    toggleButton('btn-hour-circles', 'showHourCircles', (ctx, visible) => {
        if (ctx.hourCircleSystem) {
            ctx.hourCircleSystem.setVisible(visible);
        }
    });
    
    // 赤緯圏表示ボタン
    toggleButton('btn-declination-circles', 'showDeclinationCircles', (ctx, visible) => {
        if (ctx.declinationCircleSystem) {
            ctx.declinationCircleSystem.setVisible(visible);
        }
    });
    
    // 天の赤道表示ボタン
    toggleButton('btn-celestial-equator', 'showCelestialEquator', (ctx, visible) => {
        if (ctx.celestialEquatorSystem) {
            ctx.celestialEquatorSystem.setVisible(visible);
        }
    });
    
    // 黄道表示ボタン
    toggleButton('btn-ecliptic', 'showEcliptic', (ctx, visible) => {
        if (ctx.eclipticSystem) {
            ctx.eclipticSystem.setVisible(visible);
        }
    });
    
    // 方位表示ボタン
    toggleButton('btn-cardinal-directions', 'showCardinalDirections', (ctx, visible) => {
        if (ctx.cardinalDirectionSystem) {
            ctx.cardinalDirectionSystem.setVisible(visible);
        }
    });

    const setImmersiveMode = (active) => {
        document.body.classList.toggle('immersive-mode', active);
        immersiveBtn?.classList.toggle('active', active);
    };

    const immersiveBtn = document.getElementById('btn-immersive');
    if (immersiveBtn) {
        immersiveBtn.addEventListener('click', () => {
            const next = !document.body.classList.contains('immersive-mode');
            setImmersiveMode(next);
        });
    }

    const exitImmersiveBtn = document.getElementById('exit-immersive');
    if (exitImmersiveBtn) {
        exitImmersiveBtn.addEventListener('click', () => {
            setImmersiveMode(false);
        });
    }
}

function setupSurfaceButtons(getPlanetarium) {
    const surfaceButtons = Array.from(document.querySelectorAll('[data-surface-type]'));
    if (!surfaceButtons.length) return;

    const setActiveSurface = (type) => {
        surfaceButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.surfaceType === type);
        });
    };

    const applySurfaceType = (type) => {
        const ctx = getPlanetarium();
        if (!ctx) return;
        const normalizedType = type === 'land' ? 'desert' : type;
        ctx.settings.surfaceType = normalizedType;
        ctx.surfaceSystem?.setSurfaceType(normalizedType);
        setActiveSurface(normalizedType);
    };

    surfaceButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            applySurfaceType(btn.dataset.surfaceType);
        });
    });

    applySurfaceType((getPlanetarium()?.settings.surfaceType) ?? 'water');
}

function setupTimeControls(getPlanetarium) {
    const realtimeBtn = document.getElementById('time-mode-realtime');
    const customBtn = document.getElementById('time-mode-custom');
    const fixedBtn = document.getElementById('time-mode-fixed');
    const dateInput = document.getElementById('custom-datetime');
    const speedInput = document.getElementById('custom-speed');
    const applyBtn = document.getElementById('apply-custom-time');
    const speedDisplay = document.getElementById('custom-speed-display');
    const speedLabel = document.getElementById('speed-label-prefix');
    const speedHint = document.getElementById('time-speed-hint');
    const playbackBtn = document.getElementById('time-toggle-play');
    let userEditedDate = false;

    if (!realtimeBtn && !customBtn && !fixedBtn && !dateInput && !speedInput) {
        return;
    }

    const timeSettingsContainer = document.getElementById('time-settings-container');
    const ctxRef = () => getPlanetarium();

    dateInput?.addEventListener('input', () => {
        userEditedDate = true;
    });

    const setDateInputValue = (date) => {
        if (!dateInput || !date) return;
        dateInput.value = formatDatetimeLocal(date);
        userEditedDate = false;
    };

    const updateControlsVisibility = () => {
        const ctx = ctxRef();
        if (!ctx) return;
        const isRealtime = ctx.timeMode === 'realtime';
        // リアルタイムモードでは設定全体を非表示
        if (timeSettingsContainer) {
            timeSettingsContainer.style.display = isRealtime ? 'none' : 'block';
        }
    };

    const updateButtonState = () => {
        const ctx = ctxRef();
        if (!ctx) return;
        const mode = ctx.timeMode;
        realtimeBtn?.classList.toggle('active', mode === 'realtime');
        customBtn?.classList.toggle('active', mode === 'custom');
        fixedBtn?.classList.toggle('active', mode === 'fixed-time');
        updatePlaybackButton();
        updateControlsVisibility();
    };

    const updateSpeedDisplay = () => {
        const ctx = ctxRef();
        if (!ctx) return;
        if (!speedDisplay || !speedInput) return;
        const isFixed = ctx.timeMode === 'fixed-time';
        const value = parseFloat(speedInput.value);
        const fallback = isFixed ? ctx.dayScale : ctx.timeScale;
        const scale = Number.isFinite(value) ? value : (Number.isFinite(fallback) ? fallback : 1);
        const formatted = scale.toLocaleString('ja-JP', { maximumFractionDigits: 3 });
        if (isFixed) {
            speedDisplay.textContent = `${formatted} 日/秒`;
            if (speedLabel) speedLabel.textContent = '日付倍率';
            if (speedHint) speedHint.textContent = '倍率0で停止。負の値で日付を戻すこともできます。';
        } else {
            speedDisplay.textContent = `×${formatted}`;
            if (speedLabel) speedLabel.textContent = '時間倍率';
            if (speedHint) speedHint.textContent = '倍率0で停止。負の値で時間を逆行させることもできます。';
        }
    };

    const syncInputsFromCtx = (forceDate = false) => {
        const ctx = ctxRef();
        if (!ctx) return;
        if (dateInput && (forceDate || ctx.timeMode === 'realtime')) {
            const current = typeof ctx.getSimulatedDate === 'function' ? ctx.getSimulatedDate() : new Date();
            setDateInputValue(current);
        }
        const isFixed = ctx.timeMode === 'fixed-time';
        if (speedInput) {
            const scale = isFixed ? ctx.dayScale : ctx.timeScale;
            if (Number.isFinite(scale)) {
                speedInput.value = scale;
            }
        }
        updateSpeedDisplay();
        updateControlsVisibility();
    };

    const readInputDate = () => {
        if (!dateInput || !dateInput.value) return null;
        const parsed = new Date(dateInput.value);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed;
    };

    const applyCustomSettings = (targetMode) => {
        const ctx = ctxRef();
        if (!ctx) return;
        const mode = targetMode || (ctx.timeMode === 'fixed-time' ? 'fixed-time' : 'custom');
        const ctxDate = typeof ctx.getSimulatedDate === 'function' ? ctx.getSimulatedDate() : new Date();
        const inputDate = readInputDate();
        const shouldPreferCtxDate = !inputDate
            || (!userEditedDate && ctx.timeMode !== 'realtime' && Math.abs(inputDate.getTime() - ctxDate.getTime()) > 60000);
        const targetDate = shouldPreferCtxDate ? ctxDate : inputDate;
        const rawScale = speedInput ? parseFloat(speedInput.value) : (mode === 'fixed-time' ? ctx.dayScale : ctx.timeScale);
        if (mode === 'fixed-time') {
            const nextScale = Number.isFinite(rawScale) ? rawScale : (Number.isFinite(ctx.dayScale) ? ctx.dayScale : 1);
            ctx.setTimeMode?.('fixed-time', { date: targetDate, dayScale: nextScale });
        } else {
            const nextScale = Number.isFinite(rawScale) ? rawScale : (Number.isFinite(ctx.timeScale) ? ctx.timeScale : 1);
            ctx.setTimeMode?.('custom', { date: targetDate, timeScale: nextScale });
        }
        // 最初は一時停止状態にする
        ctx.toggleTimePause?.(true);
        syncInputsFromCtx(true);
        updateButtonState();
    };

    realtimeBtn?.addEventListener('click', () => {
        const ctx = ctxRef();
        if (!ctx) return;
        ctx.setTimeMode?.('realtime');
        ctx.toggleTimePause?.(false);
        syncInputsFromCtx(true);
        updateButtonState();
    });

    customBtn?.addEventListener('click', () => {
        const ctx = ctxRef();
        if (!ctx) return;
        if (speedInput && Number.isFinite(ctx.timeScale)) {
            speedInput.value = ctx.timeScale;
        }
        setDateInputValue(typeof ctx.getSimulatedDate === 'function' ? ctx.getSimulatedDate() : new Date());
        applyCustomSettings('custom');
    });

    fixedBtn?.addEventListener('click', () => {
        const ctx = ctxRef();
        if (!ctx) return;
        if (speedInput && Number.isFinite(ctx.dayScale)) {
            speedInput.value = ctx.dayScale;
        }
        setDateInputValue(typeof ctx.getSimulatedDate === 'function' ? ctx.getSimulatedDate() : new Date());
        applyCustomSettings('fixed-time');
    });

    applyBtn?.addEventListener('click', () => {
        applyCustomSettings();
    });

    speedInput?.addEventListener('input', updateSpeedDisplay);

    const updatePlaybackButton = () => {
        if (!playbackBtn) return;
        const ctx = ctxRef();
        if (!ctx) return;
        const isRealtime = ctx.timeMode === 'realtime';
        const paused = ctx.isTimePaused && !isRealtime;
        playbackBtn.textContent = paused ? '▶️ 再生' : '⏸ 一時停止';
        playbackBtn.style.display = 'inline-block';
        playbackBtn.disabled = isRealtime;
    };

    playbackBtn?.addEventListener('click', () => {
        const ctx = ctxRef();
        if (!ctx) return;
        ctx.toggleTimePause?.();
        updatePlaybackButton();
    });

    syncInputsFromCtx(true);
    updateButtonState();
    updatePlaybackButton();
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

function formatDatetimeLocal(date) {
    const pad = (value) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hour}:${minute}`;
}

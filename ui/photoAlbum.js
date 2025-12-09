// ========================================
// Photo Album System - 写真撮影・アルバム管理
// ========================================

import { formatCoordinate } from '../data/locations.js';
import { playModeSelectionBgm, playTitleBgm } from './bgmController.js';

const ALBUM_STORAGE_KEY = 'planetarium_album';

export class PhotoAlbumSystem {
    constructor() {
        this.photos = this.loadPhotos();
        this.currentPreviewIndex = -1;
        this.onHomeScreen = true;
        this.initialized = false;
        this.contextProvider = null;
        this.rendererProvider = null;
        this.filters = this.createFilters();
        this.activeFilterId = 'none';
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.setupEventListeners();
        this.setupFilterControls();
    }

    createFilters() {
        return [
            { id: 'none', name: 'フィルターなし', css: 'none' },
            {
                id: 'aurora',
                name: 'オーロラ',
                css: 'contrast(1.05) saturate(1.22) hue-rotate(18deg)',
                overlay: { color: 'rgba(120, 210, 255, 0.16)', mode: 'screen' },
                vignette: 0.2
            },
            {
                id: 'twilight',
                name: 'トワイライト',
                css: 'contrast(1.15) saturate(1.32) brightness(1.05) hue-rotate(-8deg)',
                overlay: { color: 'rgba(255, 170, 120, 0.12)', mode: 'soft-light' },
                vignette: 0.18
            },
            {
                id: 'noir',
                name: 'モノクロ',
                css: 'grayscale(1) contrast(1.25) brightness(0.94)',
                vignette: 0.28
            },
            {
                id: 'lunar',
                name: 'ルナティック',
                css: 'contrast(1.08) saturate(0.95) hue-rotate(155deg)',
                overlay: { color: 'rgba(150, 180, 255, 0.12)', mode: 'screen' },
                vignette: 0.16
            }
        ];
    }

    getActiveFilter() {
        return this.filters.find(f => f.id === this.activeFilterId) || this.filters[0];
    }

    findFilterById(id) {
        return this.filters.find(f => f.id === id);
    }

    loadPhotos() {
        try {
            const stored = localStorage.getItem(ALBUM_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to load photos from storage:', e);
            return [];
        }
    }

    savePhotos() {
        try {
            localStorage.setItem(ALBUM_STORAGE_KEY, JSON.stringify(this.photos));
        } catch (e) {
            console.error('Failed to save photos to storage:', e);
            // ストレージ容量超過の場合、古い写真を削除
            if (e.name === 'QuotaExceededError') {
                this.photos = this.photos.slice(-10); // 最新10枚のみ保持
                try {
                    localStorage.setItem(ALBUM_STORAGE_KEY, JSON.stringify(this.photos));
                } catch (e2) {
                    console.error('Still failed to save after reducing photos:', e2);
                }
            }
        }
    }

    setContextProvider(provider) {
        this.contextProvider = provider;
    }

    setRendererProvider(provider) {
        this.rendererProvider = provider;
    }

    resolveContext(ctxOrProvider = null) {
        if (typeof ctxOrProvider === 'function') {
            return ctxOrProvider();
        }
        if (ctxOrProvider) return ctxOrProvider;
        if (typeof this.contextProvider === 'function') {
            return this.contextProvider();
        }
        return this.contextProvider;
    }

    resolveRenderer(rendererOrProvider = null, ctx = null) {
        const candidate = typeof rendererOrProvider === 'function'
            ? rendererOrProvider(ctx)
            : rendererOrProvider;

        if (!candidate) return null;
        if (candidate.isWebGLRenderer) return candidate;
        if (candidate.renderer?.isWebGLRenderer) return candidate.renderer;
        return null;
    }

    getSimulatedDate(ctx) {
        const date = ctx?.getSimulatedDate?.();
        return (date instanceof Date && !Number.isNaN(date.getTime())) ? date : null;
    }

    getLocationMetadata(ctx) {
        const info = ctx?.observerLocationInfo || {};
        const lat = Number.isFinite(ctx?.observer?.lat) ? ctx.observer.lat : info.lat;
        const lon = Number.isFinite(ctx?.observer?.lon) ? ctx.observer.lon : info.lon;
        return {
            name: info.name || 'カスタム地点',
            nameEn: info.nameEn,
            icon: info.icon || '📍',
            lat: Number.isFinite(lat) ? lat : null,
            lon: Number.isFinite(lon) ? lon : null
        };
    }

    formatLocationLabel(location) {
        if (!location) return '📍 位置情報なし';
        const name = location.name || 'カスタム地点';
        const english = location.nameEn ? ` (${location.nameEn})` : '';
        const hasCoords = Number.isFinite(location.lat) && Number.isFinite(location.lon);
        const coords = hasCoords
            ? `${formatCoordinate(location.lat, true)} / ${formatCoordinate(location.lon, false)}`
            : '位置情報なし';
        return `${location.icon || '📍'} ${name}${english} | ${coords}`;
    }

    getDisplayDate(photo) {
        if (photo?.simulatedAt) {
            const simDate = new Date(photo.simulatedAt);
            if (!Number.isNaN(simDate.getTime())) {
                return this.formatDate(simDate);
            }
        }
        return photo?.date || '';
    }

    getLocationLabelFromPhoto(photo) {
        if (!photo) return '📍 位置情報なし';
        if (photo.locationLabel) return photo.locationLabel;
        if (photo.location) return this.formatLocationLabel(photo.location);
        return '📍 位置情報なし';
    }

    getFilterLabelFromPhoto(photo) {
        if (!photo) return 'フィルターなし';
        if (photo.filterName) return `フィルター: ${photo.filterName}`;
        const filter = this.findFilterById(photo.filterId);
        return filter ? `フィルター: ${filter.name}` : 'フィルター: なし';
    }

    async capturePhoto(rendererOrProvider = null, ctxProvider = null) {
        const ctx = this.resolveContext(ctxProvider);
        const renderer = this.resolveRenderer(rendererOrProvider || this.rendererProvider, ctx);
        if (!renderer?.domElement) {
            throw new Error('Renderer is not available for photo capture.');
        }
        const now = new Date();
        const simulatedDate = this.getSimulatedDate(ctx) || now;
        const location = this.getLocationMetadata(ctx);

        // キャンバスからデータを取得
        const canvas = renderer.domElement;
        const baseDataUrl = canvas.toDataURL('image/png');
        const { dataUrl, filter } = await this.applyFilterToDataUrl(baseDataUrl);
        
        const photo = {
            id: Date.now(),
            dataUrl,
            timestamp: now.toISOString(),
            date: this.formatDate(simulatedDate),
            simulatedAt: simulatedDate.toISOString(),
            location,
            locationLabel: this.formatLocationLabel(location),
            filterId: filter?.id || 'none',
            filterName: filter?.name || 'フィルターなし'
        };
        
        this.photos.push(photo);
        this.savePhotos();
        
        // フラッシュエフェクト
        this.showFlash();
        
        // 通知を表示
        this.showNotification();
        
        return photo;
    }

    async applyFilterToDataUrl(baseDataUrl) {
        const filter = this.getActiveFilter();
        if (!filter || filter.id === 'none') {
            return { dataUrl: baseDataUrl, filter: this.findFilterById('none') };
        }

        return new Promise((resolve) => {
            const image = new Image();
            image.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = image.width;
                    canvas.height = image.height;
                    const ctx = canvas.getContext('2d');
                    ctx.filter = filter.css || 'none';
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

                    if (filter.overlay) {
                        ctx.save();
                        ctx.globalCompositeOperation = filter.overlay.mode || 'screen';
                        ctx.globalAlpha = filter.overlay.opacity ?? 1;
                        ctx.fillStyle = filter.overlay.color || 'rgba(255,255,255,0.1)';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.restore();
                    }

                    if (filter.vignette) {
                        this.applyVignette(ctx, canvas.width, canvas.height, filter.vignette);
                    }

                    const filteredDataUrl = canvas.toDataURL('image/png');
                    resolve({ dataUrl: filteredDataUrl, filter });
                } catch (e) {
                    console.error('Failed to apply filter. Falling back to original image.', e);
                    resolve({ dataUrl: baseDataUrl, filter: this.findFilterById('none') });
                }
            };
            image.onerror = () => resolve({ dataUrl: baseDataUrl, filter: this.findFilterById('none') });
            image.src = baseDataUrl;
        });
    }

    applyVignette(ctx, width, height, strength = 0.2) {
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, Math.min(width, height) * (0.4 + strength * 0.2),
            width / 2, height / 2, Math.max(width, height) * (0.7 + strength * 0.3)
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${0.45 * strength})`);
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }

    showFlash() {
        const flash = document.getElementById('capture-flash');
        if (flash) {
            flash.classList.add('flash');
            setTimeout(() => {
                flash.classList.remove('flash');
            }, 150);
        }
    }

    showNotification() {
        const notification = document.getElementById('capture-notification');
        if (notification) {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 2000);
        }
    }

    deletePhoto(id) {
        this.photos = this.photos.filter(p => p.id !== id);
        this.savePhotos();
        this.renderAlbumGrid();
    }

    downloadPhoto(id) {
        const photo = this.photos.find(p => p.id === id);
        if (!photo) return;
        
        const link = document.createElement('a');
        link.href = photo.dataUrl;
        const dateLabel = this.getDisplayDate(photo) || photo.date || 'photo';
        link.download = `planetarium_${dateLabel.replace(/[\/\s:]/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    formatDate(date) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    renderAlbumGrid() {
        const grid = document.getElementById('album-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (this.photos.length === 0) {
            grid.innerHTML = `
                <div class="album-empty">
                    <span class="album-empty-icon">📷</span>
                    <span class="album-empty-text">まだ写真がありません</span>
                    <span style="margin-top: 10px; opacity: 0.5; font-size: 14px;">フォトモードで撮影してください</span>
                </div>
            `;
            return;
        }
        
        // 新しい順に表示
        const sortedPhotos = [...this.photos].reverse();
        
        sortedPhotos.forEach((photo, idx) => {
            const item = document.createElement('div');
            item.className = 'album-item';
            const dateLabel = this.getDisplayDate(photo);
            const locationLabel = this.getLocationLabelFromPhoto(photo);
            const filterLabel = this.getFilterLabelFromPhoto(photo);
            item.innerHTML = `
                <img src="${photo.dataUrl}" alt="Photo ${idx + 1}">
                <div class="album-item-overlay">
                    <div class="album-item-meta">
                        <span class="album-item-date">${dateLabel}</span>
                        <span class="album-item-location">${locationLabel}</span>
                        <span class="album-item-filter">${filterLabel}</span>
                    </div>
                    <button class="album-item-delete" data-id="${photo.id}">✕</button>
                </div>
            `;
            
            // クリックでプレビュー
            item.querySelector('img').addEventListener('click', () => {
                this.openPreview(photo.id);
            });
            
            // 削除ボタン
            item.querySelector('.album-item-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('この写真を削除しますか？')) {
                    this.deletePhoto(photo.id);
                }
            });
            
            grid.appendChild(item);
        });
    }

    openPreview(id) {
        const photo = this.photos.find(p => p.id === id);
        if (!photo) return;
        
        this.currentPreviewIndex = id;
        const preview = document.getElementById('photo-preview');
        const image = document.getElementById('preview-image');
        const meta = document.getElementById('preview-meta');
        
        if (preview && image) {
            image.src = photo.dataUrl;
            if (meta) {
                const dateLabel = this.getDisplayDate(photo);
                const locationLabel = this.getLocationLabelFromPhoto(photo);
                const filterLabel = this.getFilterLabelFromPhoto(photo);
                meta.textContent = `${dateLabel} | ${locationLabel} | ${filterLabel}`;
            }
            preview.classList.remove('hidden');
        }
    }

    closePreview() {
        const preview = document.getElementById('photo-preview');
        if (preview) {
            preview.classList.add('hidden');
        }
        this.currentPreviewIndex = -1;
    }

    setupEventListeners() {
        // 画面遷移ボタン
        const albumBackBtn = document.getElementById('album-back');
        
        if (albumBackBtn) {
            albumBackBtn.addEventListener('click', () => {
                this.backToModeSelector();
            });
        }
        
        // プレビュー関連
        const previewClose = document.getElementById('preview-close');
        const previewDownload = document.getElementById('preview-download');
        const previewDelete = document.getElementById('preview-delete');
        
        if (previewClose) {
            previewClose.addEventListener('click', () => {
                this.closePreview();
            });
        }
        
        if (previewDownload) {
            previewDownload.addEventListener('click', () => {
                if (this.currentPreviewIndex !== -1) {
                    this.downloadPhoto(this.currentPreviewIndex);
                }
            });
        }
        
        if (previewDelete) {
            previewDelete.addEventListener('click', () => {
                if (this.currentPreviewIndex !== -1) {
                    if (confirm('この写真を削除しますか？')) {
                        this.deletePhoto(this.currentPreviewIndex);
                        this.closePreview();
                    }
                }
            });
        }
        
        // プレビューの背景クリックで閉じる
        const previewEl = document.getElementById('photo-preview');
        if (previewEl) {
            previewEl.addEventListener('click', (e) => {
                if (e.target === previewEl) {
                    this.closePreview();
                }
            });
        }
        
        // ESCキーでプレビューを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const preview = document.getElementById('photo-preview');
                if (preview && !preview.classList.contains('hidden')) {
                    this.closePreview();
                }
            }
        });

        // 初期フィルター反映
        this.applyFilterPreview(this.getActiveFilter());
    }

    setupFilterControls() {
        const filterButtons = Array.from(document.querySelectorAll('[data-photo-filter]'));
        if (!filterButtons.length) return;

        filterButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                this.setActiveFilter(btn.dataset.photoFilter);
            });
        });

        this.updateFilterActiveState();
    }

    setActiveFilter(filterId) {
        const valid = this.filters.some(f => f.id === filterId);
        this.activeFilterId = valid ? filterId : 'none';
        const filter = this.getActiveFilter();
        this.updateFilterActiveState();
        this.applyFilterPreview(filter);
    }

    updateFilterActiveState() {
        const filterButtons = document.querySelectorAll('[data-photo-filter]');
        filterButtons.forEach((btn) => {
            const active = btn.dataset.photoFilter === this.activeFilterId;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }

    applyFilterPreview(filter) {
        const rootStyle = document.documentElement.style;
        const overlay = filter?.overlay || {};
        const vignetteStrength = filter?.vignette || 0;
        rootStyle.setProperty('--photo-filter-css', filter?.css || 'none');
        rootStyle.setProperty('--photo-filter-overlay-color', overlay.color || 'rgba(0,0,0,0)');
        rootStyle.setProperty('--photo-filter-overlay-blend', overlay.mode || 'screen');
        const overlayOpacity = Number.isFinite(overlay.opacity) ? overlay.opacity : 1;
        rootStyle.setProperty('--photo-filter-overlay-opacity', overlay.color ? overlayOpacity : 0);
        rootStyle.setProperty('--photo-filter-vignette-strength', vignetteStrength);
        rootStyle.setProperty('--photo-filter-vignette-alpha', (0.45 * vignetteStrength).toFixed(3));
    }

    openAlbum() {
        const homeScreen = document.getElementById('home-screen');
        const albumScreen = document.getElementById('album-screen');

        if (homeScreen) {
            homeScreen.classList.add('hidden');
        }
        if (albumScreen) {
            albumScreen.classList.remove('hidden');
            this.renderAlbumGrid();
        }

        this.onHomeScreen = false;
        document.body.classList.remove('home-visible');
        playModeSelectionBgm();
    }

    backToModeSelector() {
        const homeScreen = document.getElementById('home-screen');
        const modeScreen = document.getElementById('mode-screen');
        const albumScreen = document.getElementById('album-screen');

        if (homeScreen) {
            homeScreen.classList.remove('hidden');
        }
        if (modeScreen) {
            modeScreen.classList.remove('hidden');
        }
        if (albumScreen) {
            albumScreen.classList.add('hidden');
        }

        this.onHomeScreen = true;
        document.body.classList.add('mode-screen-visible');
        document.body.classList.remove('home-visible');
        playModeSelectionBgm();
    }

    showHomeFromPlanetarium() {
        const homeScreen = document.getElementById('home-screen');
        if (homeScreen) {
            homeScreen.classList.remove('hidden');
        }
        this.onHomeScreen = true;
        document.body.classList.add('home-visible');
        playTitleBgm();
    }

    isOnHomeScreen() {
        return this.onHomeScreen;
    }
}

// シングルトンインスタンスをエクスポート
let instance = null;

export function getPhotoAlbumSystem() {
    if (!instance) {
        instance = new PhotoAlbumSystem();
    }
    return instance;
}

export function setupPhotoCaptureButton(rendererProvider, contextProvider = null) {
    const albumSystem = getPhotoAlbumSystem();
    albumSystem.setContextProvider(contextProvider);
    albumSystem.setRendererProvider(rendererProvider);
    
    // DOMが準備できてからイベントリスナーを設定
    albumSystem.init();
    
    const captureBtn = document.getElementById('capture-photo-btn');
    
    if (captureBtn && !captureBtn.dataset.listenerAttached) {
        captureBtn.dataset.listenerAttached = 'true';
        captureBtn.addEventListener('click', async () => {
            try {
                await albumSystem.capturePhoto();
            } catch (e) {
                console.error('Failed to capture photo:', e);
            }
        });
    }
}

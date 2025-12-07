// ========================================
// Photo Album System - 写真撮影・アルバム管理
// ========================================

import { formatCoordinate } from '../data/locations.js';

const ALBUM_STORAGE_KEY = 'planetarium_album';
const SCREEN_FADE_MS = 600; // Keep in sync with CSS --screen-fade-duration

export class PhotoAlbumSystem {
    constructor() {
        this.photos = this.loadPhotos();
        this.currentPreviewIndex = -1;
        this.onHomeScreen = true;
        this.initialized = false;
        this.contextProvider = null;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.setupEventListeners();
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

    capturePhoto(renderer, ctxProvider = null) {
        return new Promise((resolve, reject) => {
            try {
                const ctx = this.resolveContext(ctxProvider);
                const now = new Date();
                const simulatedDate = this.getSimulatedDate(ctx) || now;
                const location = this.getLocationMetadata(ctx);

                // キャンバスからデータを取得
                const canvas = renderer.domElement;
                const dataUrl = canvas.toDataURL('image/png');
                
                const photo = {
                    id: Date.now(),
                    dataUrl: dataUrl,
                    timestamp: now.toISOString(),
                    date: this.formatDate(simulatedDate),
                    simulatedAt: simulatedDate.toISOString(),
                    location,
                    locationLabel: this.formatLocationLabel(location)
                };
                
                this.photos.push(photo);
                this.savePhotos();
                
                // フラッシュエフェクト
                this.showFlash();
                
                // 通知を表示
                this.showNotification();
                
                resolve(photo);
            } catch (e) {
                reject(e);
            }
        });
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
            item.innerHTML = `
                <img src="${photo.dataUrl}" alt="Photo ${idx + 1}">
                <div class="album-item-overlay">
                    <div class="album-item-meta">
                        <span class="album-item-date">${dateLabel}</span>
                        <span class="album-item-location">${locationLabel}</span>
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
                meta.textContent = `${dateLabel} | ${locationLabel}`;
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
        // ホーム画面のボタン
        const openAlbumBtn = document.getElementById('open-album');
        const albumBackBtn = document.getElementById('album-back');
        
        // enter-planetarium ボタンは interactionController.js で処理されるため、ここでは設定しない
        
        if (openAlbumBtn) {
            openAlbumBtn.addEventListener('click', () => {
                this.openAlbum();
            });
        }
        
        if (albumBackBtn) {
            albumBackBtn.addEventListener('click', () => {
                this.backToHome();
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

        document.body.classList.remove('home-visible');
    }

    backToHome() {
        const homeScreen = document.getElementById('home-screen');
        const albumScreen = document.getElementById('album-screen');

        // フェードアウト・フェードイン トランジション
        // ホーム画面(z-index:2000)がアルバム画面(z-index:1500)より上にあるため、
        // 先にホーム画面を表示してからアルバムをフェードアウトすることで
        // 背後のプラネタリウムが見えないようにする

        // 1. ホーム画面を透明状態で表示（アルバムの上に重なる）
        if (homeScreen) {
            homeScreen.classList.add('fading-in');
            homeScreen.classList.remove('hidden');
            
            // 次のフレームでフェードインを開始
            requestAnimationFrame(() => {
                homeScreen.classList.remove('fading-in');
            });
        }

        // 2. ホーム画面のフェードイン完了後にアルバム画面を非表示
        setTimeout(() => {
            if (albumScreen) {
                albumScreen.classList.add('hidden');
            }
        }, SCREEN_FADE_MS); // ホーム画面のトランジション完了を待つ

        this.onHomeScreen = true;
        document.body.classList.add('home-visible');
    }

    showHomeFromPlanetarium() {
        const homeScreen = document.getElementById('home-screen');
        if (homeScreen) {
            homeScreen.classList.remove('hidden');
        }
        this.onHomeScreen = true;
        document.body.classList.add('home-visible');
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

export function setupPhotoCaptureButton(renderer, contextProvider = null) {
    const albumSystem = getPhotoAlbumSystem();
    albumSystem.setContextProvider(contextProvider);
    
    // DOMが準備できてからイベントリスナーを設定
    albumSystem.init();
    
    const captureBtn = document.getElementById('capture-photo-btn');
    
    if (captureBtn && !captureBtn.dataset.listenerAttached) {
        captureBtn.dataset.listenerAttached = 'true';
        captureBtn.addEventListener('click', async () => {
            try {
                await albumSystem.capturePhoto(renderer);
            } catch (e) {
                console.error('Failed to capture photo:', e);
            }
        });
    }
}

// ========================================
// Photo Album System - 写真撮影・アルバム管理
// ========================================

const ALBUM_STORAGE_KEY = 'planetarium_album';

export class PhotoAlbumSystem {
    constructor() {
        this.photos = this.loadPhotos();
        this.currentPreviewIndex = -1;
        this.onHomeScreen = true;
        this.initialized = false;
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

    capturePhoto(renderer) {
        return new Promise((resolve, reject) => {
            try {
                // キャンバスからデータを取得
                const canvas = renderer.domElement;
                const dataUrl = canvas.toDataURL('image/png');
                
                const photo = {
                    id: Date.now(),
                    dataUrl: dataUrl,
                    timestamp: new Date().toISOString(),
                    date: this.formatDate(new Date())
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
        link.download = `planetarium_${photo.date.replace(/[\/\s:]/g, '_')}.png`;
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
            item.innerHTML = `
                <img src="${photo.dataUrl}" alt="Photo ${idx + 1}">
                <div class="album-item-overlay">
                    <span class="album-item-date">${photo.date}</span>
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
        
        if (preview && image) {
            image.src = photo.dataUrl;
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
        const enterPlanetariumBtn = document.getElementById('enter-planetarium');
        const openAlbumBtn = document.getElementById('open-album');
        const albumBackBtn = document.getElementById('album-back');
        
        if (enterPlanetariumBtn) {
            enterPlanetariumBtn.addEventListener('click', () => {
                this.enterPlanetarium();
            });
        }
        
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

    enterPlanetarium() {
        const homeScreen = document.getElementById('home-screen');
        if (homeScreen) {
            homeScreen.classList.add('hidden');
        }
        this.onHomeScreen = false;
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
    }

    backToHome() {
        const homeScreen = document.getElementById('home-screen');
        const albumScreen = document.getElementById('album-screen');
        
        if (albumScreen) {
            albumScreen.classList.add('hidden');
        }
        if (homeScreen) {
            homeScreen.classList.remove('hidden');
        }
        this.onHomeScreen = true;
    }

    showHomeFromPlanetarium() {
        const homeScreen = document.getElementById('home-screen');
        if (homeScreen) {
            homeScreen.classList.remove('hidden');
        }
        this.onHomeScreen = true;
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

export function setupPhotoCaptureButton(renderer) {
    const albumSystem = getPhotoAlbumSystem();
    
    // DOMが準備できてからイベントリスナーを設定
    albumSystem.init();
    
    const captureBtn = document.getElementById('capture-photo-btn');
    
    if (captureBtn) {
        captureBtn.addEventListener('click', async () => {
            try {
                await albumSystem.capturePhoto(renderer);
            } catch (e) {
                console.error('Failed to capture photo:', e);
            }
        });
    }
}

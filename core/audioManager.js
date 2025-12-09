import { normalizeSurfaceType } from './settings.js';

export class AudioManager {
    constructor() {
        this.bgmAudio = null;
        this.envAudio = null;
        this.currentEnvSoundPath = null;
        this.audioReady = false;
        this.bgmPlaylist = [];
        this.bgmCurrentIndex = 0;
        this.isPlaying = false;
    }

    setAudioReady(ready) {
        this.audioReady = ready;
    }

    async loadBgmPlaylist() {
        const bgmBasePath = 'bgm/planetarium/';
        const bgmFiles = [
            `${bgmBasePath}Weightless Dreaming.mp3`
        ];
        this.bgmPlaylist = bgmFiles;
        this.bgmCurrentIndex = 0;
    }

    async startBgm() {
        if (this.isPlaying) return;

        if (this.bgmPlaylist.length === 0) {
            await this.loadBgmPlaylist();
        }

        if (this.bgmPlaylist.length === 0) {
            console.warn('BGMファイルが見つかりません');
            return;
        }

        this.playCurrentTrack();
    }

    playCurrentTrack() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio = null;
        }

        const trackPath = this.bgmPlaylist[this.bgmCurrentIndex];
        this.bgmAudio = new Audio(trackPath);
        this.bgmAudio.volume = 0.5;

        this.bgmAudio.addEventListener('ended', () => {
            this.bgmCurrentIndex = (this.bgmCurrentIndex + 1) % this.bgmPlaylist.length;
            if (this.isPlaying) {
                this.playCurrentTrack();
            }
        });

        this.bgmAudio.play().catch((err) => {
            console.error('BGM再生エラー:', err);
        });
        this.isPlaying = true;
    }

    stopBgm() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
        }
        this.isPlaying = false;
    }

    startAmbientSound() {
        this.startBgm();
    }

    stopAmbientSound() {
        this.stopBgm();
    }

    getEnvironmentSoundPath(surfaceType = 'water') {
        const normalized = normalizeSurfaceType(surfaceType);
        const envMap = {
            water: 'env_sound/sea.mp3',
            grass: 'env_sound/grassland.mp3',
            desert: 'env_sound/grassland.mp3',
            ice: 'env_sound/sea.mp3'
        };
        return envMap[normalized] || envMap.water;
    }

    startEnvironmentSound(surfaceType = 'water') {
        if (!this.audioReady) return;
        const trackPath = this.getEnvironmentSoundPath(surfaceType);
        if (!trackPath) {
            console.warn('環境音ファイルが見つかりません');
            return;
        }

        if (this.envAudio) {
            if (this.currentEnvSoundPath === trackPath && !this.envAudio.paused) {
                return;
            }
            this.envAudio.pause();
            this.envAudio = null;
        }

        this.envAudio = new Audio(trackPath);
        this.envAudio.loop = true;
        this.envAudio.volume = 0.4;
        this.currentEnvSoundPath = trackPath;
        this.envAudio.play().catch((err) => {
            console.error('環境音再生エラー:', err);
        });
    }

    stopEnvironmentSound() {
        if (!this.envAudio) return;
        this.envAudio.pause();
        this.envAudio.currentTime = 0;
        this.envAudio = null;
        this.currentEnvSoundPath = null;
    }

    updateEnvironmentSoundForSurface(surfaceType = 'water', settings = {}) {
        if (!settings.playEnvSound || !this.audioReady) return;
        this.startEnvironmentSound(surfaceType);
    }
}

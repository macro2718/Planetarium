const PLAYLISTS = {
    title: ['bgm/title/Starlight Drift.mp3'],
    menu: ['bgm/mode_selection/Whispers in the Quiet.mp3']
};

let currentScene = null;
let uiAudio = null;
let playlist = [];
let playlistIndex = 0;

function startTrack(index = 0) {
    if (!playlist.length) return;

    playlistIndex = index % playlist.length;

    if (uiAudio) {
        uiAudio.pause();
        uiAudio = null;
    }

    const src = playlist[playlistIndex];
    uiAudio = new Audio(src);
    uiAudio.volume = 0.5;
    uiAudio.loop = playlist.length === 1;
    uiAudio.addEventListener('ended', () => {
        if (playlist.length <= 1) return;
        startTrack((playlistIndex + 1) % playlist.length);
    });

    uiAudio.play().catch((err) => {
        console.error('UI BGM再生エラー:', err);
    });
}

function playScene(scene) {
    if (scene === 'planetarium') {
        stopUiBgm();
        currentScene = 'planetarium';
        return;
    }

    const next = PLAYLISTS[scene] || [];
    if (!next.length) {
        console.warn(`BGMプレイリストが見つかりません: ${scene}`);
        stopUiBgm();
        currentScene = scene;
        return;
    }

    const sameScene = currentScene === scene;
    currentScene = scene;
    playlist = next.slice();

    if (sameScene && uiAudio && !uiAudio.paused) return;

    startTrack(0);
}

export function playTitleBgm() {
    playScene('title');
}

export function playModeSelectionBgm() {
    playScene('menu');
}

export function enterPlanetariumScene() {
    playScene('planetarium');
}

export function stopUiBgm() {
    if (uiAudio) {
        uiAudio.pause();
        uiAudio.currentTime = 0;
    }
    uiAudio = null;
    playlist = [];
    playlistIndex = 0;
}

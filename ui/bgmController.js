const MODE_SELECTION_TRACKS = ['bgm/mode_selection/Whispers in the Quiet.mp3'];

const PLAYLISTS = {
    title: MODE_SELECTION_TRACKS,
    menu: MODE_SELECTION_TRACKS
};

let currentScene = null;
let uiAudio = null;
let playlist = [];
let playlistSourceRef = null;
let playlistIndex = 0;
let awaitingUserInteraction = false;

function requestUserResume() {
    if (awaitingUserInteraction) return;
    awaitingUserInteraction = true;

    const resumePlayback = () => {
        awaitingUserInteraction = false;
        if (uiAudio) {
            uiAudio.play().catch((err) => {
                console.error('UI BGM再生リトライ失敗:', err);
            });
            return;
        }
        if (playlist.length) {
            startTrack(playlistIndex);
        }
    };

    ['pointerdown', 'touchstart', 'keydown'].forEach((eventName) => {
        document.addEventListener(eventName, resumePlayback, { once: true });
    });
}

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
        requestUserResume();
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
    const samePlaylist = playlistSourceRef && playlistSourceRef === next;
    currentScene = scene;

    if (samePlaylist && uiAudio) {
        if (uiAudio.paused) {
            uiAudio.play().catch((err) => {
                console.error('UI BGM再生エラー (再開):', err);
                requestUserResume();
            });
        }
        return;
    }

    playlistSourceRef = next;
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
    playlistSourceRef = null;
    playlist = [];
    playlistIndex = 0;
}

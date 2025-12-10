import { getUiBgmVolume, setUiBgmVolume } from './bgmController.js';

function clampLevel(level) {
    return Math.min(10, Math.max(0, Math.round(level)));
}

function updateVolumeUI(level, elements) {
    const clamped = clampLevel(level);
    const normalized = clamped / 10;
    const { slider, value, panel } = elements;

    slider.value = clamped;
    value.textContent = `${clamped} / 10`;
    setUiBgmVolume(normalized);
}

function togglePanel(overlay, toggle) {
    const isOpen = overlay.classList.toggle('open');
    toggle.classList.toggle('active', isOpen);
    return isOpen;
}

export function initHomeSettingsPanel() {
    const toggle = document.getElementById('home-settings-toggle');
    const overlay = document.getElementById('home-settings-overlay');
    const panel = document.getElementById('home-settings-panel');
    const slider = document.getElementById('ui-bgm-volume');
    const value = document.getElementById('ui-bgm-volume-value');

    if (!toggle || !overlay || !panel || !slider || !value) return;

    const elements = { slider, value, panel };
    updateVolumeUI(getUiBgmVolume() * 10, elements);

    toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        togglePanel(overlay, toggle);
    });

    slider.addEventListener('input', (event) => {
        const nextLevel = Number(event.target.value);
        updateVolumeUI(nextLevel, elements);
    });

    document.addEventListener('click', (event) => {
        if (panel.contains(event.target) || toggle.contains(event.target)) return;
        if (!overlay.classList.contains('open')) return;
        overlay.classList.remove('open');
        toggle.classList.remove('active');
    });
}

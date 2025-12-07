let panelEl = null;
let styleInjected = false;

function ensurePanel() {
    if (!panelEl) {
        panelEl = document.createElement('div');
        panelEl.className = 'event-effect-panel hidden';
        panelEl.innerHTML = `
            <div class="event-effect-content">
                <div class="event-effect-heading"></div>
                <div class="event-effect-body"></div>
            </div>
        `;
        document.body.appendChild(panelEl);
    }
    if (!styleInjected) {
        const style = document.createElement('style');
        style.textContent = `
            .event-effect-panel {
                position: fixed;
                left: 24px;
                bottom: 24px;
                max-width: 360px;
                background: rgba(8, 12, 32, 0.75);
                color: #e8f5ff;
                border: 1px solid rgba(135, 196, 255, 0.4);
                border-radius: 12px;
                padding: 16px 18px;
                box-shadow: 0 14px 42px rgba(0, 0, 0, 0.45);
                backdrop-filter: blur(10px);
                z-index: 1200;
                transition: opacity 0.2s ease, transform 0.25s ease;
                opacity: 1;
                transform: translateY(0);
            }
            .event-effect-panel.hidden {
                opacity: 0;
                transform: translateY(12px);
                pointer-events: none;
            }
            .event-effect-content {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .event-effect-heading {
                font-size: 14px;
                letter-spacing: 0.08em;
                color: #9bd0ff;
                font-weight: 700;
            }
            .event-effect-body {
                font-size: 13px;
                line-height: 1.6;
            }
        `;
        document.head.appendChild(style);
        styleInjected = true;
    }
}

export function showEventEffectPanel({ title, body }) {
    ensurePanel();
    const heading = panelEl.querySelector('.event-effect-heading');
    const content = panelEl.querySelector('.event-effect-body');
    if (heading) heading.textContent = title || '';
    if (content) content.textContent = body || '';
    panelEl.classList.remove('hidden');
}

export function hideEventEffectPanel() {
    if (!panelEl) return;
    panelEl.classList.add('hidden');
}

import * as THREE from '../../three.module.js';

export function createSpineTexture(title, subtitle, baseColor, accentColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Deep leather base with subtle warm banding.
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, toRgba(baseColor, 1));
    gradient.addColorStop(0.22, toRgba(accentColor, 0.95));
    gradient.addColorStop(0.5, toRgba(baseColor, 0.98));
    gradient.addColorStop(0.78, toRgba(accentColor, 0.96));
    gradient.addColorStop(1, toRgba(baseColor, 1));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Darkened edges to give the spine thickness.
    const edgeShade = ctx.createLinearGradient(0, 0, width, 0);
    edgeShade.addColorStop(0, 'rgba(10, 6, 4, 0.52)');
    edgeShade.addColorStop(0.22, 'rgba(10, 6, 4, 0)');
    edgeShade.addColorStop(0.78, 'rgba(10, 6, 4, 0)');
    edgeShade.addColorStop(1, 'rgba(10, 6, 4, 0.48)');
    ctx.fillStyle = edgeShade;
    ctx.fillRect(0, 0, width, height);

    // Central burnished bulge.
    const centerGlow = ctx.createRadialGradient(width / 2, height / 2, width * 0.1, width / 2, height / 2, width * 0.8);
    centerGlow.addColorStop(0, 'rgba(255, 226, 200, 0.08)');
    centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, width, height);

    // Leather grain and scuffs for weight.
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    for (let i = 0; i < 1200; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const len = 14 + Math.random() * 34;
        const curve = (Math.random() - 0.5) * 0.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len * 0.3, y + len * curve, x + len, y + len * 0.12);
        ctx.stroke();
    }
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 600; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 10 + Math.random() * 22;
        const shade = Math.random() > 0.5 ? 'rgba(0, 0, 0, 0.35)' : 'rgba(255, 255, 255, 0.16)';
        ctx.fillStyle = shade;
        ctx.fillRect(x, y, size * 0.4, size);
    }
    ctx.restore();

    // Raised bands along the spine.
    const bandHeights = [0.2, 0.8];
    bandHeights.forEach((ratio) => {
        const bandY = ratio * height;
        const bandH = 70;
        const band = ctx.createLinearGradient(0, bandY - bandH / 2, 0, bandY + bandH / 2);
        band.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
        band.addColorStop(0.35, 'rgba(255, 235, 200, 0.28)');
        band.addColorStop(0.5, 'rgba(255, 255, 255, 0.42)');
        band.addColorStop(0.65, 'rgba(255, 235, 200, 0.26)');
        band.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        ctx.fillStyle = band;
        ctx.fillRect(60, bandY - bandH / 2, width - 120, bandH);

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 6;
        ctx.strokeRect(60, bandY - bandH / 2, width - 120, bandH);
    });

    // Top and bottom metal caps.
    const capHeight = 94;
    ['top', 'bottom'].forEach((pos, idx) => {
        const y = pos === 'top' ? 18 : height - capHeight - 18;
        const grad = ctx.createLinearGradient(0, y, 0, y + capHeight);
        grad.addColorStop(0, 'rgba(255, 248, 230, 0.38)');
        grad.addColorStop(0.45, toRgba(accentColor, 0.66));
        grad.addColorStop(0.9, 'rgba(40, 26, 16, 0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(32, y, width - 64, capHeight);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 6;
        ctx.strokeRect(32, y, width - 64, capHeight);

        const rivetXs = [width * 0.22, width * 0.5, width * 0.78];
        rivetXs.forEach((rx) => {
            const ry = y + capHeight * (idx === 0 ? 0.3 : 0.7);
            const rivet = ctx.createRadialGradient(rx, ry, 4, rx, ry, 16);
            rivet.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            rivet.addColorStop(0.4, 'rgba(210, 210, 210, 0.8)');
            rivet.addColorStop(1, 'rgba(40, 26, 16, 0.8)');
            ctx.fillStyle = rivet;
            ctx.beginPath();
            ctx.arc(rx, ry, 14, 0, Math.PI * 2);
            ctx.fill();
        });
    });

    // Ornamental crest at center.
    const crestY = height * 0.52;
    const crestR = 86;
    const crest = ctx.createRadialGradient(width * 0.28, crestY, crestR * 0.25, width * 0.28, crestY, crestR);
    crest.addColorStop(0, 'rgba(255, 242, 220, 0.65)');
    crest.addColorStop(0.4, 'rgba(255, 220, 150, 0.38)');
    crest.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
    ctx.fillStyle = crest;
    ctx.beginPath();
    ctx.arc(width * 0.28, crestY, crestR, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(width * 0.28, crestY);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(40, 26, 16, 0.85)';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const inner = 24;
        const outer = 56;
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.lineTo(Math.cos(angle + Math.PI / 8) * inner, Math.sin(angle + Math.PI / 8) * inner);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Heavy frame lines.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 9;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Foil sheen that catches the light as books tilt.
    const foil = ctx.createLinearGradient(0, 0, width, height);
    foil.addColorStop(0, 'rgba(255, 245, 230, 0.22)');
    foil.addColorStop(0.48, 'rgba(255, 255, 255, 0.08)');
    foil.addColorStop(1, 'rgba(190, 220, 255, 0.18)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = foil;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // Subtle diagonal brushed texture.
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 2;
    for (let y = -height; y < height * 1.5; y += 56) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y + width * 0.5);
        ctx.stroke();
    }
    ctx.restore();

    // Vignette for depth.
    const vignette = ctx.createLinearGradient(0, 0, 0, height);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0.22)');
    vignette.addColorStop(0.12, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.88, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const safeTitle = (title || '').trim() || '星座';
    const titleLength = Array.from(safeTitle).length;
    const titleSize = Math.max(84, Math.min(96, 100 - Math.max(0, titleLength - 6) * 4));
    ctx.save();
    ctx.translate(width * 0.5, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = `${titleSize}px "Zen Kaku Gothic New", "Space Grotesk", sans-serif`;
    const titleGradient = ctx.createLinearGradient(0, -width * 0.12, 0, width * 0.12);
    titleGradient.addColorStop(0, 'rgba(255, 250, 240, 0.95)');
    titleGradient.addColorStop(1, 'rgba(210, 224, 255, 0.85)');
    ctx.fillStyle = titleGradient;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 3.5;
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.strokeText(safeTitle, 0, 0);
    ctx.shadowBlur = 0.5;
    ctx.fillText(safeTitle, 0, 0);
    ctx.restore();

    const safeSubtitle = (subtitle || '').trim() || 'CONSTELLATION';
    const subtitleLength = Array.from(safeSubtitle).length;
    const subtitleSize = Math.max(34, Math.min(50, 56 - Math.max(0, subtitleLength - 8) * 2));
    ctx.save();
    ctx.translate(width * 0.82, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = `${subtitleSize}px "Space Grotesk", "Zen Kaku Gothic New", sans-serif`;
    ctx.fillStyle = 'rgba(210, 230, 255, 0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 2.4;
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.strokeText(safeSubtitle, 0, width * -0.06);
    ctx.shadowBlur = 0.6;
    ctx.fillText(safeSubtitle, 0, width * -0.06);
    ctx.restore();

    return new THREE.CanvasTexture(canvas);
}

function toRgba(color, alpha = 1) {
    const c = new THREE.Color(color);
    const r = Math.round(c.r * 255);
    const g = Math.round(c.g * 255);
    const b = Math.round(c.b * 255);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function pickAccentColor(name, index) {
    const palette = [0x3f2b24, 0x4b332b, 0x2f3b4f, 0x2b3c32, 0x553a2a, 0x2e273d, 0x3f5667];
    const hash = Array.from(name || '').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[(hash + index) % palette.length];
}

export function createWoodTextures(anisotropy = 4) {
    const { colorCanvas, normalCanvas } = generateWoodGrainCanvases();
    const repeat = new THREE.Vector2(4.5, 2.4);

    const colorMap = new THREE.CanvasTexture(colorCanvas);
    colorMap.wrapS = THREE.RepeatWrapping;
    colorMap.wrapT = THREE.RepeatWrapping;
    colorMap.repeat.copy(repeat);
    colorMap.anisotropy = anisotropy;

    const normalMap = new THREE.CanvasTexture(normalCanvas);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.copy(repeat);
    normalMap.anisotropy = anisotropy;

    return { colorMap, normalMap };
}

export function applyWoodBackgroundTexture(element, colorTexture) {
    const canvas = colorTexture?.image;
    if (!element || !canvas?.toDataURL) return;
    const dataUrl = canvas.toDataURL('image/png');

    element.style.backgroundImage = [
        'radial-gradient(120% 130% at 50% -12%, rgba(255, 230, 204, 0.12), transparent 56%)',
        'linear-gradient(165deg, rgba(24, 14, 10, 0.72), rgba(24, 14, 10, 0.62))',
        `url('${dataUrl}')`
    ].join(', ');
    element.style.backgroundSize = 'cover, cover, 320px 160px';
    element.style.backgroundRepeat = 'no-repeat, no-repeat, repeat';
    element.style.backgroundPosition = 'center, center, top left';
    element.style.backgroundBlendMode = 'soft-light, multiply, normal';
}

function generateWoodGrainCanvases(width = 1024, height = 512) {
    const baseColor = { r: 88, g: 60, b: 44 };
    const heightMap = buildWoodHeightMap(width, height);

    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = width;
    colorCanvas.height = height;
    const colorCtx = colorCanvas.getContext('2d');
    const colorData = colorCtx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const h = heightMap[y * width + x];
            const v = y / height;
            const verticalTint = Math.cos((v - 0.5) * Math.PI) * 0.08;
            const brightness = 0.76 + h * 0.22 + verticalTint;
            const r = clamp255(baseColor.r * brightness + h * 12);
            const g = clamp255(baseColor.g * brightness + h * 10);
            const b = clamp255(baseColor.b * brightness + h * 6);
            colorData.data[idx] = r;
            colorData.data[idx + 1] = g;
            colorData.data[idx + 2] = b;
            colorData.data[idx + 3] = 255;
        }
    }
    colorCtx.putImageData(colorData, 0, 0);

    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = width;
    normalCanvas.height = height;
    const normalCtx = normalCanvas.getContext('2d');
    const normalData = normalCtx.createImageData(width, height);
    const strength = 1.35;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const hL = heightMap[y * width + (x > 0 ? x - 1 : x)];
            const hR = heightMap[y * width + (x < width - 1 ? x + 1 : x)];
            const hT = heightMap[(y > 0 ? y - 1 : y) * width + x];
            const hB = heightMap[(y < height - 1 ? y + 1 : y) * width + x];
            const nx = (hL - hR) * strength;
            const ny = (hT - hB) * strength;
            const nz = 1.0;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            normalData.data[idx] = clamp255((nx / len) * 127 + 128);
            normalData.data[idx + 1] = clamp255((ny / len) * 127 + 128);
            normalData.data[idx + 2] = clamp255((nz / len) * 127 + 128);
            normalData.data[idx + 3] = 255;
        }
    }
    normalCtx.putImageData(normalData, 0, 0);

    return { colorCanvas, normalCanvas };
}

function buildWoodHeightMap(width, height) {
    const map = new Float32Array(width * height);
    const seed = 47.13;
    for (let y = 0; y < height; y++) {
        const v = y / height;
        for (let x = 0; x < width; x++) {
            const u = x / width;
            const ring = Math.sin(u * 12 + Math.sin(v * 8) * 0.6);
            const fineGrain = Math.sin(u * 36 + Math.sin(v * 22) * 0.6);
            const swirl = Math.sin(v * 14 + u * 2) * 0.05;
            const noise = woodNoise(x * 0.8, y * 0.4, seed);
            const heightValue = 0.5 + ring * 0.08 + fineGrain * 0.06 + noise * 0.18 + swirl;
            map[y * width + x] = Math.min(1, Math.max(0, heightValue));
        }
    }
    return map;
}

function woodNoise(x, y, seed = 0) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
}

function clamp255(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

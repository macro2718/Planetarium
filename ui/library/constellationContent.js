import { findConstellationTale } from '../../data/constellationTales.js';
import { BASE_CONSTELLATION_DATA } from '../../data/constellations.js';
import { CONSTELLATION_BOOK_DETAILS } from '../../data/constellationBookDetails.js';
import { normalizeConstellationName } from './libraryStore.js';

export const LIBRARY_FALLBACKS = Object.freeze({
    story: '物語の断片はまだ集めているところです。星空で出会ったときの余韻を、そのままここに置いておきましょう。',
    observation: '星図を広げ、実際の夜空で形をなぞると新しい発見があります。',
    profile: '星座の素性はまだ調査中。季節の空で輪郭をなぞると、必要な情報が自然と見えてきます。',
    guide: '明るい星を基準に線を結び、近くの星座を道標にすると形が浮かび上がります。',
    lore: '起源や神話はこれから記録される予定。夜空で出会った瞬間の印象をノートに残してみましょう。',
    deepSky: '周辺には双眼鏡で楽しめる星雲・星団が隠れています。滲む光を探して余白を埋めてください。',
    trivia: '肉眼と双眼鏡、季節や空の条件で表情が変わる星座です。観測メモを追記すると自分だけの本になります。',
    poem: '静かな光の並びが、夜のページをそっとめくる。',
    quest: '隣り合う星座へ視線を移し、物語を連鎖させて本棚を満たしましょう。'
});

const descriptions = new Map(
    BASE_CONSTELLATION_DATA.map((entry) => [normalizeConstellationName(entry.name), entry])
);

export function getRegisteredConstellationCount() {
    const baseCount = Array.isArray(BASE_CONSTELLATION_DATA) ? BASE_CONSTELLATION_DATA.length : 0;
    return Math.max(baseCount, descriptions.size);
}

export function buildConstellationContent(name) {
    const normalized = normalizeConstellationName(name);
    const tale = findConstellationTale(name) || findConstellationTale(normalized);
    const base = descriptions.get(normalized);
    const canonicalId = tale?.id || base?.id || normalized;
    const detail = canonicalId
        ? CONSTELLATION_BOOK_DETAILS[canonicalId] || CONSTELLATION_BOOK_DETAILS[normalized]
        : null;
    const canonicalName = tale?.name || base?.name || name;
    const keywords = tale?.keywords || [];
    const season = tale?.season || '';
    const brightStars = detail?.mainStars || tale?.brightStars || '';
    const lede = tale?.lede || base?.description || '星空で出会った記憶が本棚に収まりました。';
    const lore = detail?.lore || tale?.story || LIBRARY_FALLBACKS.lore;

    return {
        name: canonicalName,
        season,
        keywords,
        lede,
        story: lore || LIBRARY_FALLBACKS.story,
        observation: detail?.observation || tale?.observation || LIBRARY_FALLBACKS.observation,
        brightStars,
        profile: detail?.profile || buildDefaultProfile(canonicalName, season, keywords, base?.description),
        guide: detail?.guide || tale?.observation || base?.description || LIBRARY_FALLBACKS.guide,
        lore,
        deepSky: detail?.deepSky || LIBRARY_FALLBACKS.deepSky,
        trivia: detail?.trivia || buildDefaultTrivia(brightStars, keywords),
        poem: detail?.poem || LIBRARY_FALLBACKS.poem,
        quest: detail?.quest || buildDefaultQuest(keywords),
        spineLabel: canonicalName,
        spineCode: formatConstellationCode(base?.id || canonicalId || normalized)
    };
}

function formatConstellationCode(id) {
    if (!id) return '';
    return String(id)
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_\s]+/g, ' ')
        .trim()
        .toUpperCase();
}

function buildDefaultProfile(name, season, keywords, baseDescription) {
    const tags = (keywords || []).slice(0, 3).join('・');
    const pieces = [name];
    if (season) pieces.push(season);
    if (tags) pieces.push(`キーワード: ${tags}`);
    if (baseDescription) pieces.push(baseDescription);
    return pieces.join(' / ') || LIBRARY_FALLBACKS.profile;
}

function buildDefaultTrivia(brightStars, keywords) {
    if (brightStars) return `代表星 ${brightStars} を起点に線をなぞると形が浮かび上がります。`;
    if (keywords?.includes('黄道星座')) {
        return '黄道12星座のひとつ。惑星が通過しやすいので接近の瞬間を観測メモに残そう。';
    }
    return LIBRARY_FALLBACKS.trivia;
}

function buildDefaultQuest(keywords) {
    if (keywords?.includes('夏の大三角')) {
        return '夏の大三角の残りの二星も棚に揃え、天の川の旅を完成させましょう。';
    }
    if (keywords?.includes('冬の大三角')) {
        return '冬の大三角をコンプリートして、冬の夜空ガイドを自分の言葉で書き添えましょう。';
    }
    if (keywords?.includes('黄道星座')) {
        return '黄道を前後の星座へたどり、季節の変化を並べた「惑星の通り道」棚を作ってみて。';
    }
    return LIBRARY_FALLBACKS.quest;
}

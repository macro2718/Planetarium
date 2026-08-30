import { LIBRARY_FALLBACKS } from './constellationContent.js';
import { normalizeConstellationName } from './libraryStore.js';

export class LibraryDetailView {
    constructor(documentRef = globalThis.document) {
        this.document = documentRef;
        this.refs = null;
        this.contents = [];
        this.currentIndex = -1;
        this.handleBack = () => this.close();
        this.handlePrevious = () => this.navigate(-1);
        this.handleNext = () => this.navigate(1);
        this.handleKeydown = (event) => {
            if (event.key === 'Escape') this.close();
        };
    }

    setup() {
        if (this.refs) return this.refs;
        const detailScreen = this.document?.getElementById('library-detail-screen');
        if (!detailScreen) return null;
        this.refs = {
            detailScreen,
            libraryScreen: this.document.getElementById('library-screen'),
            backBtn: this.document.getElementById('library-detail-back'),
            prevBtn: this.document.getElementById('library-detail-prev'),
            nextBtn: this.document.getElementById('library-detail-next'),
            profile: this.document.getElementById('library-detail-profile'),
            title: this.document.getElementById('library-detail-title'),
            lede: this.document.getElementById('library-detail-lede'),
            story: this.document.getElementById('library-detail-story'),
            observation: this.document.getElementById('library-detail-observation'),
            bright: this.document.getElementById('library-detail-bright'),
            guide: this.document.getElementById('library-detail-guide'),
            deep: this.document.getElementById('library-detail-deep'),
            trivia: this.document.getElementById('library-detail-trivia'),
            poem: this.document.getElementById('library-detail-poem'),
            quest: this.document.getElementById('library-detail-quest'),
            meta: this.document.getElementById('library-detail-meta'),
            tags: this.document.getElementById('library-detail-tags')
        };
        this.refs.backBtn?.addEventListener('click', this.handleBack);
        this.refs.prevBtn?.addEventListener('click', this.handlePrevious);
        this.refs.nextBtn?.addEventListener('click', this.handleNext);
        globalThis.window?.addEventListener('keydown', this.handleKeydown);
        this.updateNavigation();
        return this.refs;
    }

    setContents(contents) {
        this.contents = Array.isArray(contents) ? contents : [];
        if (!this.contents.length) this.currentIndex = -1;
        this.updateNavigation();
    }

    open(content, contentIndex = null) {
        if (!content) return;
        const refs = this.setup();
        if (!refs) return;
        refs.title.textContent = content.name;
        refs.lede.textContent = content.lede;
        if (refs.profile) refs.profile.textContent = content.profile || LIBRARY_FALLBACKS.profile;
        refs.story.textContent = content.lore || content.story || LIBRARY_FALLBACKS.lore;
        refs.observation.textContent = content.observation || LIBRARY_FALLBACKS.observation;
        refs.bright.textContent = content.brightStars || '—';
        if (refs.guide) refs.guide.textContent = content.guide || LIBRARY_FALLBACKS.guide;
        if (refs.deep) refs.deep.textContent = content.deepSky || LIBRARY_FALLBACKS.deepSky;
        if (refs.trivia) refs.trivia.textContent = content.trivia || LIBRARY_FALLBACKS.trivia;
        if (refs.poem) refs.poem.textContent = content.poem || LIBRARY_FALLBACKS.poem;
        if (refs.quest) refs.quest.textContent = content.quest || LIBRARY_FALLBACKS.quest;

        const resolvedIndex = Number.isInteger(contentIndex)
            ? contentIndex
            : this.findContentIndex(content);
        if (resolvedIndex >= 0) this.currentIndex = resolvedIndex;

        this.renderChips(refs.meta, content.season ? [content.season] : [], 'library-chip');
        this.renderChips(
            refs.tags,
            content.keywords || [],
            'library-tag'
        );
        if (refs.meta && content.keywords?.length) {
            const chip = this.document.createElement('span');
            chip.className = 'library-chip subtle';
            chip.textContent = content.keywords[0];
            refs.meta.appendChild(chip);
        }

        this.updateNavigation();
        refs.detailScreen.classList.remove('hidden');
        refs.libraryScreen?.classList.add('detail-open');
    }

    renderChips(container, values, className) {
        if (!container) return;
        container.replaceChildren();
        values.forEach((value) => {
            const element = this.document.createElement('span');
            element.className = className;
            element.textContent = value;
            container.appendChild(element);
        });
    }

    hide() {
        const refs = this.refs || this.setup();
        refs?.detailScreen.classList.add('hidden');
        refs?.libraryScreen?.classList.remove('detail-open');
        this.currentIndex = -1;
        this.updateNavigation();
    }

    close() {
        this.hide();
    }

    navigate(step) {
        if (this.currentIndex < 0 || !this.contents.length) return;
        const nextIndex = Math.min(
            Math.max(this.currentIndex + step, 0),
            this.contents.length - 1
        );
        if (nextIndex !== this.currentIndex) {
            this.open(this.contents[nextIndex], nextIndex);
        }
    }

    findContentIndex(content) {
        const directIndex = this.contents.indexOf(content);
        if (directIndex >= 0) return directIndex;
        const target = normalizeConstellationName(content?.name || content?.spineLabel || '');
        if (!target) return -1;
        return this.contents.findIndex((entry) => (
            normalizeConstellationName(entry?.name || entry?.spineLabel || '') === target
        ));
    }

    updateNavigation() {
        if (!this.refs) return;
        this.refs.prevBtn && (this.refs.prevBtn.disabled = this.currentIndex <= 0);
        this.refs.nextBtn && (
            this.refs.nextBtn.disabled = this.currentIndex < 0
                || this.currentIndex >= this.contents.length - 1
        );
    }

    dispose() {
        if (!this.refs) return;
        this.refs.backBtn?.removeEventListener('click', this.handleBack);
        this.refs.prevBtn?.removeEventListener('click', this.handlePrevious);
        this.refs.nextBtn?.removeEventListener('click', this.handleNext);
        globalThis.window?.removeEventListener('keydown', this.handleKeydown);
        this.refs = null;
        this.contents = [];
        this.currentIndex = -1;
    }
}

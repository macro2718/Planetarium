import test from 'node:test';
import assert from 'node:assert/strict';

class FakeDocument {
    constructor() {
        this.listeners = new Map();
    }

    addEventListener(type, listener) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type).add(listener);
    }

    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }

    dispatch(type) {
        Array.from(this.listeners.get(type) ?? []).forEach((listener) => listener({ type }));
    }

    listenerCount(type) {
        return this.listeners.get(type)?.size ?? 0;
    }
}

class FakeAudio {
    static instances = [];

    constructor(src) {
        this.src = src;
        this.paused = true;
        this.playCalls = 0;
        FakeAudio.instances.push(this);
    }

    addEventListener() {}

    pause() {
        this.paused = true;
    }

    play() {
        this.playCalls += 1;
        this.paused = false;
        return Promise.resolve();
    }
}

test('title BGM waits for a user gesture and resumes only once', async () => {
    const propertyNames = ['document', 'navigator', 'localStorage', 'Audio'];
    const originalDescriptors = new Map(
        propertyNames.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)])
    );
    const documentRef = new FakeDocument();
    const userActivation = { hasBeenActive: false };

    Object.defineProperties(globalThis, {
        document: { configurable: true, value: documentRef },
        navigator: { configurable: true, value: { userActivation } },
        localStorage: {
            configurable: true,
            value: { getItem: () => null, setItem: () => {} }
        },
        Audio: { configurable: true, value: FakeAudio }
    });

    try {
        const { playTitleBgm, stopUiBgm } = await import('../ui/bgmController.js?gesture-test');
        playTitleBgm();

        const audio = FakeAudio.instances[0];
        assert.ok(audio);
        assert.equal(audio.playCalls, 0);
        assert.equal(documentRef.listenerCount('pointerdown'), 1);

        userActivation.hasBeenActive = true;
        documentRef.dispatch('pointerdown');
        await Promise.resolve();

        assert.equal(audio.playCalls, 1);
        assert.equal(documentRef.listenerCount('pointerdown'), 0);
        assert.equal(documentRef.listenerCount('touchstart'), 0);
        assert.equal(documentRef.listenerCount('keydown'), 0);

        documentRef.dispatch('keydown');
        assert.equal(audio.playCalls, 1);
        stopUiBgm();
    } finally {
        originalDescriptors.forEach((descriptor, name) => {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else delete globalThis[name];
        });
    }
});

import test from 'node:test';
import assert from 'node:assert/strict';

test('photo capture renders immediately before reading the non-preserved buffer', async () => {
    const previousDocument = globalThis.document;
    const previousLocalStorage = globalThis.localStorage;
    globalThis.document = { getElementById: () => null };
    globalThis.localStorage = {
        getItem: () => null,
        setItem() {}
    };

    try {
        const { PhotoAlbumSystem } = await import('../ui/photoAlbum.js');
        const calls = [];
        const canvas = {
            toDataURL() {
                calls.push('read');
                return 'data:image/png;base64,test';
            }
        };
        const renderer = {
            isWebGLRenderer: true,
            domElement: canvas,
            render() {
                calls.push('render');
            }
        };
        const system = new PhotoAlbumSystem();
        system.savePhotos = () => {};
        system.showFlash = () => {};
        system.showNotification = () => {};

        const photo = await system.capturePhoto(renderer, {
            scene: {},
            camera: {},
            observer: { lat: 35.6895, lon: 139.6917 },
            getSimulatedDate: () => new Date('2026-08-30T12:00:00+09:00')
        });

        assert.deepEqual(calls, ['render', 'read']);
        assert.equal(photo.dataUrl, 'data:image/png;base64,test');
    } finally {
        globalThis.document = previousDocument;
        globalThis.localStorage = previousLocalStorage;
    }
});

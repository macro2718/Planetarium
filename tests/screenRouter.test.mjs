import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ScreenRouter,
    SCREEN_LAYOUTS,
    SCREEN_ROUTES
} from '../ui/screenRouter.js';

class FakeClassList {
    constructor(initial = []) {
        this.values = new Set(initial);
    }

    toggle(name, force) {
        if (force === undefined) {
            force = !this.values.has(name);
        }
        if (force) this.values.add(name);
        else this.values.delete(name);
        return force;
    }

    contains(name) {
        return this.values.has(name);
    }
}

const createFakeDocument = () => {
    const screenIds = Array.from(new Set(Object.values(SCREEN_LAYOUTS).flat()));
    const elements = new Map(
        screenIds.map((id) => [id, { id, classList: new FakeClassList(['hidden']) }])
    );
    return {
        body: { classList: new FakeClassList() },
        getElementById: (id) => elements.get(id) ?? null,
        elements
    };
};

test('each primary route exposes only the screens declared by its layout', () => {
    const documentRef = createFakeDocument();
    const router = new ScreenRouter(documentRef);

    Object.values(SCREEN_ROUTES).forEach((route) => {
        router.navigate(route);
        const expectedVisible = new Set(SCREEN_LAYOUTS[route]);
        documentRef.elements.forEach((element, id) => {
            assert.equal(
                element.classList.contains('hidden'),
                !expectedVisible.has(id),
                `${id} visibility should match route ${route}`
            );
        });
    });
});

test('body state classes are derived from the current route', () => {
    const documentRef = createFakeDocument();
    const router = new ScreenRouter(documentRef);

    router.navigate(SCREEN_ROUTES.MODE);
    assert.equal(documentRef.body.classList.contains('home-visible'), true);
    assert.equal(documentRef.body.classList.contains('mode-screen-visible'), true);

    router.navigate(SCREEN_ROUTES.ARCHIVE);
    assert.equal(documentRef.body.classList.contains('home-visible'), false);
    assert.equal(documentRef.body.classList.contains('mode-screen-visible'), false);
});

test('route subscribers are notified once per actual route change', () => {
    const router = new ScreenRouter(createFakeDocument());
    const transitions = [];
    const unsubscribe = router.subscribe((next, previous) => transitions.push([next, previous]));

    router.navigate(SCREEN_ROUTES.HOME);
    router.navigate(SCREEN_ROUTES.HOME);
    router.navigate(SCREEN_ROUTES.MODE);
    unsubscribe();
    router.navigate(SCREEN_ROUTES.ALBUM);

    assert.deepEqual(transitions, [
        [SCREEN_ROUTES.HOME, null],
        [SCREEN_ROUTES.MODE, SCREEN_ROUTES.HOME]
    ]);
});

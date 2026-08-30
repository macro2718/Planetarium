export const SCREEN_ROUTES = Object.freeze({
    HOME: 'home',
    MODE: 'mode',
    LOCATION: 'location',
    ARCHIVE: 'archive',
    LIBRARY_GATEWAY: 'library-gateway',
    LIBRARY: 'library',
    ALBUM: 'album',
    PLANETARIUM: 'planetarium'
});

export const SCREEN_LAYOUTS = Object.freeze({
    [SCREEN_ROUTES.HOME]: ['home-screen'],
    [SCREEN_ROUTES.MODE]: ['home-screen', 'mode-screen'],
    [SCREEN_ROUTES.LOCATION]: ['location-screen'],
    [SCREEN_ROUTES.ARCHIVE]: ['archive-screen'],
    [SCREEN_ROUTES.LIBRARY_GATEWAY]: ['library-gateway-screen'],
    [SCREEN_ROUTES.LIBRARY]: ['library-screen'],
    [SCREEN_ROUTES.ALBUM]: ['album-screen'],
    [SCREEN_ROUTES.PLANETARIUM]: []
});

const MANAGED_SCREEN_IDS = Object.freeze(
    Array.from(new Set(Object.values(SCREEN_LAYOUTS).flat()))
);

export class ScreenRouter {
    constructor(documentRef) {
        this.document = documentRef;
        this.currentRoute = null;
        this.subscribers = new Set();
    }

    navigate(route) {
        const visibleIds = SCREEN_LAYOUTS[route];
        if (!visibleIds) {
            throw new Error(`Unknown screen route: ${route}`);
        }

        const previousRoute = this.currentRoute;
        const visible = new Set(visibleIds);
        MANAGED_SCREEN_IDS.forEach((id) => {
            this.document?.getElementById(id)?.classList.toggle('hidden', !visible.has(id));
        });

        const bodyClasses = this.document?.body?.classList;
        bodyClasses?.toggle(
            'home-visible',
            route === SCREEN_ROUTES.HOME || route === SCREEN_ROUTES.MODE
        );
        bodyClasses?.toggle('mode-screen-visible', route === SCREEN_ROUTES.MODE);

        this.currentRoute = route;
        if (previousRoute !== route) {
            this.subscribers.forEach((subscriber) => subscriber(route, previousRoute));
        }
        return route;
    }

    setScreenVisible(screenId, visible) {
        this.document?.getElementById(screenId)?.classList.toggle('hidden', !visible);
    }

    subscribe(subscriber) {
        if (typeof subscriber !== 'function') return () => {};
        this.subscribers.add(subscriber);
        return () => this.subscribers.delete(subscriber);
    }
}

const router = new ScreenRouter(typeof document === 'undefined' ? null : document);

export function navigateTo(route) {
    return router.navigate(route);
}

export function getCurrentRoute() {
    return router.currentRoute;
}

export function setScreenVisible(screenId, visible) {
    router.setScreenVisible(screenId, visible);
}

export function subscribeToRouteChanges(subscriber) {
    return router.subscribe(subscriber);
}

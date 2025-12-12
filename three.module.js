// Browser-friendly Three.js entrypoint.
// The previous path expected `node_modules` to be served, which fails when
// opening `index.html` directly or serving statically without a bundler.
export * from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

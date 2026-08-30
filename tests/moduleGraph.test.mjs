import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoots = ['core', 'systems', 'ui', 'utils', 'data'];

const collectJavaScript = (directory) => readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) return collectJavaScript(path);
        return entry.isFile() && extname(path) === '.js' ? [path] : [];
    });

const sourceFiles = [
    ...sourceRoots.flatMap((root) => collectJavaScript(join(projectRoot, root))),
    join(projectRoot, 'astroCatalog.js'),
    join(projectRoot, 'planetarium.js'),
    join(projectRoot, 'three.module.js')
];

const importPattern = /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g;

test('all local JavaScript module specifiers resolve to files', () => {
    const missing = [];
    sourceFiles.forEach((file) => {
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(importPattern)) {
            const specifier = match[1];
            if (!specifier.startsWith('.')) continue;
            const target = resolve(dirname(file), specifier);
            if (!existsSync(target)) {
                missing.push(`${file.slice(projectRoot.length + 1)} -> ${specifier}`);
            }
        }
    });
    assert.deepEqual(missing, []);
});

test('core, systems, and utils do not depend on UI modules', () => {
    const violations = [];
    sourceFiles
        .filter((file) => ['core', 'systems', 'utils'].includes(file.slice(projectRoot.length + 1).split('/')[0]))
        .forEach((file) => {
            const source = readFileSync(file, 'utf8');
            for (const match of source.matchAll(importPattern)) {
                if (match[1].includes('/ui/')) {
                    violations.push(`${file.slice(projectRoot.length + 1)} -> ${match[1]}`);
                }
            }
        });
    assert.deepEqual(violations, []);
});

test('HTML references existing local scripts and stylesheets', () => {
    const html = readFileSync(join(projectRoot, 'index.html'), 'utf8');
    const references = [
        ...Array.from(html.matchAll(/<script[^>]+src="([^"]+)"/g), (match) => match[1]),
        ...Array.from(html.matchAll(/<link[^>]+href="(styles\/[^"]+\.css)"/g), (match) => match[1])
    ].filter((reference) => !reference.startsWith('http'));
    const missing = references.filter((reference) => !existsSync(join(projectRoot, reference)));
    assert.deepEqual(missing, []);
});

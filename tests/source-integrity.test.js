import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TEXT_SUFFIXES = new Set(['.js', '.css', '.html', '.md']);
const SKIP_DIRECTORIES = new Set(['.git', '.github', 'node_modules', 'scripts', 'tests']);
const MOJIBAKE_MARKERS = [
    'Ã¢',
    'Ã°',
    'Ãƒ',
    'Â ',
    'â€',
    'â€“',
    'â€”',
    'â„¢',
    'ðŸ',
    '\u{FFFD}',
];
const C1_CONTROLS = /[\u0080-\u009F]/u;

function extension(path) {
    const index = path.lastIndexOf('.');
    return index === -1 ? '' : path.slice(index);
}

function collectTextFiles(path, output = []) {
    const stats = statSync(path);
    if (stats.isDirectory()) {
        for (const child of readdirSync(path)) {
            if (SKIP_DIRECTORIES.has(child)) continue;
            collectTextFiles(join(path, child), output);
        }
    } else if (TEXT_SUFFIXES.has(extension(path))) {
        output.push(path);
    }
    return output;
}

function read(path) {
    return readFileSync(join(ROOT, path), 'utf8');
}

test('runtime and theme source contains no mojibake or C1 controls', () => {
    const failures = [];
    for (const file of collectTextFiles(ROOT)) {
        const text = readFileSync(file, 'utf8');
        const markers = MOJIBAKE_MARKERS.filter(marker => text.includes(marker));
        if (markers.length > 0 || C1_CONTROLS.test(text)) {
            failures.push(`${relative(ROOT, file)}: ${markers.join(', ') || 'C1 control character'}`);
        }
    }
    assert.deepEqual(failures, []);
});

test('decorative CSS content uses encoding-safe code-point escapes', () => {
    assert.match(read('styles.css'), /content:\s*["']\\2713\s+["']/u);
    assert.match(read('themes/nemotavern/nemotavern-theme.css'), /content:\s*["']\\2713\s+["']/u);

    const win98 = read('themes/win98-theme.css');
    for (const glyph of ['\\274C ', '\\26A0 \\FE0F ', '\\2139 \\FE0F ', '\\2705 ']) {
        assert.ok(win98.includes(`content: '${glyph}';`), `Missing ${glyph}`);
    }
});

test('optional ProsePolisher name import remains guarded by a fallback', () => {
    const sharedNames = read('core/shared-names.js');
    assert.match(sharedNames, /try\s*\{[\s\S]*await import\('\.\.\/features\/prosepolisher\/src\/default_names\.js'\)[\s\S]*\}\s*catch/u);
    assert.match(sharedNames, /this\.loadFallbackNames\(\)/u);
});

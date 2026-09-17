#!/usr/bin/env node
/**
 * Package-consumer smoke test (`npm run test:package`, after `npm run build:lib`): pack the repo,
 * install the tarball into a temp consumer, type-check a .tsx consumer against the published
 * declarations, server-render LightField + themeStyle with no window, build a config-free Vite
 * consumer importing the root, fonts.css, styles.css and the raw shader subpaths, then check the
 * emitted CSS asset URLs resolve and SIL OFL licenses ship. Temp paths are removed in a finally
 * block even on failure; nothing is written inside the repository.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const consumerText = 'afterglow consumer smoke';
const shaderSubpaths = ['shaders/lightfield.frag.glsl', 'shaders/lightfield.vert.glsl'];
const timeoutMs = 15 * 60 * 1000;

function log(message) {
  process.stdout.write(`[test-package] ${message}\n`);
}

function run(command, args, cwd) {
  const options = { cwd, encoding: 'utf8', env: process.env, maxBuffer: 64 * 1024 * 1024, timeout: timeoutMs };
  const result = spawnSync(command, args, options);
  if (result.error) throw new Error(`${command} failed to run: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}\n${detail}`);
  }
  return result.stdout ?? '';
}

function consumerPin(repo, name) {
  const pin = repo.devDependencies?.[name];
  assert.ok(pin, `package.json must list ${name} in devDependencies; the smoke consumer installs that pin`);
  return pin;
}

function ssrSource(pkgName) {
  return `import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { LightField, fontPairings, palettes, settings, themeStyle } from ${JSON.stringify(pkgName)};
assert.equal(typeof window, 'undefined', 'the SSR smoke must run without a window global');
const theme = themeStyle(palettes[settings.palette], fontPairings[settings.typography]);
const html = renderToString(createElement('div', { style: theme },
  createElement('h1', null, ${JSON.stringify(consumerText)}),
  createElement(LightField, { palette: palettes[settings.palette].light, variant: settings.variant })));
assert.ok(html.includes(${JSON.stringify(consumerText)}), 'the render must contain the consumer markup');
process.stdout.write('ssr smoke ok: ' + html.length + ' chars\\n');
`;
}

function typeFixtureSource(pkgName) {
  return `import { LightField, fontPairings, palettes, settings, themeStyle } from ${JSON.stringify(pkgName)};
export const theme = themeStyle(palettes.goldenHour, fontPairings.expressive);
export const field = <LightField palette={palettes.goldenHour.light} variant={settings.variant} />;
// @ts-expect-error The field consumes light pigments, not the surrounding UI palette.
export const invalidField = <LightField palette={palettes.goldenHour} />;
`;
}

function viteMainSource(pkgName) {
  const shaderImports = shaderSubpaths
    .map((subpath, index) => `import shader${index} from ${JSON.stringify(`${pkgName}/${subpath}?raw`)};`)
    .join('\n');
  return `import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { LightField, fontPairings, palettes, settings, themeStyle } from ${JSON.stringify(pkgName)};
import ${JSON.stringify(`${pkgName}/fonts.css`)};
import ${JSON.stringify(`${pkgName}/styles.css`)};
${shaderImports}
// The raw shader imports only need to resolve; the build fails without them.
const palette = palettes[settings.palette];
createRoot(document.getElementById('root')).render(createElement('div',
  { style: themeStyle(palette, fontPairings[settings.typography]), className: 'app' },
  createElement(LightField, { palette: palette.light, variant: settings.variant }),
  createElement('p', null, ${JSON.stringify(consumerText)})));
`;
}

const indexHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><title>afterglow package smoke</title></head>
<body><div id="root"></div><script type="module" src="/src/main.js"></script></body></html>
`;

function packTarball(tempRoot) {
  const packDir = path.join(tempRoot, 'pack');
  fs.mkdirSync(packDir);
  const stdout = run(npmCommand, ['pack', '--ignore-scripts', '--pack-destination', packDir], repoRoot);
  const tarball = path.join(packDir, stdout.trim().split('\n').pop());
  assert.ok(fs.existsSync(tarball), `npm pack did not produce a tarball in ${packDir}`);
  log(`packed ${path.basename(tarball)}`);
  return tarball;
}

function installConsumer(tempRoot, repo, tarball, pins) {
  const consumerDir = path.join(tempRoot, 'consumer');
  fs.mkdirSync(path.join(consumerDir, 'src'), { recursive: true });
  const manifest = {
    name: 'afterglow-package-smoke',
    private: true,
    type: 'module',
    dependencies: { [repo.name]: `file:${tarball}`, react: pins.react, 'react-dom': pins['react-dom'], three: pins.three },
    devDependencies: { vite: pins.vite, typescript: pins.typescript, '@types/react': pins['@types/react'] },
  };
  fs.writeFileSync(path.join(consumerDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  run(npmCommand, ['install', '--ignore-scripts', '--no-audit', '--no-fund'], consumerDir);
  const pkgDir = path.join(consumerDir, 'node_modules', ...repo.name.split('/'));
  assert.ok(fs.existsSync(path.join(pkgDir, 'package.json')), `${repo.name} must be installed in the consumer`);
  log(`installed the tarball into ${consumerDir}`);
  return { consumerDir, pkgDir };
}

function runSsr(consumerDir, pkgName) {
  fs.writeFileSync(path.join(consumerDir, 'ssr-smoke.mjs'), ssrSource(pkgName));
  log(run(process.execPath, ['ssr-smoke.mjs'], consumerDir).trim() || 'ssr smoke ok');
}

function runTypeCheck(consumerDir, pkgName) {
  fs.writeFileSync(path.join(consumerDir, 'types-smoke.tsx'), typeFixtureSource(pkgName));
  const tsDir = path.join(consumerDir, 'node_modules', 'typescript');
  const tsc = [path.join(tsDir, 'lib', 'tsc.js'), path.join(tsDir, 'bin', 'tsc')].find((file) => fs.existsSync(file));
  assert.ok(tsc, 'typescript must be installed in the consumer');
  const flags = ['--noEmit', '--strict', '--jsx', 'react-jsx', '--module', 'esnext', '--moduleResolution', 'bundler',
    '--target', 'ES2022', '--lib', 'ES2022,DOM'];
  run(process.execPath, [tsc, ...flags, 'types-smoke.tsx'], consumerDir);
  log('typescript consumer type-check ok');
}

function runViteBuild(consumerDir, pkgName) {
  fs.writeFileSync(path.join(consumerDir, 'index.html'), indexHtml);
  fs.writeFileSync(path.join(consumerDir, 'src', 'main.js'), viteMainSource(pkgName));
  const viteBin = path.join(consumerDir, 'node_modules', 'vite', 'bin', 'vite.js');
  assert.ok(fs.existsSync(viteBin), 'vite must be installed in the consumer');
  run(process.execPath, [viteBin, 'build'], consumerDir);
  log('vite consumer build ok (no bundler config)');
}

function checkBuildOutput(consumerDir) {
  const distDir = path.join(consumerDir, 'dist');
  assert.ok(fs.existsSync(distDir), 'vite build must emit a dist directory');
  const files = fs.readdirSync(distDir, { recursive: true }).map((file) => path.join(distDir, file));
  const cssFiles = files.filter((file) => file.endsWith('.css'));
  assert.ok(cssFiles.length > 0, 'vite build must emit the imported package CSS');

  let references = 0;
  for (const cssFile of cssFiles) {
    for (const match of fs.readFileSync(cssFile, 'utf8').matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
      const reference = match[2].trim();
      references += 1;
      if (reference.startsWith('data:')) continue;
      const clean = reference.split(/[?#]/)[0];
      const target = clean.startsWith('/') ? path.join(distDir, clean) : path.resolve(path.dirname(cssFile), clean);
      assert.ok(fs.existsSync(target) && fs.statSync(target).size > 0,
        `${path.basename(cssFile)} references ${reference}, which the build did not emit as bytes`);
    }
  }
  assert.ok(references > 0, 'the built CSS must reference the font assets it declares');
  log(`resolved ${references} CSS asset reference(s)`);
}

function checkOflTexts(pkgDir) {
  const files = fs.readdirSync(pkgDir, { recursive: true }).filter((file) => file.endsWith('.txt'));
  const texts = files.filter((file) => /SIL OPEN FONT LICENSE/i.test(fs.readFileSync(path.join(pkgDir, file), 'utf8')));
  assert.ok(texts.length > 0, 'the published package must ship SIL OFL license text(s) for its bundled fonts');
  log(`package ships ${texts.length} SIL OFL license text(s)`);
}

function main() {
  const repo = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.ok(repo.name && repo.version, 'package.json must declare a name and a version');
  const pins = Object.fromEntries(['react', 'react-dom', 'three', 'vite', 'typescript', '@types/react']
    .map((name) => [name, consumerPin(repo, name)]));

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'afterglow-package-smoke-'));
  try {
    const tarball = packTarball(tempRoot);
    const { consumerDir, pkgDir } = installConsumer(tempRoot, repo, tarball, pins);
    runSsr(consumerDir, repo.name);
    runTypeCheck(consumerDir, repo.name);
    runViteBuild(consumerDir, repo.name);
    checkBuildOutput(consumerDir);
    checkOflTexts(pkgDir);
    log(`package smoke passed for ${repo.name}@${repo.version}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
}

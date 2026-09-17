/**
 * Asset pass for the public package, run straight after the library bundle.
 *
 * `vite build --config vite.lib.config.js` compiles src/ into lib/index.js
 * (GLSL included, as raw strings). This script adds everything a single
 * bundle cannot carry:
 *
 *   lib/index.d.ts      types for the five public exports
 *   lib/styles.css      the demo's stylesheet, opt-in
 *   lib/fonts.css       self-contained @font-face rules
 *   lib/fonts/*         the binaries those rules point at
 *   lib/shaders/*.glsl  both programs, raw, for anyone bundling them directly
 *   lib/licenses/*.txt  the OFL notices for the bundled fonts
 *
 * The @font-face rules come from exactly the @fontsource stylesheets
 * src/main.jsx imports, so the demo and the package cannot drift apart, and
 * every URL is rewritten to a bundled file: nothing is fetched at runtime and
 * the consumer never needs @fontsource.
 */
import { access, cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const libDir = join(root, 'lib');

const FONTSOURCE_IMPORT = /@fontsource\/[\w.-]+\/[\w.-]+\.css/g;
const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]*))\s*\)/g;

/** Fail with a sentence that names the missing piece, not a bare ENOENT. */
async function mustExist(path, what) {
  try {
    await access(path);
  } catch {
    throw new Error(`${what} not found at ${path}`);
  }
  return path;
}

// The bundle is the one artefact this script does not produce; refuse to
// assemble a half-empty lib without it.
await mustExist(join(libDir, 'index.js'), 'library bundle (run the library build first)');

const mainJsx = await readFile(
  await mustExist(join(root, 'src', 'main.jsx'), 'demo entry'),
  'utf8',
);
const stylesheets = [...new Set(mainJsx.match(FONTSOURCE_IMPORT) ?? [])];
if (stylesheets.length === 0) {
  throw new Error('src/main.jsx imports no @fontsource stylesheet, so lib/fonts.css would be empty');
}

/** Basename -> the file it must be copied from. */
const binaries = new Map();
/** One @font-face block per imported stylesheet, URLs rewritten. */
const faces = [];

for (const spec of stylesheets) {
  const source = await mustExist(join(root, 'node_modules', spec), 'font stylesheet');
  const css = await readFile(source, 'utf8');
  const face = css
    .replace(CSS_URL, (match, quoted, singleQuoted, bare) => {
      const ref = (quoted ?? singleQuoted ?? bare).trim();
      // Anything remote or fragment-only is already self-contained; the
      // fontsource stylesheets only ever point at ./files.
      if (ref === '' || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) return match;
      const file = basename(ref);
      binaries.set(file, join(dirname(source), ref));
      return `url(./fonts/${file})`;
    })
    .trim();

  if (!face.includes('@font-face')) {
    throw new Error(`${spec} has no @font-face rule to lift`);
  }
  faces.push(face);
}

const fontsDir = join(libDir, 'fonts');
await mkdir(fontsDir, { recursive: true });
let fontBytes = 0;
for (const [file, from] of binaries) {
  await cp(from, join(fontsDir, file));
  fontBytes += (await stat(join(fontsDir, file))).size;
}

await writeFile(
  join(libDir, 'fonts.css'),
  `/* afterglow: bundled webfonts.
   Fraunces, Karla and Stick No Bills, under the SIL Open Font License 1.1.
   The notices ship beside this sheet in ./licenses. Every source below is a
   local file in ./fonts: nothing here reaches a font CDN at runtime. */

${faces.join('\n\n')}
`,
);

await cp(join(root, 'src', 'library.d.ts'), join(libDir, 'index.d.ts'));
await cp(join(root, 'src', 'styles.css'), join(libDir, 'styles.css'));

// rm first so a repeated run cannot nest src/shaders inside an existing
// lib/shaders.
await rm(join(libDir, 'shaders'), { recursive: true, force: true });
await cp(join(root, 'src', 'shaders'), join(libDir, 'shaders'), { recursive: true });
await rm(join(libDir, 'licenses'), { recursive: true, force: true });
await cp(join(root, 'public', 'licenses'), join(libDir, 'licenses'), { recursive: true });

const notices = (await readdir(join(libDir, 'licenses'))).length;
const shaders = (await readdir(join(libDir, 'shaders'))).length;

console.log(
  `lib/ assembled: index.js, index.d.ts, styles.css, fonts.css ` +
    `(${faces.length} faces, ${binaries.size} files, ${(fontBytes / 1024).toFixed(0)} KiB), ` +
    `${shaders} shaders, ${notices} license notices`,
);

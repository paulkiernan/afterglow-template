import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The public package build. It compiles the same sources the demo runs into
// one ESM bundle at lib/index.js, with the GLSL read as raw strings inlined
// by the `?raw` imports in src/components/LightField.jsx.
//
// The demo config (vite.config.js) builds the app and stays untouched.
//
// Everything the consuming app must own stays external, so the package
// resolves the app's single copy of React and three:
//   react, react/jsx-runtime, react-dom (and any other subpath), three.
// `publicDir: false` keeps public/ (demo favicon) out of the package; the
// consumable assets are added afterwards by scripts/build-assets.mjs.
const EXTERNAL = /^(?:react|react-dom|three)(?:\/.*)?$/;

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'lib',
    emptyOutDir: true,
    // A readable bundle: the field is a template component people edit, and
    // the shader sources stay legible inside it.
    minify: false,
    lib: {
      entry: 'src/library.js',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rolldownOptions: {
      external: (id) => EXTERNAL.test(id),
    },
  },
});

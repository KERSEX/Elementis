// Baut die komplette Browser-Version als EINE HTML-Datei (docs/index.html).
// Sie läuft ohne Server: per Doppelklick (file://), von GitHub Pages oder von jedem anderen Webspace.
//   npm install && npm run build
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const js = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  legalComments: 'none',
  write: false,
});
const code = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('styles.css', 'utf8');
let html = readFileSync('index.html', 'utf8');

html = html.replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${css}\n</style>`);
html = html.replace('<script type="module" src="src/main.js"></script>', () => `<script>\n${code}\n</script>`);
if (html.includes('src/main.js') || html.includes('styles.css">')) throw new Error('Einbetten fehlgeschlagen');

mkdirSync('docs', { recursive: true });
writeFileSync('docs/index.html', html);
console.log(`docs/index.html geschrieben (${(html.length / 1024).toFixed(0)} KB)`);

// Extrae todos los bloques mermaid de los docs del proyecto tienda-libros
// y los renderiza a PNG con @mermaid-js/mermaid-cli (headless Chromium).
// Ejecutar en segundo plano: node /tmp/opencode/mermaid-verify/render-all.js
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const dir = '/tmp/opencode/mermaid-verify';
const docs = '/home/alumno/Desktop/opencode/recursos/tienda-libros/docs';

fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(path.join(dir, 'package.json'))) {
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'mermaid-verify', private: true }, null, 2)
  );
}

const mmdc = path.join(dir, 'node_modules', '.bin', 'mmdc');
if (!fs.existsSync(mmdc)) {
  console.log('== Instalando @mermaid-js/mermaid-cli@11 (incluye Chromium; puede tardar) ==');
  execSync('npm install --no-fund --no-audit @mermaid-js/mermaid-cli@11', {
    cwd: dir,
    stdio: 'inherit',
  });
}

const cfg = path.join(dir, 'puppeteer-config.json');
if (!fs.existsSync(cfg)) {
  fs.writeFileSync(cfg, JSON.stringify({ args: ['--no-sandbox', '--disable-setuid-sandbox'] }));
}

let total = 0;
for (const f of ['arquitectura.md', 'recorrido-peticiones.md']) {
  const md = fs.readFileSync(path.join(docs, f), 'utf8');
  const blocks = [...md.matchAll(/```mermaid\r?\n([\s\S]*?)```/g)].map((m) => m[1].trim());
  console.log(`== ${f}: ${blocks.length} diagramas ==`);
  blocks.forEach((b, i) => {
    total++;
    const base = path.join(dir, `${path.basename(f, '.md')}-${i + 1}`);
    fs.writeFileSync(base + '.mmd', b + '\n');
    execSync(
      `"${mmdc}" -i "${base}.mmd" -o "${base}.png" -p "${cfg}" --backgroundColor white -w 1400`,
      { stdio: 'inherit', cwd: dir }
    );
    console.log(`OK -> ${base}.png`);
  });
}
console.log(`RENDER_OK total=${total}`);

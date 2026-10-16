// Genera docs/verificar-mermaid.html a partir de los bloques ```mermaid de
// docs/recorrido-peticiones.md, para comprobar en el navegador que los
// diagramas se dibujan sin errores de sintaxis.
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const md = fs.readFileSync(path.join(dir, 'recorrido-peticiones.md'), 'utf8');
const blocks = [...md.matchAll(/```mermaid\r?\n([\s\S]*?)```/g)].map((m) => m[1].trim());

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Verificación Mermaid — tienda-libros</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"><\/script>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; background: #fafafa; }
  h2 { margin-top: 2rem; }
  .diagrama { border: 1px solid #ccc; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; background: #fff; }
  .ok { color: #0a0; font-weight: bold; }
  .error { color: #c00; font-weight: bold; white-space: pre-wrap; }
</style>
</head>
<body>
<h1>Verificación de diagramas Mermaid</h1>
<p id="resultado">Renderizando…</p>
<div id="contenedor"></div>
<script type="module">
mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
const diagramas = ${JSON.stringify(blocks.map((b) => b + '\n'))};
const resultado = { total: diagramas.length, ok: 0, errores: [] };
const cont = document.getElementById('contenedor');
for (let i = 0; i < diagramas.length; i++) {
  const h = document.createElement('h2');
  h.textContent = 'Diagrama ' + (i + 1);
  cont.appendChild(h);
  const div = document.createElement('div');
  div.className = 'diagrama';
  cont.appendChild(div);
  try {
    const { svg } = await mermaid.render('diagrama-' + i, diagramas[i]);
    div.innerHTML = svg;
    resultado.ok++;
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    div.innerHTML = '<p class="error">' + msg + '</p>';
    resultado.errores.push(msg);
  }
}
window.__mermaidResult = resultado;
const el = document.getElementById('resultado');
el.textContent =
  'Diagramas: ' + resultado.total + ' · renderizados OK: ' + resultado.ok +
  ' · errores: ' + resultado.errores.length +
  (resultado.errores.length ? ' → ' + resultado.errores.join(' | ') : '');
el.className = resultado.errores.length ? 'error' : 'ok';
<\/script>
</body>
</html>`;

fs.writeFileSync(path.join(dir, 'verificar-mermaid.html'), html);
console.log(`OK: ${blocks.length} diagramas extraídos -> ${path.join(dir, 'verificar-mermaid.html')}`);

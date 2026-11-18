/* overflow.mjs — quem está empurrando a página para os lados.
 *
 * O check.mjs diz *se* existe rolagem horizontal; este diz *quem* causa. Lista
 * todo elemento que passa das bordas, com a classe e a posicao, para separar o
 * sangramento de proposito (as placas de profundidade do heroi usam inset
 * negativo e vivem recortadas) do vazamento de verdade.
 *
 *   node scrollcraft/builds/xpress-dtf-uv/lab/overflow.mjs [largura] [altura]
 */
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const URL = pathToFileURL(path.resolve('index.html')).href;
const W = Number(process.argv[2]) || 320;
const H = Number(process.argv[3]) || 568;

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: W, height: H } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);

const out = await p.evaluate(() => {
  const w = document.documentElement.clientWidth;
  const bad = [];
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    if (r.right > w + 1 || r.left < -1) {
      const cls = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '';
      bad.push({ tag: el.tagName.toLowerCase(), cls: String(cls).slice(0, 44), left: Math.round(r.left), right: Math.round(r.right) });
    }
  });
  return { clientW: w, scrollW: document.documentElement.scrollWidth, bad: bad.slice(0, 20) };
});

const rola = out.scrollW > out.clientW;
console.log(`${W}x${H} · clientWidth ${out.clientW} · scrollWidth ${out.scrollW} · rolagem lateral: ${rola ? 'SIM' : 'nao'}\n`);
if (!out.bad.length) console.log('nenhum elemento passa das bordas');
out.bad.forEach((e) => console.log(`${e.tag}.${e.cls}`.padEnd(46) + ` l=${e.left} r=${e.right}`));
if (!rola && out.bad.length) console.log('\n(passam das bordas mas estão recortados — sem rolagem)');

await b.close();

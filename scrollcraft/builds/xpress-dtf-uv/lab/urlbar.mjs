/* urlbar.mjs — o teste da barra de endereço.
 *
 * No celular, a barra do navegador some e volta durante a rolagem: a largura
 * nao muda, a altura muda ~60-100px. O motor ignora isso de proposito
 * (scrollcraft.js, "Ignore URL-bar-only height changes on phones"). Se a camada
 * do site ler innerHeight ao vivo, a parada corrente e o progresso do pico
 * pulam sozinhos e o leitor sente uma travada.
 *
 * Emular isso encolhendo a janela nao serve: sem barra de endereco de verdade,
 * encolher muda tambem `vh`, `lvh` e a altura dos atos, o que no telefone nao
 * acontece. O que o telefone faz com a pagina e mais estreito: `innerHeight`
 * passa a devolver outro numero e dispara um `resize`, enquanto o layout fica
 * parado. E isso que este teste reproduz.
 *
 *   node scrollcraft/builds/xpress-dtf-uv/lab/urlbar.mjs
 */
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PAGE = pathToFileURL(path.resolve('index.html')).href;

const W = 390;
const TALL = 844;        /* barra escondida */
const SHORT = 844 - 88;  /* barra a vista */

const state = () => ({
  stop: document.body.getAttribute('data-stop'),
  split: getComputedStyle(document.body).getPropertyValue('--split').trim(),
  peel: (document.getElementById('peel') || document.body)
    .style.getPropertyValue('--peel').trim(),
});

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({
  viewport: { width: W, height: TALL },
  deviceScaleFactor: 3, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
await page.goto(PAGE, { waitUntil: 'load' });
await page.waitForTimeout(800);

const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
/* pontos espalhados pelos seis atos, inclusive dentro do pico */
const marks = [0.06, 0.16, 0.26, 0.34, 0.42, 0.52, 0.64, 0.78, 0.9];

let bad = 0;
console.log(`390px de largura · altura ${TALL} -> ${SHORT} (barra de endereço)\n`);
console.log('posicao   parada      --split            --peel');

for (const m of marks) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * m));
  await page.waitForTimeout(260);
  const before = await page.evaluate(state);

  /* a barra aparece: innerHeight encolhe, o layout fica onde estava */
  await page.evaluate((h) => {
    window.__realH = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => h });
    window.dispatchEvent(new Event('resize'));
  }, SHORT);
  await page.waitForTimeout(260);
  const after = await page.evaluate(state);

  await page.evaluate(() => {
    if (window.__realH) Object.defineProperty(window, 'innerHeight', window.__realH);
    else delete window.innerHeight;
    window.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(160);

  const same = (k) => before[k] === after[k];
  const cell = (k) => (same(k) ? `${before[k] || '-'}` : `${before[k] || '-'} -> ${after[k] || '-'}`);
  const ok = same('stop') && same('split') && same('peel');
  if (!ok) bad++;
  console.log(
    `${String(Math.round(m * 100)).padStart(4)}%   ${ok ? 'ok  ' : 'PULO'}  ` +
    `${cell('stop').padEnd(10)} ${cell('split').padEnd(18)} ${cell('peel')}`,
  );
}

console.log(`\n${bad === 0 ? 'nenhum pulo' : bad + ' ponto(s) pulam com a barra de endereço'}`);
await browser.close();
process.exit(bad === 0 ? 0 : 1);

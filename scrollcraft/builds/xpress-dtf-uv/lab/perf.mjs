/* perf.mjs — mede a fluidez da rolagem como um celular mediano sente.
 *
 * Emula 390x844 @3x com a CPU afunilada 4x, rola a pagina inteira dentro de um
 * laco de requestAnimationFrame e devolve a distribuicao dos quadros. Depois
 * repete a medicao desligando um suspeito de cada vez (via CSS injetado), para
 * atribuir custo em vez de adivinhar.
 *
 *   node scrollcraft/builds/xpress-dtf-uv/lab/perf.mjs
 */
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PAGE = pathToFileURL(path.resolve('index.html')).href;

/* Cada sonda desliga um custo e mantem o resto igual. */
/* A pagina como esta, repetida: uma passada so varia demais para comparar
 * duas versoes. O numero que vale e a mediana das repeticoes. */
const REPS = Number(process.argv[2]) || 5;

/* Roda dentro da pagina: rola do topo ao fim medindo cada quadro. */
async function run(page, css) {
  await page.evaluate((c) => {
    document.getElementById('probe')?.remove();
    if (c) {
      const s = document.createElement('style');
      s.id = 'probe'; s.textContent = c;
      document.head.appendChild(s);
    }
    window.scrollTo(0, 0);
  }, css);
  await page.waitForTimeout(450);

  return page.evaluate(() => new Promise((done) => {
    const frames = [];
    const max = document.documentElement.scrollHeight - innerHeight;
    const step = max / 260;            /* ~260 quadros para a pagina inteira */
    let last = performance.now();
    function tick() {
      const now = performance.now();
      frames.push(now - last);
      last = now;
      if (scrollY >= max - 1 || frames.length > 400) {
        frames.shift();                /* o primeiro delta e lixo */
        const sorted = [...frames].sort((a, b) => a - b);
        const q = (p) => sorted[Math.floor(sorted.length * p)];
        done({
          quadros: frames.length,
          mediana: q(0.5),
          p95: q(0.95),
          pior: sorted[sorted.length - 1],
          acima32: frames.filter((f) => f > 32).length,
          acima50: frames.filter((f) => f > 50).length,
        });
        return;
      }
      scrollBy(0, step);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }));
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

await page.goto(PAGE, { waitUntil: 'load' });
await page.waitForTimeout(900);

console.log('390x844 @3x · CPU 4x mais lenta · quadros em ms\n');
console.log('passada                mediana    p95    pior   >32ms  >50ms');
const all = [];
for (let i = 1; i <= REPS; i++) {
  const r = await run(page, '');
  all.push(r);
  const n = (v) => String(Math.round(v)).padStart(6);
  console.log(
    String(i).padEnd(22) + n(r.mediana) + n(r.p95) + n(r.pior) +
    String(r.acima32).padStart(7) + String(r.acima50).padStart(7),
  );
}
const med = (k) => {
  const v = all.map((r) => r[k]).sort((a, b) => a - b);
  return Math.round(v[Math.floor(v.length / 2)]);
};
console.log('\nmediana das passadas   ' +
  String(med('mediana')).padStart(6) + String(med('p95')).padStart(6) +
  String(med('pior')).padStart(6) + String(med('acima32')).padStart(7) +
  String(med('acima50')).padStart(7));

await browser.close();

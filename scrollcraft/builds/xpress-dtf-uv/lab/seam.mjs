/* seam.mjs — a divisória está onde o conteúdo diz que ela deveria estar?
 *
 * No telefone os dois mundos viram duas faixas empilhadas, e a divisória entre
 * marrom (têxtil) e azul (UV) só faz sentido na costura entre os dois blocos.
 * Nos atos que rolam, essa costura anda com o dedo. Este teste compara, ponto
 * a ponto, onde o chão azul *realmente* começa na tela com onde o `.side--b`
 * do ato corrente começa. Divergir é a ficha do têxtil cair sobre o chão do UV.
 *
 *   node scrollcraft/builds/xpress-dtf-uv/lab/seam.mjs [largura] [altura]
 */
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const URL = pathToFileURL(path.resolve('index.html')).href;
const W = Number(process.argv[2]) || 390;
const H = Number(process.argv[3]) || 844;
const TOL = 6;   /* pontos percentuais */

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: W, height: H } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);

const total = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
let bad = 0;

console.log(`${W}x${H}\n`);
console.log('posicao  parada  divisoria  costura real  ');
for (let i = 0; i <= 14; i++) {
  const m = i / 40;                       /* os dois primeiros atos */
  await p.evaluate((y) => window.scrollTo(0, y), Math.round(total * m));
  await p.waitForTimeout(220);

  const r = await p.evaluate(() => {
    const stop = document.body.getAttribute('data-stop');
    /* onde o chão azul realmente começa na tela, não qual variável o carrega */
    const uv = document.querySelector('.world__uv');
    const divisoria = (uv.getBoundingClientRect().top / innerHeight) * 100;
    const act = document.querySelector(`.act--${stop}`);
    const sb = act && act.querySelector('.side--b');
    let real = null;
    if (sb) {
      const t = sb.getBoundingClientRect().top;
      if (t > 0 && t < innerHeight) real = (t / innerHeight) * 100;
    }
    return { stop, divisoria, real };
  });

  const erro = r.real === null ? null : Math.abs(r.real - r.divisoria);
  if (erro !== null && erro > TOL) bad++;
  console.log(
    `${String(Math.round(m * 100)).padStart(5)}%  ${String(r.stop).padStart(5)}  ` +
    `${r.divisoria.toFixed(1).padStart(8)}  ${(r.real === null ? '    fora' : r.real.toFixed(1).padStart(11))}  ` +
    `${erro === null ? '' : (erro > TOL ? 'FORA ' + Math.round(erro) + 'pp' : 'ok')}`,
  );
}

console.log(`\n${bad === 0 ? 'a divisória acompanha o conteúdo' : bad + ' ponto(s) com a divisória fora do lugar'}`);
await b.close();
process.exit(bad === 0 ? 0 : 1);

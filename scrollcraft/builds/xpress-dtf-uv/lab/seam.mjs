/* seam.mjs — a fronteira entre os dois chãos está no lugar certo?
 *
 * No telefone os dois mundos viram duas faixas empilhadas, e a fronteira entre
 * marrom (têxtil) e azul (UV) tem que cair exatamente no limite entre os dois
 * blocos. Nos atos 1 e 2 isso não é mais dirigido por JS: cada faixa carrega o
 * próprio chão, então a fronteira é o limite do bloco por construção. O que
 * pode dar errado é sobrar uma segunda divisória por cima — o chão global ou o
 * fio de luz fixo — que no iOS atrasa durante a rolagem por inércia e aparece
 * no lugar errado. Foi o defeito relatado: a linha azul acima do botão.
 *
 * Então em cada ponto o teste pergunta: logo acima da costura quem pinta é o
 * chão do têxtil, logo abaixo é o `.side--b`, e o fio fixo está invisível?
 *
 *   node scrollcraft/builds/xpress-dtf-uv/lab/seam.mjs [largura] [altura]
 */
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const URL = pathToFileURL(path.resolve('index.html')).href;
const W = Number(process.argv[2]) || 390;
const H = Number(process.argv[3]) || 844;

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: W, height: H } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);

const total = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
let bad = 0;

console.log(`${W}x${H}\n`);
console.log('posicao  parada  costura  acima          abaixo         fio fixo');
for (let i = 0; i <= 14; i++) {
  const m = i / 40;                       /* os dois primeiros atos */
  await p.evaluate((y) => window.scrollTo(0, y), Math.round(total * m));
  await p.waitForTimeout(220);

  const r = await p.evaluate(() => {
    const stop = document.body.getAttribute('data-stop');
    const rail = document.querySelector('.rail');
    const fio = getComputedStyle(rail).opacity;
    const act = document.querySelector(`.act--${stop}`);
    const sb = act && act.querySelector('.side--b');
    if (!sb) return { stop, fio, costura: null };

    const top = sb.getBoundingClientRect().top;
    /* atrás da barra fixa não há o que conferir: nada ali aparece */
    const barra = document.querySelector('.cap').getBoundingClientRect().bottom;
    if (top <= barra + 8 || top >= innerHeight - 8) return { stop, fio, costura: null };

    /* na borda direita, onde há só fundo: quem pinta logo acima e logo abaixo */
    const x = innerWidth - 4;
    const quem = (y) => {
      let el = document.elementFromPoint(x, y);
      while (el && getComputedStyle(el).backgroundImage === 'none'
                && getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)') el = el.parentElement;
      if (!el) return '?';
      if (el.closest('.side--b')) return 'side--b';
      if (el.classList.contains('sc-stage') || el.closest('.sc-stage')) return 'palco';
      if (el.classList.contains('world__uv')) return 'mundo-uv';
      if (el.classList.contains('world__tx')) return 'mundo-tx';
      return el.className || el.tagName;
    };
    return { stop, fio, costura: Math.round(top), acima: quem(top - 6), abaixo: quem(top + 6) };
  });

  if (r.costura === null) {
    console.log(`${String(Math.round(m * 100)).padStart(5)}%  ${String(r.stop).padStart(5)}     fora`);
    continue;
  }
  /* abaixo tem que ser o próprio bloco azul, e o fio fixo não pode concorrer */
  const ok = r.abaixo === 'side--b' && r.fio === '0';
  if (!ok) bad++;
  console.log(
    `${String(Math.round(m * 100)).padStart(5)}%  ${String(r.stop).padStart(5)}  ${String(r.costura).padStart(7)}  ` +
    `${String(r.acima).slice(0, 14).padEnd(15)}${String(r.abaixo).slice(0, 14).padEnd(15)}` +
    `${r.fio === '0' ? 'invisivel' : 'VISIVEL ' + r.fio}  ${ok ? '' : '<-- ERRO'}`,
  );
}

console.log(`\n${bad === 0 ? 'a fronteira é o próprio bloco, sem divisória concorrente' : bad + ' ponto(s) com problema'}`);
await b.close();
process.exit(bad === 0 ? 0 : 1);

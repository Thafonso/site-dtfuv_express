/* hero.mjs — quanto espaço sobra para a amostra de cada lado do herói.
 *
 * No telefone o herói tem que entregar, numa tela só, a chamada e as duas
 * portas com os dois botões. A amostra é a única peça elástica: o resto é
 * texto e botão. Este script mede o que o resto ocupa e devolve a altura que
 * sobra para a foto, por tamanho de aparelho.
 *
 *   node scrollcraft/builds/xpress-dtf-uv/lab/hero.mjs
 */
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const URL = pathToFileURL(path.resolve('index.html')).href;
const VIEWS = [[414, 896, 'phone-l'], [390, 844, 'phone'], [375, 667, 'phone-m'], [360, 740, 'phone-s'], [320, 568, 'phone-xs']];

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });

console.log('tela         amostra   sobra   ultimo botao   fora da tela');
for (const [w, h, name] of VIEWS) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(800);

  const r = await p.evaluate(() => {
    const act = document.getElementById('top');
    const q = (s) => act.querySelector(s);
    const hh = (el) => (el && getComputedStyle(el).display !== 'none' ? Math.round(el.getBoundingClientRect().height) : 0);
    const shots = [...act.querySelectorAll('.shot')];
    const btns = [...act.querySelectorAll('.actions .btn')];
    const last = btns[btns.length - 1].getBoundingClientRect();
    const sh = shots[0].getBoundingClientRect();
    return {
      shotH: Math.round(sh.height), shotW: Math.round(sh.width),
      folga: Math.round(innerHeight - last.bottom),
      fora: btns.filter((x) => x.getBoundingClientRect().bottom > innerHeight + 1).length,
      barra: Math.round(document.querySelector('.cap').getBoundingClientRect().height),
      tagTopo: hh(q('.hero__lead .tag')),
      titulo: hh(q('.hero__lead .h-xl')),
      lede: hh(q('.hero__lead .lede')),
      tagLado: hh(q('.side--a .tag')),
      subtitulo: hh(q('.side--a .h-sm')),
      botao: hh(q('.side--a .actions .btn')),
    };
  });

  const cabe = r.shotH + Math.floor(r.folga / 2);
  console.log(
    `${name.padEnd(9)} ${String(r.shotW + 'x' + r.shotH).padStart(9)} ${String(r.folga).padStart(6)}  ` +
    `barra ${r.barra} · tag ${r.tagTopo} · título ${r.titulo} · lede ${r.lede} · ` +
    `tag-lado ${r.tagLado} · subtítulo ${r.subtitulo} · botão ${r.botao}` +
    `  → caberia ${cabe}px (${(r.shotW / cabe).toFixed(2)}:1) fora:${r.fora}`,
  );
  await p.close();
}
await b.close();

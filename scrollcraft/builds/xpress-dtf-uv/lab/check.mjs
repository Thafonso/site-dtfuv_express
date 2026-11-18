import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';

const URL = pathToFileURL('C:/Users/thiag/.vscode/upside/site-express/index.html').href;
const OUT = process.argv[2];
const VIEWS = [[1440, 900, 'desktop'], [1280, 800, 'laptop'], [768, 1024, 'tablet'], [390, 844, 'phone'], [360, 740, 'phone-s']];

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });

for (const [w, h, name] of VIEWS) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1200);

  const doc = await p.evaluate(() => ({
    total: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    acts: [...document.querySelectorAll('.act')].map(a => a.id + ':' + Math.round(a.offsetHeight / innerHeight * 10) / 10)
  }));
  console.log(`\n== ${name} ${w}x${h} | ${doc.total} telas | rolagem horizontal: ${doc.overflow ? 'SIM' : 'nao'}`);
  console.log('   ' + doc.acts.join('  '));

  // topo de cada ato: título visível e dentro da tela?
  for (const id of ['top', 'tecnicas', 'aplicacao', 'pedir', 'duvidas', 'orcamento']) {
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(150);
    await p.evaluate(i => document.getElementById(i).scrollIntoView({ behavior: 'instant', block: 'start' }), id);
    await p.waitForTimeout(700);
    const m = await p.evaluate(i => {
      const s = document.getElementById(i);
      const head = s.querySelector('h1, h2');
      const holder = head.closest('[data-sc-cue]') || head;
      const cap = document.getElementById('cap').getBoundingClientRect();
      const r = head.getBoundingClientRect();
      // tudo que precisa estar na tela nesta seção
      const must = [...s.querySelectorAll('.btn, .shot, dl.spec, .format')];
      const cut = must.filter(e => { const b = e.getBoundingClientRect(); return b.bottom > innerHeight + 2 || b.top < -2; }).length;
      return { gap: Math.round(r.top - cap.bottom), op: +getComputedStyle(holder).opacity, cut, must: must.length };
    }, id);
    console.log(`   ${id.padEnd(10)} gap=${String(m.gap).padStart(4)}px op=${m.op.toFixed(2)} fora-da-tela=${m.cut}/${m.must}`);
    if (OUT) await p.screenshot({ path: `${OUT}/${name}-${id}.png` });
  }
  if (errs.length) console.log('   ERROS: ' + errs.slice(0, 4).join(' | '));
  await p.close();
}
await b.close();

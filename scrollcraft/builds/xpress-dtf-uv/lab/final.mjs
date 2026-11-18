import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
const URL = pathToFileURL('C:/Users/thiag/.vscode/upside/site-express/index.html').href;
const OUT = process.argv[2];
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });

// 1 · texto dos títulos cinéticos, depois de divididos
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(800);
  const t = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (const f of [0, 0.12, 0.3, 0.45]) { await p.evaluate(v => scrollTo(0, v), Math.round(t*f)); await p.waitForTimeout(450); }
  console.log('titulos:', await p.evaluate(() => [...document.querySelectorAll('[data-sc-kinetic]')].map(e => e.textContent)));
  await p.close();
}

// 2 · movimento reduzido: tudo legivel, nada escondido atras de um cue
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(800);
  const t = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const hidden = [];
  for (let i = 0; i <= 10; i++) {
    await p.evaluate(v => scrollTo(0, v), Math.round(t*i/10)); await p.waitForTimeout(400);
    const h = await p.evaluate(() => [...document.querySelectorAll('h1, h2, .btn, .step, .spec dd')]
      .filter(e => { const r = e.getBoundingClientRect(); return r.top > 40 && r.bottom < innerHeight - 10 && r.height > 0 && +getComputedStyle(e.closest('[data-sc-cue],[data-sc-in]') || e).opacity < 0.25; })
      .map(e => (e.tagName + ':' + e.textContent.trim().slice(0, 28))));
    hidden.push(...h);
  }
  console.log('reduced · visivel mas opaco<0.25:', [...new Set(hidden)].slice(0,6), '(' + new Set(hidden).size + ')');
  if (OUT) { await p.evaluate(v => scrollTo(0, Math.round(v*0.35)), t); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/reduced-peak.png` }); }
  await p.close();
}

// 3 · arraste do destaque
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('aplicacao').scrollIntoView({behavior:'instant',block:'start'}));
  await p.evaluate(() => scrollBy(0, innerHeight * 1.0)); await p.waitForTimeout(700);
  const box = await p.locator('.peel__panel').boundingBox();
  const before = await p.evaluate(() => +getComputedStyle(document.getElementById('peel')).getPropertyValue('--peel'));
  await p.mouse.move(box.x + box.width*0.8, box.y + box.height/2);
  await p.mouse.down();
  for (let i = 1; i <= 8; i++) { await p.mouse.move(box.x + box.width*(0.8 - 0.07*i), box.y + box.height/2); await p.waitForTimeout(35); }
  await p.waitForTimeout(250);
  const during = await p.evaluate(() => +getComputedStyle(document.getElementById('peel')).getPropertyValue('--peel'));
  if (OUT) await p.screenshot({ path: `${OUT}/drag.png` });
  await p.mouse.up();
  console.log(`arraste: --peel ${before.toFixed(2)} -> ${during.toFixed(2)} (${during > before + 0.1 ? 'OK' : 'SEM RESPOSTA'})`);
  await p.close();
}

// 4 · foco por teclado alcanca os dois CTA
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(700);
  const seq = [];
  for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(() => (document.activeElement.textContent||document.activeElement.ariaLabel||'').trim().slice(0,26))); }
  console.log('tab:', seq.filter(Boolean).slice(0,12).join(' > '));
  await p.close();
}
await b.close();

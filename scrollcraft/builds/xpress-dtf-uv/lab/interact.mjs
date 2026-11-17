import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await p.goto('http://localhost:4500', { waitUntil: 'networkidle' });

// 1. ordem de foco a partir do topo
const order = [];
for (let i = 0; i < 9; i++) {
  await p.keyboard.press('Tab');
  order.push(await p.evaluate(() => {
    const a = document.activeElement;
    const r = a.getBoundingClientRect();
    return (a.tagName + ':' + (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 26)
      + ' @' + Math.round(r.x) + ',' + Math.round(r.y)
      + ' outline=' + getComputedStyle(a).outlineWidth);
  }));
}
console.log('FOCO:'); order.forEach(o => console.log('  ' + o));

// 2. arraste do destaque
const top = await p.evaluate(() => document.getElementById('aplicacao').getBoundingClientRect().top + scrollY);
const travel = await p.evaluate(() => document.getElementById('aplicacao').offsetHeight - innerHeight);
await p.evaluate(y => window.scrollTo(0, y), Math.round(top + travel * 0.5));
await p.waitForTimeout(700);
const before = await p.evaluate(() => getComputedStyle(document.getElementById('peel')).getPropertyValue('--peel'));
const box = await p.locator('.peel__panel').boundingBox();
await p.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
await p.mouse.down();
await p.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, { steps: 12 });
await p.waitForTimeout(250);
const during = await p.evaluate(() => getComputedStyle(document.getElementById('peel')).getPropertyValue('--peel'));
await p.mouse.up();
await p.waitForTimeout(900);
const after = await p.evaluate(() => getComputedStyle(document.getElementById('peel')).getPropertyValue('--peel'));
console.log('DESTAQUE  antes=' + before, 'arrastando=' + during, 'depois=' + after);
await p.screenshot({ path: 'lab/peel/drag.png' });

// 3. links externos e FAQ
const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.href));
const wa = links.filter(h => h.includes('wa.me'));
console.log('WHATSAPP:', [...new Set(wa)].join(' | '));
console.log('LINKS externos:', [...new Set(links.filter(h => !h.startsWith('http://localhost')))].length);
const faq = await p.locator('.faq details').count();
await p.locator('.faq summary').first().click();
await p.waitForTimeout(200);
const open = await p.evaluate(() => document.querySelector('.faq details').open);
console.log('FAQ itens=' + faq, 'abre=' + open);

// 4. estado final
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await p.waitForTimeout(800);
console.log('FIM stop=' + await p.evaluate(() => document.body.dataset.stop),
            'split=' + await p.evaluate(() => getComputedStyle(document.body).getPropertyValue('--split')));
console.log('ERROS:', errs.length ? errs : 'nenhum');
await b.close();

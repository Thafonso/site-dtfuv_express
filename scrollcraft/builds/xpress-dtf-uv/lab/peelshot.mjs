import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:4500', { waitUntil: 'networkidle' });
const top = await p.evaluate(() => document.getElementById('aplicacao').getBoundingClientRect().top + scrollY);
const travel = await p.evaluate(() => document.getElementById('aplicacao').offsetHeight - innerHeight);
let i = 0;
for (const prog of [0.30, 0.45, 0.60, 0.75, 0.90]) {
  await p.evaluate(y => window.scrollTo(0, y), Math.round(top + travel * prog));
  await p.waitForTimeout(800);
  await p.screenshot({ path: `lab/peel/${i++}-${prog}.png` });
}
await b.close();
console.log('ok');

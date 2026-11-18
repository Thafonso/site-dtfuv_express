import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
const URL = pathToFileURL('C:/Users/thiag/.vscode/upside/site-express/index.html').href;
const OUT = process.argv[2], W = +process.argv[3] || 1440, H = +process.argv[4] || 900;
const TAG = process.argv[5] || 'd';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage({ viewport: { width: W, height: H } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1000);
const total = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const N = 14;
for (let i = 0; i <= N; i++) {
  const y = Math.round(total * i / N);
  await p.evaluate(v => window.scrollTo(0, v), y);
  await p.waitForTimeout(650);
  await p.screenshot({ path: `${OUT}/${TAG}-${String(i).padStart(2,'0')}.png` });
}
await b.close();
console.log('frames: ' + (N+1));

import { chromium } from 'playwright-core';

const base = process.env.SMOKE_URL || 'http://127.0.0.1:4174';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('ERR_CERT')) errors.push('console: ' + m.text());
});
await page.goto(base + '/', { waitUntil: 'networkidle' });

const panelX = async () =>
  page.$eval('.panel--left', (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);

// Board starts open at x=0
await page.waitForTimeout(400);
let x = await panelX();
if (Math.abs(x) > 2) throw new Error('board should start open, x=' + x);
console.log('board open at rest: OK (x=' + x.toFixed(1) + ')');

// 1. Slow short drag left, release -> snaps back open
await page.mouse.move(300, 500);
await page.mouse.down();
for (let i = 1; i <= 10; i++) {
  await page.mouse.move(300 - i * 8, 500); // 80px total, slow
  await page.waitForTimeout(30);
}
await page.mouse.up();
await page.waitForTimeout(700);
x = await panelX();
if (Math.abs(x) > 3) throw new Error('short slow drag should snap back, x=' + x);
console.log('short drag snaps back open: OK');

// 2. Fast flick left -> closes even though distance is small (momentum projection)
await page.mouse.move(300, 500);
await page.mouse.down();
for (let i = 1; i <= 5; i++) {
  await page.mouse.move(300 - i * 30, 500); // 150px in ~5 frames = fast
  await page.waitForTimeout(8);
}
await page.mouse.up();
await page.waitForTimeout(900);
x = await panelX();
if (x > -300) throw new Error('flick should close the board, x=' + x);
console.log('flick closes board via momentum: OK (x=' + x.toFixed(1) + ')');

// Stage padding followed the panel out
const pad = await page.$eval('.app-shell', (el) => getComputedStyle(el).paddingLeft);
if (parseFloat(pad) > 4) throw new Error('stage padding should follow board closed: ' + pad);
console.log('stage shift tracks board: OK (padding ' + pad + ')');

// 3. Rubber-band: reopen, drag right past the edge — panel moves less than the finger
await page.click('button[aria-label="Open pit board (to-dos)"]');
await page.waitForTimeout(700);
await page.mouse.move(300, 500);
await page.mouse.down();
await page.mouse.move(420, 500, { steps: 8 }); // 120px past open
await page.waitForTimeout(60);
const xDuring = await panelX();
if (xDuring <= 2 || xDuring >= 100) throw new Error('rubber-band expected 0<x<100, got ' + xDuring);
console.log('rubber-band resists overdrag: OK (120px finger -> ' + xDuring.toFixed(1) + 'px panel)');
await page.mouse.up();
await page.waitForTimeout(600);

// 4. Scrim tracks an overlay panel drag 1:1
await page.click('button[aria-label="Open telemetry (statistics)"]');
await page.waitForTimeout(700);
await page.mouse.move(1200, 450);
await page.mouse.down();
await page.mouse.move(1370, 450, { steps: 10 }); // drag half-ish out
await page.waitForTimeout(60);
const scrimMid = await page.$eval('.scrim', (el) => parseFloat(getComputedStyle(el).opacity));
if (!(scrimMid > 0.05 && scrimMid < 0.95)) throw new Error('scrim should partially dim mid-drag: ' + scrimMid);
console.log('scrim tracks drag 1:1: OK (opacity ' + scrimMid.toFixed(2) + ' mid-drag)');
await page.mouse.up();
await page.waitForTimeout(900);

// 5. Picker springs in and out
await page.click('button[aria-label="Start or pause"]');
await page.waitForSelector('.picker-card', { timeout: 3000 });
await page.keyboard.press('Escape');
await page.waitForSelector('.picker-card', { state: 'detached', timeout: 3000 });
console.log('picker enter/exit springs: OK');

// 6. Dock collapse animates chrome away and back
await page.click('button[aria-label="Dock as widget"]');
await page.waitForTimeout(700);
const headerGone = (await page.$$('.topbar')).length === 0;
if (!headerGone) throw new Error('header should unmount when docked');
await page.click('button[aria-label="Undock widget"]');
await page.waitForTimeout(700);
const headerBack = (await page.$$('.topbar')).length === 1;
if (!headerBack) throw new Error('header should return on undock');
console.log('dock/undock collapse: OK');

if (errors.length) throw new Error('browser errors: ' + errors.join(' | '));
console.log('ALL FLUID CHECKS PASSED');
await browser.close();

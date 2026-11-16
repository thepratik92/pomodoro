// Smoke test for the cockpit beta (the alternative interface in src/cockpit).
// smoke.mjs covers the classic interface; this covers the choice between the
// two and the cockpit's own controls. Run against `npm run preview`.
import { chromium } from 'playwright-core';

const base = process.env.SMOKE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const ok = (m) => console.log(m + ': OK');

// 1. Default is the classic interface, and nothing of the beta is fetched.
const fetched = [];
page.on('request', (r) => fetched.push(r.url()));
await page.goto(base + '/', { waitUntil: 'networkidle' });
if (!(await page.$('.btn-engine'))) throw new Error('classic is not the default');
if (await page.getAttribute('html', 'data-ui')) throw new Error('data-ui set on classic');
if (fetched.some((u) => /Cockpit|barlow/i.test(u))) throw new Error('classic fetched beta assets: ' + fetched.filter((u) => /Cockpit|barlow/i.test(u)));
ok('classic is default and loads no beta assets');

// 2. Switch to the cockpit from Set-up, with a session running: the clock carries over.
await page.click('button[aria-label="Start or pause"]');
await page.fill('input[aria-label="New focus task"]', 'Carry me across');
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
await page.click('button[aria-label="Open set-up"]');
await page.click('.theme-btn:has-text("COCKPIT")');
await page.waitForSelector('.cockpit .ck-stint');
if ((await page.getAttribute('html', 'data-ui')) !== 'cockpit') throw new Error('data-ui not set');
const digits = (await page.textContent('.ck-digits')).trim();
if (!/^24:5\d$/.test(digits)) throw new Error('clock did not carry over: ' + digits);
if ((await page.textContent('.ck-key-state')) !== 'PAUSE') throw new Error('not running after switch');
if (!(await page.textContent('.ck-now')).includes('Carry me across')) throw new Error('task missing on control panel');
ok('switch to cockpit mid-session keeps the clock, task and run state (' + digits + ')');
await page.click('button[aria-label="Close set-up"]');
await page.waitForTimeout(600);

// 3. Controls: pause via key, mode via selector, keyboard shortcuts.
await page.click('.ck-key');
if ((await page.textContent('.ck-key-state')) !== 'RESUME') throw new Error('pause failed');
await page.click('button[role="radio"][aria-label="Short break"]');
if ((await page.getAttribute('html', 'data-mode')) !== 'short') throw new Error('mode selector failed');
if ((await page.textContent('.ck-digits')).trim() !== '05:00') throw new Error('short break duration wrong');
await page.evaluate(() => document.activeElement.blur());
await page.keyboard.press('Space');
await page.waitForTimeout(300);
if ((await page.textContent('.ck-key-state')) !== 'PAUSE') throw new Error('space did not start');
await page.keyboard.press('r');
if ((await page.textContent('.ck-key-state')) !== 'START') throw new Error('R did not reset');
await page.keyboard.press('s');
if ((await page.getAttribute('html', 'data-mode')) !== 'focus') throw new Error('S did not skip to focus');
ok('key, mode selector and keyboard shortcuts');

// 4. Selectable instruments cycle and persist.
await page.click('.ck-trend');
await page.click('.ck-multigraph');
const prefs = JSON.parse(await page.evaluate(() => localStorage.getItem('tempo-cockpit')));
if (prefs.trend !== 'week' || prefs.graph !== 'chrono') throw new Error('prefs: ' + JSON.stringify(prefs));
ok('trend dial and multigraph cycle and persist');

// 5. Tiles and dock open the sheets; Escape closes; board is not open on arrival.
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.cockpit .ck-stint');
if ((await page.getAttribute('.panel--left', 'data-open')) !== 'false') throw new Error('board open on arrival');
await page.click('.ck-board');
await page.waitForTimeout(500);
if ((await page.getAttribute('.panel--left', 'data-open')) !== 'true') throw new Error('board tile did not open board');
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
await page.click('.ck-today');
await page.waitForTimeout(500);
if (!(await page.isVisible('.panel-title:has-text("TELEMETRY")'))) throw new Error('telemetry not open');
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
ok('cockpit persists across reload; tiles open sheets; board closed on arrival');

// 6. Start with no current task opens the picker (same rule as classic).
await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('tempo-data')); d.currentTaskId = null; d.running = false; localStorage.setItem('tempo-data', JSON.stringify(d)); });
await page.reload({ waitUntil: 'networkidle' });
await page.click('.ck-key');
await page.waitForSelector('.picker-card');
await page.click('.picker-skip');
await page.waitForTimeout(300);
if ((await page.textContent('.ck-key-state')) !== 'PAUSE') throw new Error('start without task failed');
ok('start without a task goes through the picker');

// 7. Back to classic: via the header button; ?ui= link also works and is consumed.
await page.click('.ck-exit');
await page.waitForSelector('.btn-engine');
if (await page.getAttribute('html', 'data-ui')) throw new Error('data-ui left behind on classic');
if ((await page.getAttribute('meta[name="theme-color"]', 'content')) !== '#060607') throw new Error('theme-color not restored');
await page.goto(base + '/?ui=cockpit', { waitUntil: 'networkidle' });
await page.waitForSelector('.cockpit');
if (page.url().includes('ui=')) throw new Error('ui param not consumed: ' + page.url());
ok('return to classic restores everything; ?ui=cockpit link works');

await browser.close();
if (errors.length) {
  console.error('ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('cockpit beta smoke: all OK');

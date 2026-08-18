import { chromium } from 'playwright-core';

const base = process.env.SMOKE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('ERR_CERT')) errors.push('console: ' + m.text());
});

await page.goto(base + '/', { waitUntil: 'networkidle' });

// 1. Engine START with empty board -> picker should open
await page.click('button[aria-label="Start or pause"]');
await page.waitForSelector('.picker-card', { timeout: 3000 });
console.log('picker opens on start: OK');

// 2. Add a new task from the picker -> becomes current, added to Today, timer starts
await page.fill('input[aria-label="New focus task"]', 'Write quarterly report');
await page.keyboard.press('Enter');
await page.waitForSelector('.picker-card', { state: 'detached', timeout: 3000 });
const taskLine = await page.textContent('.task-banner');
if (!taskLine.includes('Write quarterly report')) throw new Error('task line missing: ' + taskLine);
console.log('task shown with clock: OK');
const engine = await page.textContent('.btn-engine-state');
if (engine !== 'PAUSE') throw new Error('timer not running, engine says: ' + engine);
console.log('timer started after add: OK');

// 3. Pit board should show it under TODAY with the current marker
const sectionLabel = await page.textContent('.todo-section-label');
if (!sectionLabel.includes('TODAY')) throw new Error('no TODAY section: ' + sectionLabel);
await page.waitForSelector('.todo-current-dot', { timeout: 2000 });
console.log('pit board TODAY section + current marker: OK');

// 4. Add a task to SOMEDAY via chips
await page.click('.bucket-chip:has-text("SOMEDAY")');
await page.fill('input[aria-label="New to-do"]', 'Learn Rust');
await page.keyboard.press('Enter');
const labels = await page.$$eval('.todo-section-label', (els) => els.map((e) => e.textContent));
if (!labels.some((l) => l.includes('SOMEDAY'))) throw new Error('no SOMEDAY section: ' + labels);
console.log('bucket chips add to someday: OK');

// 5. Pause, then click the task line -> switch picker opens listing both tasks
await page.click('button[aria-label="Start or pause"]');
await page.click('.task-banner');
await page.waitForSelector('.picker-card', { timeout: 3000 });
const pickerItems = await page.$$eval('.picker-item-text', (els) => els.map((e) => e.textContent));
if (pickerItems.length !== 2) throw new Error('picker items: ' + JSON.stringify(pickerItems));
// switch intent should NOT offer "start without task"
const skip = await page.$('.picker-skip');
if (skip) throw new Error('skip button should be hidden for switch intent');
console.log('switch picker lists tasks, no skip: OK');

// 6. Pick the someday task -> moves to today, becomes current (timer stays paused)
await page.click('.picker-item:has-text("Learn Rust")');
await page.waitForSelector('.picker-card', { state: 'detached', timeout: 3000 });
const line2 = await page.textContent('.task-banner');
if (!line2.includes('Learn Rust')) throw new Error('switch failed: ' + line2);
const engine2 = await page.textContent('.btn-engine-state');
if (engine2 !== 'START') throw new Error('switch should not start timer: ' + engine2);
await page.waitForTimeout(700); // persistence is debounced 400ms
const stored = JSON.parse(await page.evaluate(() => localStorage.getItem('tempo-data')));
const rust = stored.todos.find((t) => t.text === 'Learn Rust');
if (rust.bucket !== 'today') throw new Error('picked task not moved to today: ' + rust.bucket);
console.log('pick moves task to today + persists: OK');

// 7. Checking off the current task clears the dial line
await page.click('.todo-item:has-text("Learn Rust") .todo-check');
const line3 = await page.textContent('.task-banner');
if (!line3.includes('SET FOCUS TASK')) throw new Error('done task still on dial: ' + line3);
console.log('done task clears dial line: OK');

// 8. Auto-start must run the NEXT session's duration, not the one that just
//    ended. Driven through Skip so it takes seconds instead of a full stint.
await page.click('button[aria-label="Open set-up"]');
await page.click('.setup-row:has-text("AUTO-START NEXT") .switch');
await page.click('button[aria-label="Close set-up"]');
await page.waitForTimeout(500); // panel spring settles, scrim stops catching clicks
await page.click('button[aria-label="Reset session"]');
await page.click('button[aria-label="Skip to next session"]');
await page.waitForTimeout(3000); // auto-start fires at 1400ms, then let it visibly tick
const engine3 = await page.textContent('.btn-engine-state');
if (engine3 !== 'PAUSE') throw new Error('auto-start did not start the next session: ' + engine3);
const autoClock = (await page.textContent('.timer-display')).replace(/\s/g, '');
const autoMins = parseInt(autoClock.split(':')[0], 10);
// The short break is 5 min and has now been running long enough to tick, so a
// reading of 05 or more means it inherited the focus stint's 25-minute clock.
if (!(autoMins < 5)) throw new Error('auto-started break has the wrong duration: ' + autoClock + ' (expected under 05:00)');
console.log('auto-start uses the next session duration: OK');

// 9. A session still running at launch resumes on the real clock, rather than
//    resetting — the process can be reclaimed at any time.
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('tempo-data'));
  Object.assign(d, { mode: 'focus', running: true, endAt: Date.now() + 5 * 60000, focusInCycle: 0 });
  d.settings.autoStart = false;
  localStorage.setItem('tempo-data', JSON.stringify(d));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const resumedEngine = await page.textContent('.btn-engine-state');
if (resumedEngine !== 'PAUSE') throw new Error('in-flight session did not resume: ' + resumedEngine);
const resumedClock = (await page.textContent('.timer-display')).replace(/\s/g, '');
if (!/^0[45]:/.test(resumedClock)) throw new Error('resumed on the wrong clock: ' + resumedClock);
console.log('in-flight session resumes on launch: OK');

// 10. One that ran out while the app was gone is banked and the cadence moves
//     on, instead of the lap disappearing.
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('tempo-data'));
  Object.assign(d, { mode: 'focus', running: true, endAt: Date.now() - 60000, focusInCycle: 0, days: {} });
  d.settings.autoStart = false;
  localStorage.setItem('tempo-data', JSON.stringify(d));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const bankedMode = await page.evaluate(() => document.documentElement.getAttribute('data-mode'));
if (bankedMode !== 'short') throw new Error('elapsed session did not advance the cadence: ' + bankedMode);
const bankedEngine = await page.textContent('.btn-engine-state');
if (bankedEngine !== 'START') throw new Error('restore should not start running: ' + bankedEngine);
await page.waitForTimeout(700); // persistence is debounced
const banked = JSON.parse(await page.evaluate(() => localStorage.getItem('tempo-data')));
const entry = Object.values(banked.days)[0];
if (!entry || entry.s !== 1) throw new Error('lap not banked: ' + JSON.stringify(banked.days));
console.log('session that elapsed while away is banked on launch: OK');

if (errors.length) throw new Error('browser errors: ' + errors.join(' | '));
console.log('ALL SMOKE TESTS PASSED');
await browser.close();

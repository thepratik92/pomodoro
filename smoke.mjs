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

// ---- Mini widget / picture-in-picture ------------------------------------
// A fresh context: the widget is about window state, not the session state the
// tests above have been building up, and the PiP window arrives as a second
// page that only an explicit context will hand out.
const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });

// 11. The header's arrow pops the timer out into a Document Picture-in-Picture
//     window — a real always-on-top OS window, not a panel inside the page.
const wPage = await ctx.newPage();
wPage.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await wPage.goto(base + '/', { waitUntil: 'networkidle' });
const pipOpened = ctx.waitForEvent('page');
await wPage.click('button[aria-label="Open mini widget"]');
const pip = await pipOpened;
await pip.waitForSelector('.mw--pip', { timeout: 5000 });
if (!(await pip.$('.mw-play'))) throw new Error('no play/pause button in the ring');
// The ring has to be the main screen's dial rather than a second idea about
// circles: the same sweep path, a tick ring, and the dot that rides it.
const dialPath = await wPage.getAttribute('.dial-arc', 'd');
const ringPath = await pip.getAttribute('.mw-ring-arc', 'd');
if (ringPath !== dialPath) throw new Error('widget ring is off the dial geometry: ' + ringPath + ' vs ' + dialPath);
if ((await pip.$$('.mw-tick--major')).length !== 11) throw new Error('widget ring is missing the dial tick scale');
if (!(await pip.$('.mw-tick--red'))) throw new Error('widget ring is missing the dial red zone');
if (!(await pip.$('.mw-ring-dot'))) throw new Error('widget ring has no dot riding the sweep');
const pipMetrics = await pip.textContent('.mw-metrics');
if (!/TODAY/.test(pipMetrics) || !/WEEK/.test(pipMetrics)) throw new Error('metrics row missing: ' + pipMetrics);
console.log('arrow opens the widget in a PiP window: OK');

// 12. The widget drives the same clock: pressing play there starts the app.
await pip.click('.mw-play');
await wPage.waitForTimeout(400);
if ((await wPage.textContent('.btn-engine-state')) !== 'PAUSE') throw new Error('widget play did not start the app timer');
const pipClock = await pip.textContent('.mw-time');
if (!/^\d\d:\d\d$/.test(pipClock.replace(/\s/g, ''))) throw new Error('widget clock not MM:SS: ' + pipClock);
console.log('widget play/pause drives the app timer: OK');

// 13. The mode label follows the session, and the theme is mirrored into the
//     separate document the PiP window owns.
if ((await pip.textContent('.mw-label')).trim() !== 'FOCUS') throw new Error('widget mode label wrong');
await wPage.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
await wPage.waitForTimeout(250);
if ((await pip.evaluate(() => document.documentElement.getAttribute('data-theme'))) !== 'light')
  throw new Error('theme not mirrored into the PiP document');
await wPage.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
console.log('widget label + theme track the app: OK');

// 14. The widget moves the session on by itself, without a trip back to the
//     app: skip takes a focus lap to its break and the label follows.
await pip.click('.mw-skip');
await wPage.waitForTimeout(400);
if ((await wPage.evaluate(() => document.documentElement.getAttribute('data-mode'))) !== 'short')
  throw new Error('widget skip did not advance the session');
if ((await pip.textContent('.mw-label')).trim() !== 'SHORT BREAK') throw new Error('widget label did not follow the skip');
if ((await wPage.textContent('.btn-engine-state')) !== 'START') throw new Error('skip should leave the next session paused');
console.log('widget skip advances to the next session: OK');

// 15. Unpinning brings the widget back inside the app window as a floating
//     card, and re-pinning sends it back out — the always-on-top switch.
await pip.click('.mw-chrome-btn[aria-pressed="true"]');
await wPage.waitForSelector('.widget-card .mw--floating', { timeout: 4000 });
if (!pip.isClosed()) throw new Error('PiP window survived unpinning');
const pipReopened = ctx.waitForEvent('page');
await wPage.click('.widget-card .mw-chrome-btn[aria-pressed="false"]');
const pip2 = await pipReopened;
await pip2.waitForSelector('.mw--pip', { timeout: 5000 });
if (await wPage.$('.widget-card')) throw new Error('in-app card left behind after re-pinning');
console.log('pin toggles between always-on-top and in-app: OK');

// 16. Closing the floating window leaves widget mode entirely.
await pip2.click('.mw-chrome-btn[aria-label="Close mini widget"]');
await wPage.waitForTimeout(500);
if (!(await wPage.$('button[aria-label="Open mini widget"]'))) throw new Error('app did not come back after closing the widget');
console.log('closing the widget returns to the full app: OK');

// 17. Without Document PiP (Firefox, Safari, the Android shell) the widget
//     still floats — as a draggable, resizable card inside the app window.
const fbPage = await ctx.newPage();
fbPage.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await fbPage.addInitScript(() => {
  delete window.documentPictureInPicture;
});
await fbPage.goto(base + '/', { waitUntil: 'networkidle' });
await fbPage.click('button[aria-label="Open mini widget"]');
await fbPage.waitForSelector('.widget-card .mw--floating', { timeout: 4000 });
const before = await fbPage.locator('.widget-card').boundingBox();
await fbPage.mouse.move(before.x + before.width / 2, before.y + 14);
await fbPage.mouse.down();
for (let i = 1; i <= 8; i++) await fbPage.mouse.move(before.x + before.width / 2 - (300 * i) / 8, before.y + 14 - (200 * i) / 8);
await fbPage.mouse.up();
await fbPage.waitForTimeout(700); // the release spring settles
const after = await fbPage.locator('.widget-card').boundingBox();
if (Math.abs(after.x - before.x) < 120) throw new Error('widget did not drag: ' + before.x + ' -> ' + after.x);
const vp = fbPage.viewportSize();
if (after.x < 0 || after.y < 0 || after.x + after.width > vp.width || after.y + after.height > vp.height)
  throw new Error('widget was thrown off screen: ' + JSON.stringify(after));
console.log('in-app widget drags and stays on screen: OK');

// 18. Resizing from the grip re-lays the widget out, and the clock stays
//     legible instead of being clipped or shrinking away.
const grip = await fbPage.locator('.mw-resize').boundingBox();
await fbPage.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
await fbPage.mouse.down();
for (let i = 1; i <= 8; i++)
  await fbPage.mouse.move(grip.x + grip.width / 2 - (150 * i) / 8, grip.y + grip.height / 2 - (220 * i) / 8);
await fbPage.mouse.up();
await fbPage.waitForTimeout(300);
const small = await fbPage.evaluate(() => {
  const mw = document.querySelector('.mw');
  const time = document.querySelector('.mw-time');
  return {
    box: [Math.round(mw.getBoundingClientRect().width), Math.round(mw.getBoundingClientRect().height)],
    fontPx: parseFloat(getComputedStyle(time).fontSize),
    row: getComputedStyle(document.querySelector('.mw-main')).flexDirection,
    overflow: mw.scrollWidth - mw.clientWidth > 1 || mw.scrollHeight - mw.clientHeight > 1,
  };
});
if (small.box[0] > 200 || small.box[1] > 200) throw new Error('resize did not shrink the widget: ' + small.box);
if (small.overflow) throw new Error('widget content overflows at ' + small.box);
if (small.fontPx < 20) throw new Error('clock shrank below the legible floor: ' + small.fontPx + 'px');
if (small.row !== 'row') throw new Error('short widget did not switch to the side-by-side layout');
console.log('widget resizes, re-lays out, and stays legible: OK');

// 19. The sweep has to actually track the clock, and that is easy to break
//     without touching a single number: progress is drawn by dashing a
//     pathLength-normalised path, and a non-scaling stroke makes Chrome dash
//     in device space instead, painting the arc far past where the clock is.
//     So this checks the painted extent rather than the arithmetic — at 30%
//     elapsed the sweep must be there a fifth of the way round and gone by
//     halfway. Hit-testing honours dash gaps, which is what makes it visible
//     to a test at all.
const arcPage = await ctx.newPage();
arcPage.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await arcPage.addInitScript(() => {
  delete window.documentPictureInPicture;
});
await arcPage.goto(base + '/', { waitUntil: 'networkidle' });
await arcPage.evaluate(() => {
  localStorage.setItem('tempo-widget-geo', JSON.stringify({ x: 60, y: 60, w: 320, h: 360 }));
  const d = JSON.parse(localStorage.getItem('tempo-data') || '{}');
  d.v = 3;
  d.mode = 'focus';
  d.running = false;
  d.endAt = null;
  d.settings = { ...(d.settings || {}), focus: 25, autoStart: false, widgetPinned: false };
  d.remaining = Math.round(25 * 60000 * 0.7); // 30% elapsed
  localStorage.setItem('tempo-data', JSON.stringify(d));
});
await arcPage.reload({ waitUntil: 'networkidle' });
await arcPage.click('button[aria-label="Open mini widget"]');
await arcPage.waitForSelector('.widget-card .mw-ring-arc');
await arcPage.waitForTimeout(400);
const painted = await arcPage.evaluate(() => {
  const arc = document.querySelector('.mw-ring-arc');
  const svg = arc.ownerSVGElement;
  const total = arc.getTotalLength();
  const at = (frac) => {
    const p = arc.getPointAtLength(total * frac);
    const m = svg.getScreenCTM();
    const el = document.elementFromPoint(m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f);
    return el ? el.getAttribute('class') || el.tagName : 'none';
  };
  return { clock: document.querySelector('.mw-time').textContent.trim(), fifth: at(0.2), half: at(0.55) };
});
if (!/^17:[23]\d$/.test(painted.clock)) throw new Error('arc check did not get the clock it seeded: ' + painted.clock);
if (painted.fifth !== 'mw-ring-arc') throw new Error('sweep not painted a fifth into a 30%-elapsed lap: ' + painted.fifth);
if (painted.half === 'mw-ring-arc') throw new Error('sweep painted past the clock — progress is not tracking');
console.log('sweep is painted to the clock, not past it: OK');

if (errors.length) throw new Error('browser errors: ' + errors.join(' | '));
console.log('ALL SMOKE TESTS PASSED');
await browser.close();

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const argShotDir = process.argv.find((a) => a.startsWith('--screenshot-dir='));
const screenshotDir = argShotDir
  ? path.resolve(argShotDir.slice('--screenshot-dir='.length))
  : path.join(os.tmpdir(), 'yuval-studio-e2e-shots');
fs.mkdirSync(screenshotDir, { recursive: true });

function bundleStagingServer() {
  const outFile = path.join(os.tmpdir(), `yuval-staging-server-${process.pid}.mjs`);
  return esbuild
    .build({
      entryPoints: [path.join(rootDir, 'scripts', 'staging-server.ts')],
      outfile: outFile,
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node20',
      logLevel: 'silent',
      banner: {
        js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
      },
    })
    .then(() => outFile);
}

async function startStagingServer(bundlePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [bundlePath], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error('Timed out waiting for STAGING_READY'));
      }
    }, 15000);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      const match = text.match(/STAGING_READY\s+(http:\/\/127\.0\.0\.1:\d+)/);
      if (match && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ child, baseUrl: match[1] });
      }
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });

    child.on('exit', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`Staging server exited prematurely with code ${code}`));
      }
    });
  });
}

async function setFixture(baseUrl, state) {
  const res = await fetch(`${baseUrl}/__fixture/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  assert.equal(res.status, 200);
  return res.json();
}

async function inspectFixture(baseUrl) {
  const res = await fetch(`${baseUrl}/__fixture/inspect`);
  assert.equal(res.status, 200);
  return res.json();
}

async function typeIntoInput(page, selectorOrFinder, value) {
  const handle = await page.evaluateHandle(selectorOrFinder);
  const el = handle.asElement();
  assert.ok(el, `Expected input element for ${String(selectorOrFinder)}`);
  await el.evaluate((node) => node.scrollIntoView({ block: 'center' }));
  await el.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await el.type(value);
}

async function clickButtonByText(page, textSubstring, waitTimeoutMs = 5000) {
  try {
    await page.waitForFunction(
      (needle) =>
        Array.from(document.querySelectorAll('button, a[role="button"]')).some((el) => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            rect.width > 0 &&
            rect.height > 0 &&
            (el.textContent || '').includes(needle) &&
            !el.disabled
          );
        }),
      { timeout: waitTimeoutMs },
      textSubstring
    );
  } catch (err) {
    const diag = await page.evaluate(() => ({
      url: window.location.href,
      h2: Array.from(document.querySelectorAll('h1,h2,h3')).map((e) => e.textContent?.trim()).filter(Boolean),
      buttons: Array.from(document.querySelectorAll('button')).map((b) => ({
        text: b.textContent?.trim(),
        disabled: b.disabled,
        w: Math.round(b.getBoundingClientRect().width),
      })).filter((b) => b.w > 0),
      inputs: Array.from(document.querySelectorAll('input')).map((i) => ({
        type: i.type,
        val: i.value,
        checked: i.type === 'checkbox' ? i.checked : undefined,
        w: Math.round(i.getBoundingClientRect().width),
      })).filter((i) => i.w > 0),
    }));
    throw new Error(`clickButtonByText("${textSubstring}") timed out | diag=${JSON.stringify(diag)}`, {
      cause: err,
    });
  }
  const clicked = await page.evaluate((needle) => {
    const candidates = Array.from(document.querySelectorAll('button, a[role="button"]'));
    const target = candidates.find((el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) {
        return false;
      }
      return (el.textContent || '').includes(needle) && !el.disabled;
    });
    if (!target) return false;
    target.scrollIntoView({ block: 'center' });
    target.click();
    return true;
  }, textSubstring);
  assert.ok(clicked, `Expected visible enabled button containing "${textSubstring}"`);
}

async function dismissCookieBannerIfPresent(page) {
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const accept = btns.find((b) =>
      /(אישור כל העוגיות|קבל הכל|הכרחיות בלבד|שמירה וסגירה)/.test(b.textContent || '')
    );
    if (accept) accept.click();
  });
}

async function waitForText(page, needle, timeoutMs = 8000) {
  try {
    await page.waitForFunction(
      (t) => (document.body.innerText || '').includes(t),
      { timeout: timeoutMs },
      needle
    );
  } catch (err) {
    const diag = await page.evaluate(() => ({
      url: window.location.href,
      h2: Array.from(document.querySelectorAll('h1,h2,h3')).map((e) => e.textContent?.trim()).filter(Boolean).slice(0, 6),
      snippet: (document.body.innerText || '').slice(0, 600),
    }));
    throw new Error(`waitForText("${needle}") timed out after ${timeoutMs}ms | diag=${JSON.stringify(diag)}`, {
      cause: err,
    });
  }
}

const serverBundle = await bundleStagingServer();
let staging;
let browser;

try {
  staging = await startStagingServer(serverBundle);
  const { baseUrl } = staging;
  console.log(`Staging server started at ${baseUrl}`);

  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const pageErrors = [];
  const page = await browser.newPage();
  page.on('pageerror', (err) => pageErrors.push(`pageerror: ${err.message}`));

  // -----------------------------------------------------------------------
  // 1. Desktop 1280x800: P0 Admin Auth Gate & P2 Protected Routes
  // -----------------------------------------------------------------------
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(`${baseUrl}/#/admin`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'כניסת מנהלת מאובטחת');
  const adminDiagnostics = await page.evaluate(() => ({
    hasPasswordInput: document.querySelectorAll('input[type="password"]').length > 0,
    contains2007: document.documentElement.innerHTML.includes('2007'),
  }));
  assert.equal(adminDiagnostics.hasPasswordInput, false, 'Admin page must have zero password inputs');
  assert.equal(adminDiagnostics.contains2007, false, 'Admin page DOM must never contain legacy password 2007');
  console.log('✓ Desktop P0 /#/admin verified (no password input, Google admin gate only)');

  await page.goto(`${baseUrl}/#/dashboard`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'אזור אישי למחוברים');
  await page.goto(`${baseUrl}/#/dashboard/settings`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'אזור אישי למחוברים');
  console.log('✓ Desktop P2 ProtectedRoute verified on /#/dashboard & /#/dashboard/settings');

  // -----------------------------------------------------------------------
  // 2. Desktop 1280x800: P1-A Pricing + P1-D Closed Calendar & Waitlist
  // -----------------------------------------------------------------------
  await setFixture(baseUrl, { mode: 'closed' });
  await page.goto('about:blank');
  await page.goto(`${baseUrl}/#/booking`, { waitUntil: 'networkidle2' });
  await dismissCookieBannerIfPresent(page);
  await waitForText(page, 'לוב (תנוך)');

  // Select Earlobe (90)
  await clickButtonByText(page, 'לוב (תנוך)');
  await waitForText(page, '₪90');
  let bodyText = await page.evaluate(() => document.body.innerText);
  assert.ok(!bodyText.includes('090.000'), 'Must not render concatenated string 090.000');

  // Select Helix (+120 = 210)
  await clickButtonByText(page, 'הליקס');
  await waitForText(page, '₪210');
  bodyText = await page.evaluate(() => document.body.innerText);
  assert.ok(!bodyText.includes('090.00120'), 'Must not render concatenated string 090.00120.000');

  // Remove Helix -> restores 90
  await clickButtonByText(page, 'הליקס');
  await waitForText(page, '₪90');

  // Advance through AI Stylist skip -> Closed calendar waitlist
  await clickButtonByText(page, 'המשך לשלב הבא');
  await waitForText(page, 'דלג על השלב');
  await clickButtonByText(page, 'דלג על השלב');
  await waitForText(page, 'כרגע אין ימי קבלה פתוחים בהגדרות הסטודיו');

  await clickButtonByText(page, 'הצטרף לרשימת המתנה');
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('form input'));
    const setVal = (input, val) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    if (inputs[0]) setVal(inputs[0], 'מאיה לוי');
    if (inputs[1]) setVal(inputs[1], '0541112233');
  });
  await clickButtonByText(page, 'שמור פניה ברשימת ההמתנה');
  await waitForText(page, 'פנייתך נשמרה ברשימת ההמתנה של הסטודיו');
  const closedInspect = await inspectFixture(baseUrl);
  assert.equal(closedInspect.waitlist.length, 1);
  console.log('✓ Desktop P1-A (₪90 -> ₪210 -> ₪90) + P1-D closed calendar & waitlist verified');

  // -----------------------------------------------------------------------
  // 3. Desktop 1280x800: P1-D Open Calendar + U3 Pre-Submit Review + Booking Persist
  // -----------------------------------------------------------------------
  await setFixture(baseUrl, { mode: 'open' });
  await page.evaluate(() => localStorage.clear());
  await page.goto('about:blank');
  await page.goto(`${baseUrl}/#/booking`, { waitUntil: 'networkidle2' });
  await dismissCookieBannerIfPresent(page);
  await waitForText(page, 'לוב (תנוך)');
  await clickButtonByText(page, 'לוב (תנוך)');
  await clickButtonByText(page, 'המשך לשלב הבא');
  await waitForText(page, 'דלג על השלב');
  await clickButtonByText(page, 'דלג על השלב');
  await waitForText(page, 'בחר תאריך');

  // Select first available open day pill then first available time slot
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll('button')).some((b) => /^\d{2}:\d{2}$/.test((b.textContent || '').trim()) && !b.disabled),
    { timeout: 8000 }
  );
  await page.evaluate(() => {
    const slotBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => /^\d{2}:\d{2}$/.test((b.textContent || '').trim()) && !b.disabled
    );
    if (slotBtn) slotBtn.click();
  });
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('button')).some(
      (b) => /^\d{2}:\d{2}$/.test((b.textContent || '').trim()) && b.getAttribute('aria-pressed') === 'true'
    )
  );
  await clickButtonByText(page, 'המשך לשלב הבא');

  await waitForText(page, 'הערות נוספות');
  await dismissCookieBannerIfPresent(page);
  await typeIntoInput(
    page,
    () => {
      const lbl = Array.from(document.querySelectorAll('label')).find(
        (l) => (l.textContent || '').trim() === 'שם מלא' && l.getAttribute('for')
      );
      if (lbl) {
        const el = document.getElementById(lbl.getAttribute('for'));
        if (el && el.getBoundingClientRect().width > 0) return el;
      }
      return Array.from(document.querySelectorAll('input')).find(
        (i) => i.type === 'text' && i.getAttribute('aria-label') !== 'קוד קופון' && i.getBoundingClientRect().width > 0
      );
    },
    'שירה כהן'
  );
  await typeIntoInput(
    page,
    () => Array.from(document.querySelectorAll('input[type="tel"]')).find((i) => i.getBoundingClientRect().width > 0),
    '0501234567'
  );
  await typeIntoInput(
    page,
    () => Array.from(document.querySelectorAll('input[type="email"]')).find((i) => i.getBoundingClientRect().width > 0),
    'shira@example.com'
  );
  await clickButtonByText(page, 'המשך לשלב הבא');

  await waitForText(page, 'סקירה סופית לפני שליחה');
  await dismissCookieBannerIfPresent(page);
  // Check only the two required [חובה] consent checkboxes (avoid checking the first "under 16" checkbox!)
  const checkedRequiredCount = await page.evaluate(() => {
    const requiredLabels = Array.from(document.querySelectorAll('label')).filter((l) =>
      (l.textContent || '').includes('[חובה]')
    );
    let checkedCount = 0;
    for (const lbl of requiredLabels) {
      const cb = lbl.querySelector('input[type="checkbox"]');
      if (cb) {
        if (!cb.checked) cb.click();
        if (cb.checked) checkedCount++;
      }
    }
    return checkedCount;
  });
  assert.equal(checkedRequiredCount, 2, 'Expected both required [חובה] consent checkboxes to become checked');

  const canvasRect = await page.evaluate(async () => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    c.scrollIntoView({ block: 'center', behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 300));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const r = c.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, vh: window.innerHeight };
  });
  assert.ok(
    canvasRect && canvasRect.w > 20 && canvasRect.y >= 0 && canvasRect.y + 40 <= canvasRect.vh,
    `Expected visible in-viewport signature canvas, got ${JSON.stringify(canvasRect)}`
  );
  const startX = Math.round(canvasRect.x + canvasRect.w * 0.4);
  const startY = Math.round(canvasRect.y + canvasRect.h * 0.5);
  const endX = Math.round(canvasRect.x + canvasRect.w * 0.65);
  const endY = Math.round(canvasRect.y + canvasRect.h * 0.6);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 5 });
  await page.mouse.up();

  await clickButtonByText(page, 'אשר וקבע תור');
  await waitForText(page, 'בקשתך התקבלה בהצלחה!');
  await waitForText(page, 'מספר פניה מאומת בשרת');
  await new Promise((r) => setTimeout(r, 350));
  const openInspect = await inspectFixture(baseUrl);
  assert.equal(openInspect.appointments.length, 1);
  assert.equal(openInspect.appointments[0].final_price, 90);
  await page.screenshot({ path: path.join(screenshotDir, 'desktop-booking-confirmed.png'), fullPage: false });
  console.log('✓ Desktop Open Booking E2E + U3 pre-submit review verified & screenshotted');

  // -----------------------------------------------------------------------
  // 4. Desktop 1280x800: /#/jewelry Gallery (₪130, Escape, Wishlist) + Inventory (P1-B/P1-C/U2)
  // -----------------------------------------------------------------------
  await setFixture(baseUrl, { mode: 'open' });
  await page.goto('about:blank');
  await page.goto(`${baseUrl}/#/jewelry`, { waitUntil: 'networkidle2' });
  await dismissCookieBannerIfPresent(page);
  await waitForText(page, 'גלריית השראה');

  // Toggle guest wishlist
  const wishBtn = await page.$('button[aria-label*="רשימת משאלות"], button[aria-pressed]');
  assert.ok(wishBtn, 'Expected wishlist toggle button on gallery item');
  await wishBtn.click();
  await page.waitForFunction(() => Boolean(document.querySelector('button[aria-pressed="true"]')));

  // Open first gallery lightbox & verify single service price ₪130 (no ₪0130.00), close with Escape
  await page.evaluate(() => {
    const imgBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.getAttribute('aria-label') || '').includes('הגדלת ')
    );
    if (imgBtn) imgBtn.click();
  });
  await waitForText(page, 'קונץ׳');
  const galleryText = await page.evaluate(() => document.body.innerText);
  assert.ok(galleryText.includes('₪130'), 'Gallery estimate must render ₪130');
  assert.ok(!galleryText.includes('₪0130'), 'Gallery estimate must NOT have leading zero ₪0130');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));

  // Inventory tab & U2 search
  await clickButtonByText(page, 'מלאי העגילים');
  await waitForText(page, 'חישוק זהב 14K');
  await page.type('input[type="search"]', 'טיטניום');
  await page.waitForFunction(() => !document.body.innerText.includes('חישוק זהב 14K'));
  await clickButtonByText(page, 'איפוס סינון');
  await waitForText(page, 'חישוק זהב 14K');

  // Test below threshold first (1 x 130 + 35 shipping = 165), then add 2nd 130 + 50 = 310 -> free shipping ₪0
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('h3'));
    const findAddBtn = (name) => {
      const h = cards.find((el) => (el.textContent || '').includes(name));
      const body = h?.closest('div.p-4');
      return body ? body.querySelector('button[title="הוספה לסל הקניות"]') : null;
    };
    const addRing = findAddBtn('חישוק זהב 14K');
    if (addRing) addRing.click();
  });

  // Open cart drawer & verify delivery fee ₪35 and total ₪165 below ₪250
  await clickButtonByText(page, 'צפייה בסל הקניות');
  await waitForText(page, 'שקית הקניות שלך');
  await clickButtonByText(page, 'משלוח עד הבית');
  await waitForText(page, '₪35');
  await waitForText(page, '₪165');

  // Close drawer, add 2nd ring (130) + stud (50) -> subtotal 310 -> free shipping ₪0
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('h3'));
    const findAddBtn = (name) => {
      const h = cards.find((el) => (el.textContent || '').includes(name));
      const body = h?.closest('div.p-4');
      return body ? body.querySelector('button[title="הוספה לסל הקניות"]') : null;
    };
    const addRing = findAddBtn('חישוק זהב 14K');
    const addStud = findAddBtn('עגיל טיטניום מיני');
    if (addRing) addRing.click();
    if (addStud) addStud.click();
  });

  await clickButtonByText(page, 'צפייה בסל הקניות');
  await waitForText(page, 'חינם (הזמנה מעל המינימום)');
  await waitForText(page, '₪310');

  // Fill checkout details & test P1-B DB insert failure -> honest error, zero persisted order
  await setFixture(baseUrl, { failOrderInsert: true });
  await typeIntoInput(page, () => document.querySelector('input[aria-label="שם מלא"]'), 'נועה בר');
  await typeIntoInput(page, () => document.querySelector('input[aria-label="מספר טלפון ישראלי"]'), '0527654321');
  await typeIntoInput(page, () => document.querySelector('input[aria-label="כתובת מלאה למשלוח"]'), 'דיזנגוף 100 תל אביב');
  await clickButtonByText(page, 'שליחת בקשת הזמנה באתר');
  await page.waitForSelector('[role="alert"]', { timeout: 8000 });
  assert.equal((await inspectFixture(baseUrl)).orders.length, 0);

  // Recover DB insert -> confirmed order ₪310 saved
  await setFixture(baseUrl, { failOrderInsert: false });
  await clickButtonByText(page, 'שליחת בקשת הזמנה באתר');
  await waitForText(page, 'בקשת ההזמנה נשמרה!');
  const afterOrder = await inspectFixture(baseUrl);
  assert.equal(afterOrder.orders.length, 1);
  assert.equal(afterOrder.orders[0].total_price, 310);
  assert.equal(afterOrder.orders[0].shipping_cost, 0);
  await page.screenshot({ path: path.join(screenshotDir, 'desktop-jewelry-order-confirmed.png'), fullPage: false });
  await page.keyboard.press('Escape');
  console.log('✓ Desktop Jewelry gallery/wishlist/search/shipping(₪310 free)/DB-failure-recovery verified');

  // -----------------------------------------------------------------------
  // 5. Mobile 390x844 & 360x800: Overflow, Floating Buttons, Cookie Modal Escape & Shipping Sync
  // -----------------------------------------------------------------------
  for (const vp of [
    { width: 390, height: 844, tag: 'mobile-390' },
    { width: 360, height: 800, tag: 'mobile-360' },
  ]) {
    await page.setViewport({ width: vp.width, height: vp.height });

    for (const [route, shotName] of [
      ['/', `${vp.tag}-home.png`],
      ['/#/booking', null],
      ['/#/jewelry', `${vp.tag}-jewelry.png`],
      ['/#/shipping', `${vp.tag}-shipping.png`],
    ]) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle2' });
      await new Promise((r) => setTimeout(r, 250));
      const layoutMetrics = await page.evaluate(() => {
        const overflow = document.documentElement.scrollWidth - window.innerWidth;
        const hasFixedAncestor = (el) => {
          let cur = el;
          while (cur && cur !== document.body) {
            if (cur.tagName === 'NAV') return false;
            const pos = window.getComputedStyle(cur).position;
            if (pos === 'fixed' || pos === 'sticky') return true;
            cur = cur.parentElement;
          }
          return false;
        };
        const fixedBtns = Array.from(document.querySelectorAll('button')).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && hasFixedAncestor(el);
        });
        const collidingPairs = [];
        for (let i = 0; i < fixedBtns.length; i++) {
          for (let j = i + 1; j < fixedBtns.length; j++) {
            const a = fixedBtns[i].getBoundingClientRect();
            const b = fixedBtns[j].getBoundingClientRect();
            const intersects =
              a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
            if (intersects) {
              collidingPairs.push({
                a: fixedBtns[i].getAttribute('aria-label') || fixedBtns[i].textContent?.trim(),
                aRect: { l: Math.round(a.left), r: Math.round(a.right), t: Math.round(a.top), b: Math.round(a.bottom) },
                b: fixedBtns[j].getAttribute('aria-label') || fixedBtns[j].textContent?.trim(),
                bRect: { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom) },
              });
            }
          }
        }
        return { overflow, collidingPairs };
      });
      assert.ok(
        layoutMetrics.overflow <= 1,
        `Horizontal overflow (${layoutMetrics.overflow}px) at ${vp.width}px on ${route}`
      );
      assert.equal(
        layoutMetrics.collidingPairs.length,
        0,
        `Floating fixed/sticky controls overlap at ${vp.width}px on ${route}: ${JSON.stringify(layoutMetrics.collidingPairs)}`
      );
      if (shotName && (vp.tag === 'mobile-390' && shotName.endsWith('-home.png') || vp.tag === 'mobile-360')) {
        await page.screenshot({ path: path.join(screenshotDir, shotName), fullPage: false });
      }
    }

    // Verify synced ShippingPolicy & static date at 360px/390px
    const shipText = await page.evaluate(() => document.body.innerText);
    assert.ok(shipText.includes('₪35'), 'Shipping page must reflect authoritative ₪35');
    assert.ok(shipText.includes('₪250'), 'Shipping page must reflect authoritative ₪250 threshold');
    assert.ok(shipText.includes('14 בנובמבר 2026'), 'Shipping page must have static revision date');

    // Verify footer Cookie Settings modal opens and closes via Escape
    await clickButtonByText(page, 'הגדרות עוגיות');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 5000 });
  }

  assert.equal(pageErrors.length, 0, `Unexpected browser pageerrors: ${pageErrors.join(' | ')}`);
  console.log(`✅ All Puppeteer E2E checks passed across Desktop 1280x800, Mobile 390x844, and Mobile 360x800! Screenshots saved in: ${screenshotDir}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (staging?.child) staging.child.kill();
  if (fs.existsSync(serverBundle)) fs.rmSync(serverBundle, { force: true });
}

// 5-test: sayt rejimi — qorong'i mavzu, bot tugmasi, Telegram orqali kirish, zaxira bilan bir xil ma'lumot, chiqish
const { launch, waitFor } = require('./h');
(async () => { const R = {}; const { browser, page, calls, errs } = await launch();
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('nutqon:sub', JSON.stringify({ required: false, member: true, ts: Date.now() })); location.reload(); }); await page.waitForTimeout(1500);
    R.themeDefault = await page.evaluate(() => document.documentElement.dataset.theme);
    R.bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    R.botBtn = await page.evaluate(() => { const a = document.querySelector('a.tgbtn'); return a && a.href; });
    R.footer = await page.evaluate(() => (document.querySelector('.foot') || {}).innerText);
    R.loginCard = await page.evaluate(() => (document.getElementById('acctbox') || {}).innerText);
    await page.screenshot({ path: __dirname + '/site_dark.png' });
    await page.evaluate(() => { window.open = (u) => { window.__opened = u; return null; }; });
    await page.click('#acctbox [data-act="tglogin"]');
    R.openedBot = await page.evaluate(() => window.__opened);
    R.waitShown = await page.evaluate(() => document.getElementById('acctbox').innerText.includes("Telegram'da tasdiqlang"));
    R.loggedIn = await waitFor(page, () => { const m = me(); return m && m.uid === 'tg6080598376' && !!m.tok; }, 15000);
    R.restored = await waitFor(page, () => tresAll().some(x => x.title === 'Botdagi natija'), 10000);
    R.bkInitIsToken = /^qs1\./.test(calls.bkInit || '');
    R.cardAfter = await page.evaluate(() => document.getElementById('acctbox').innerText.slice(0, 120));
    await page.click('[data-act="theme"]');
    R.themeAfterToggle = await page.evaluate(() => [document.documentElement.dataset.theme, localStorage.getItem('qalam:theme')]);
    await page.screenshot({ path: __dirname + '/site_light.png' });
    await page.click('[data-act="theme"]');
    page.on('dialog', d => d.accept());
    await page.click('[data-act="tglogout"]'); await page.waitForTimeout(500);
    R.afterLogout = await page.evaluate(() => ({ uid: me().uid, card: document.getElementById('acctbox').innerText.slice(0, 40), kept: tresAll().length }));
    R.calls = calls; R.errs = errs;
  } catch (e) { R.fatal = String(e); }
  console.log(JSON.stringify(R, null, 1)); await browser.close(); })();

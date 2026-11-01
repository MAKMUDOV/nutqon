// 6-test: NUTQON majburiy obuna — UI va API himoyasi (server javoblari taqlid qilinadi)
const { launch, waitFor } = require('./h');
(async () => { const R = {};
  // A. Obuna o'chiq (server required:false) — hammasi avvalgidek
  { const { browser, page, errs } = await launch();
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('nutqon:sub', JSON.stringify({ required: false, member: true, ts: Date.now() })); location.reload(); }); await page.waitForTimeout(1500);
    R.off_view = await page.evaluate(() => ({ view: S.view, nav: !!document.getElementById('bnav') && !document.getElementById('bnav').hidden, navItems: [...document.querySelectorAll('#bnav span')].map(x => x.textContent), logo: document.querySelector('.nlogo').textContent, title: document.title }));
    await page.evaluate(() => renderSkill('reading')); await page.waitForTimeout(400);
    R.off_readingOpen = await page.evaluate(() => S.view !== 'gate');
    R.off_errs = errs; await browser.close(); }
  // B. Obuna yoqilgan, brauzer, kirmagan, a'zo emas → qulf; kirish → a'zo emas → ❌; a'zo bo'ldi → ochiladi
  { let member = false;
    const { browser, page, calls, errs } = await launch({ sub: (d) => d.init ? { ok: true, required: true, member, channel: 'https://t.me/nutqon' } : { ok: false, err: 'auth', channel: 'https://t.me/nutqon' }, gate: (d) => member && /^qs1\./.test(d.init || '') });
    await page.evaluate(() => { localStorage.clear(); location.reload(); }); await page.waitForTimeout(1800);
    R.on_firstView = await page.evaluate(() => S.view);
    R.on_landingText = await page.evaluate(() => document.querySelector('.lhero') && document.querySelector('.lhero').innerText.slice(0, 60));
    await page.evaluate(() => { window.open = u => { window.__op = u; return null; }; });
    await page.click('[data-act="lstart"]');
    R.on_loginStarted = await page.evaluate(() => S.view === 'gate' && !!window.__op);
    R.on_afterLogin = await waitFor(page, () => S.view === 'gate' && document.body.innerText.includes("Platformadan foydalanish uchun kanalga a'zo bo'ling"), 15000);
    R.on_gateButtons = await page.evaluate(() => [...document.querySelectorAll('.lock .go')].map(b => b.textContent.trim()));
    // to'g'ridan-to'g'ri bo'limga kirishga urinish
    await page.evaluate(() => { renderSkill('reading'); }); R.on_directBlocked = await page.evaluate(() => S.view === 'gate');
    await page.evaluate(() => { startTest(READING_MOCKS[0].id); }); R.on_startTestBlocked = await page.evaluate(() => S.view === 'gate' && !S.tx);
    await page.click('[data-act="subchk"]');
    R.on_notMemberMsg = await waitFor(page, () => document.body.innerText.includes("Siz hali kanalga a'zo emassiz"), 8000);
    member = true;
    await page.click('[data-act="subchk"]');
    R.on_unlocked = await waitFor(page, () => S.view === '' && !subLocked(), 8000);
    await page.evaluate(() => renderSkill('reading')); await page.waitForTimeout(300);
    R.on_readingOpenAfter = await page.evaluate(() => S.view !== 'gate');
    // kanaldan chiqdi: server keyingi tekshiruvda a'zo emas deydi → API rad → qulf
    member = false;
    await page.evaluate(async () => { try { await tPost({ action: 'bkget' }, 10000); } catch (e) { } });
    R.on_leftChannelLocked = await waitFor(page, () => S.view === 'gate', 5000);
    R.on_initSentToApi = /^qs1\./.test(calls.subInit || '');
    R.on_errs = errs; await browser.close(); }
  console.log(JSON.stringify(R, null, 1));
})();

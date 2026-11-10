// 11-test: admin paneli faqat admin uchun — boshqalarda logotipni 2 marta bosish hech narsa ochmaydi
const { launch } = require('./h');
(async () => { const R = {};
  const { browser, ctx, page, errs } = await launch();
  let admin = false, checks = 0;
  await ctx.route(/script\.google\.com|googleusercontent/, async route => {
    let d = {}; try { d = JSON.parse(route.request().postData() || '{}'); } catch (e) { }
    if (d.action === 'treset') { checks++; R.sentInit = !!d.init; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: false, err: admin ? 'bad' : 'denied' }) }); }
    return route.fallback();
  });
  await page.evaluate(() => { localStorage.setItem('nutqon:sub', JSON.stringify({ required: false, member: true, ts: Date.now() })); localStorage.setItem('qalam:me', JSON.stringify({ uid: 'tg1', name: 'Ali', tok: 'qs1.tg1.9999999999.' + 'a'.repeat(64) })); renderHome(); });
  const dbl = async () => { await page.evaluate(() => { brandTap(); brandTap(); }); await page.waitForTimeout(600); return page.evaluate(() => ({ view: S.view, login: !!document.getElementById('apw') })); };
  R.student = await dbl();
  R.directCall = await page.evaluate(() => { renderAdmin('home'); return { view: S.view, login: !!document.getElementById('apw') }; });
  R.noInit = await page.evaluate(async () => { const m = JSON.parse(localStorage.getItem('qalam:me')); localStorage.setItem('qalam:me', JSON.stringify({ uid: 'w1', name: 'X' })); admChk = 0; brandTap(); brandTap(); await new Promise(r => setTimeout(r, 400)); localStorage.setItem('qalam:me', JSON.stringify(m)); return S.view; });
  admin = true; await page.evaluate(() => { admChk = 0; });
  R.admin = await dbl();
  R.adminRemembered = await page.evaluate(() => { renderHome(); renderAdmin('home'); return !!document.getElementById('apw'); });
  R.checks = checks; R.errs = errs; console.log(JSON.stringify(R)); await browser.close();
})();

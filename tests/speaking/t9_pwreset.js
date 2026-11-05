// 9-test: admin parolini tiklash — faqat admin Telegram akkaunti (server tekshiradi)
const { launch } = require('./h');
(async () => { const R = {};
  const { browser, ctx, page, errs } = await launch();
  const seen = [];
  await ctx.route(/script\.google\.com|googleusercontent/, async route => {
    let d = {}; try { d = JSON.parse(route.request().postData() || '{}'); } catch (e) { }
    if (d.action === 'treset') { seen.push(d); const ok = d.init === 'ADMIN'; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ok ? { ok: true } : { ok: false, err: 'denied' }) }); }
    return route.fallback();
  });
  await page.evaluate(() => { localStorage.setItem('nutqon:sub', JSON.stringify({ required: false, member: true, ts: Date.now() })); renderAdmin('home'); });
  await page.waitForTimeout(400);
  R.loginShown = await page.evaluate(() => !!document.getElementById('apw'));
  await page.click('[data-act="pwforgot"]');
  R.formOpen = await page.evaluate(() => !document.getElementById('pwreset').hidden);
  // a) Telegram yo'q
  await page.evaluate(() => { window.bkInit = () => ''; });
  await page.fill('#rpw1', 'yangi123'); await page.fill('#rpw2', 'yangi123'); await page.click('[data-act="pwreset"]'); await page.waitForTimeout(300);
  R.noTg = await page.evaluate(() => document.getElementById('rpwmsg').textContent);
  // b) admin emas
  await page.evaluate(() => { window.bkInit = () => 'OTHER'; }); await page.click('[data-act="pwreset"]'); await page.waitForTimeout(800);
  R.notAdmin = await page.evaluate(() => document.getElementById('rpwmsg').textContent);
  // c) admin
  await page.evaluate(() => { window.bkInit = () => 'ADMIN'; }); await page.click('[data-act="pwreset"]'); await page.waitForTimeout(1200);
  R.adminOk = await page.evaluate(() => ({ admin: S.admin, view: S.view, tkey: (sessionStorage.getItem('qalam:tkey') || '').length }));
  R.nkeyHex = /^[0-9a-f]{64}$/.test((seen[seen.length - 1] || {}).nkey || '');
  // yangi parol bilan qayta kirish
  R.newPwWorks = await page.evaluate(async () => await pwCheck('yangi123'));
  R.oldDefaultFails = await page.evaluate(async () => !(await pwCheck('xato-parol')));
  R.errs = errs; console.log(JSON.stringify(R)); await browser.close();
})();

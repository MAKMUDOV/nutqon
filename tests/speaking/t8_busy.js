// 8-test: AI band (busy) bo'lsa — ilova o'zi kutib qayta yuboradi; navbat yozuvi ko'rinadi va keyin yo'qoladi
const { launch, waitFor } = require('./h');
(async () => { const R = {};
  const { browser, ctx, page, errs } = await launch();
  let n = 0;
  await ctx.route(/script\.google\.com|googleusercontent/, async route => {
    let d = {}; try { d = JSON.parse(route.request().postData() || '{}'); } catch (e) { }
    if (d.action === 'ai') { n++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(n < 3 ? { ok: false, err: 'busy' } : { ok: true, text: '{"x":1}' }) }); }
    return route.fallback();
  });
  await page.evaluate(() => { window.__waits = []; const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => st(f, ms > 10000 ? 50 : ms, ...a); });
  R.res = await page.evaluate(async () => { const out = { notes: [] }; const orig = aiWaitNote;
    window.aiWaitNote = (k, w) => { out.notes.push(k); orig(k, w); if (k) out.shown = !!document.getElementById('aiqnote'); };
    const j = await srvRetry(async () => { const r = await fetchT(LB.url, { method: 'POST', body: JSON.stringify({ action: 'ai', user: 'x'.repeat(30) }) }, 20000); return r.json(); }, window.aiWaitNote);
    window.aiWaitNote(0); out.final = j; out.goneAfter = !document.getElementById('aiqnote'); return out; });
  R.calls = n; R.errs = errs; console.log(JSON.stringify(R)); await browser.close();
})();

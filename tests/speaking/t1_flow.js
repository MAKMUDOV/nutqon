// 1-test: oldindan tekshiruv (5 s) + 3 savollik imtihon + saqlash + STT + baholash
const { launch, shortExam, waitFor } = require('./h');
(async () => {
  const R = {}; const { browser, page, calls, errs } = await launch();
  try {
    // A. Imtihondan oldingi tekshiruv
    await page.evaluate(() => renderMock());
    await page.click('[data-act="mictest"]');
    R.precheckDone = await waitFor(page, () => S.mchk && S.mchk.done, 30000);
    R.precheck = await page.evaluate(() => Object.fromEntries(Object.entries(S.mchk.st).map(([k, v]) => [k, v.s + (v.m ? ' | ' + v.m : '')])));
    R.precheckReady = await page.evaluate(() => document.body.innerText.includes('Mikrofon tayyor. Imtihonni boshlashingiz mumkin.'));
    R.micBadge = await page.evaluate(() => (document.querySelector('.micbadge') || {}).textContent);
    // B. 3 ta savol (6 s, 6 s, 8 s)
    await shortExam(page, [6, 6, 8]);
    R.recBadgeSeen = await waitFor(page, () => document.body.innerText.includes('Ovoz yozilmoqda'), 15000);
    R.partialAfter1 = await waitFor(page, async () => { if (!S.ex || S.ex.res.length < 1) return false; const a = await HIST.all(); return a.some(x => x.partial && x.res.length >= 1); }, 30000);
    R.done = await waitFor(page, () => S.ex && S.ex.phase === 'done', 60000);
    R.answers = await page.evaluate(() => S.ex.res.map(r => ({ secs: r.secs, size: r.size, ext: r.ext, warn: r.warn })));
    R.evDone = await waitFor(page, () => S.ex && S.ex.ev && S.ex.evState !== 'loading', 30000);
    R.ev = await page.evaluate(() => { const e = S.ex, ev = e.ev || {}; return { v2: ev.v2, score100: ev.score100, score75: ev.score75, level: ev.level, conf: ev.conf, confWhy: ev.confWhy, crit: Object.fromEntries(Object.entries(ev.criteria || {}).map(([k, v]) => [k, v.score])), flu: ev.flu, stt: e.res.map(r => r.stt && r.stt.quality + '/' + r.stt.pron), flus: e.res.map(r => r.flu) }; });
    R.ui = await page.evaluate(() => { const t = document.body.innerText; return ['SPEAKING MOCK NATIJASI', '/ 100', 'Mezonlar bo\'yicha (0–100)', 'Talaffuz', 'Kuchli tomonlari', 'Grammatik xatolar', 'Talaffuzdagi kamchiliklar', "Lug'at boyligini oshirish", 'Javobni yaxshilash', 'Namunaviy javob', 'Ishonchlilik', 'rasmiy CEFR sertifikati natijasi emas', 'Noaniq eshitilgan so\'zlar'].map(x => x + ':' + t.includes(x)); });
    R.finalSaved = await page.evaluate(async () => { const a = await HIST.all(); const x = a.find(z => z.id === S.ex.hid); return x ? { partial: !!x.partial, n: x.res.length, hasEv: !!x.ev } : null; });
    R.calls = calls; R.errs = errs;
    await page.screenshot({ path: __dirname + '/t1_result.png', fullPage: false });
  } catch (e) { R.fatal = String(e); }
  console.log(JSON.stringify(R, null, 1)); await browser.close();
})();

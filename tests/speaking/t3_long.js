// 3-test: ovozsiz yozuv (soxta mikrofon jim) va 2 daqiqalik yozuv
const { launch, shortExam, waitFor } = require('./h');
(async () => {
  const R = {};
  // A. Ovozsiz: oldindan tekshiruv signalni topmaydi, imtihon javobi "past ovoz" deb belgilanadi, STT "silent"
  { const { browser, page, calls, errs } = await launch({ silent: true });
    try {
      await page.evaluate(() => renderMock());
      await page.click('[data-act="mictest"]');
      await waitFor(page, () => S.mchk && S.mchk.done, 30000);
      R.sil_precheck = await page.evaluate(() => ({ sig: S.mchk.st.sig, ok: S.mchk.ok, fix: S.mchk.fix }));
      await shortExam(page, [6]);
      await waitFor(page, () => S.ex && S.ex.phase === 'done', 30000);
      await waitFor(page, () => S.ex.sttState !== 'loading' && S.ex.res[0].stt, 15000);
      R.sil_answer = await page.evaluate(() => ({ warn: S.ex.res[0].warn, stt: S.ex.res[0].stt && S.ex.res[0].stt.quality, sttCallsSent: 0 }));
      R.sil_calls = calls; R.sil_errs = errs;
    } catch (e) { R.sil_fatal = String(e); } await browser.close(); }
  // B. 2 daqiqalik yozuv (C1 qismi kabi 120 s)
  { const { browser, page, calls, errs } = await launch();
    try {
      await shortExam(page, [120]);
      R.long_done = await waitFor(page, () => S.ex && S.ex.phase === 'done', 150000);
      R.long_answer = await page.evaluate(async () => { const r = S.ex.res[0]; const w = await toWav16(r.blob); return { secs: r.secs, kb: Math.round(r.size / 1024), ext: r.ext, warn: r.warn, decodedSec: w && w.dur, pauses: w && w.pauses }; });
      R.long_stt = await waitFor(page, () => S.ex.res[0].stt, 20000);
      R.long_calls = calls; R.long_errs = errs;
    } catch (e) { R.long_fatal = String(e); } await browser.close(); }
  console.log(JSON.stringify(R, null, 1));
})();

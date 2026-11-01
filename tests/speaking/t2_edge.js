// 2-test: sahifa yangilanishi, mikrofon uzilishi, internet uzilishi, ball hisobi (chekka holatlar)
const { launch, shortExam, waitFor } = require('./h');
(async () => {
  const R = {};
  // A. Sahifa tasodifan yangilanishi: 2 javobdan keyin reload → javoblar tiklanadi
  { const { browser, page, errs } = await launch();
    try {
      await shortExam(page, [4, 4, 30]);
      R.reload_2saved = await waitFor(page, () => S.ex && S.ex.res.length >= 2, 40000);
      await page.reload(); await page.waitForTimeout(1200);
      await page.evaluate(() => renderMock());
      R.reload_banner = await waitFor(page, () => document.body.innerText.includes('Tugallanmagan imtihon topildi'), 8000);
      R.reload_bannerText = await page.evaluate(() => { const w = [...document.querySelectorAll('.warn')].find(x => x.innerText.includes('Tugallanmagan')); return w ? w.innerText.slice(0, 160) : null; });
      await page.click('[data-act="sprecover"]');
      R.reload_opened = await waitFor(page, () => S.ex && S.ex.phase === 'done' && S.ex.res.length === 2 && S.ex.res.every(r => r.blob && r.blob.size > 0), 8000);
      R.reload_errs = errs;
    } catch (e) { R.reload_fatal = String(e); } await browser.close(); }

  // B. Mikrofon uzilishi (Bluetooth uzildi) → qayta ulanadi, qismlar birlashtiriladi
  { const { browser, page, errs } = await launch();
    try {
      await shortExam(page, [8]);
      await waitFor(page, () => S.ex && S.ex.phase === 'speak' && S.ex.h, 15000);
      await page.waitForTimeout(2500);
      await page.evaluate(() => { const t = S.exStream.getAudioTracks()[0]; t.stop(); t.dispatchEvent(new Event('ended')); });
      R.disc_warnShown = await waitFor(page, () => { const w = document.getElementById('exmwarn'); return w && !w.hidden && /uzildi|qayta ulandi/.test(w.textContent); }, 5000);
      R.disc_reconnected = await waitFor(page, () => S.ex && S.ex.phase === 'speak' && REC.live(S.exStream) && S.ex.h, 8000);
      R.disc_done = await waitFor(page, () => S.ex && S.ex.res.length === 1, 30000);
      R.disc_answer = await page.evaluate(() => { const r = S.ex.res[0]; return { size: r.size, ext: r.ext, warn: r.warn }; });
      R.disc_dur = await page.evaluate(async () => { const w = await toWav16(S.ex.res[0].blob); return w && w.dur; });
      R.disc_errs = errs;
    } catch (e) { R.disc_fatal = String(e); } await browser.close(); }

  // C. Internet uzilishi: imtihon oxirida offline → xabar; online → STT va baho davom etadi
  { const { browser, ctx, page, calls, errs } = await launch();
    try {
      await shortExam(page, [5]);
      await waitFor(page, () => S.ex && S.ex.phase === 'speak', 15000);
      await ctx.setOffline(true);
      R.off_done = await waitFor(page, () => S.ex && S.ex.phase === 'done', 20000);
      await page.waitForTimeout(800);
      R.off_msg = await page.evaluate(() => S.ex.sttErr);
      R.off_blobKept = await page.evaluate(() => !!(S.ex.res[0].blob && S.ex.res[0].blob.size > 0));
      await ctx.setOffline(false);
      R.off_resumedStt = await waitFor(page, () => S.ex.res[0].stt && S.ex.res[0].text, 15000);
      R.off_evAfter = await waitFor(page, () => S.ex.ev && S.ex.ev.v2, 15000);
      R.off_calls = calls; R.off_errs = errs;
    } catch (e) { R.off_fatal = String(e); } await browser.close(); }

  // D. Ball hisobi: yozma javob (audio yo'q) va past sifatli audio
  { const { browser, page, errs } = await launch();
    try {
      R.calc = await page.evaluate(() => {
        const mk = (crit) => ({ criteria: Object.fromEntries(Object.entries(crit).map(([k, v]) => [k, { score: v, note: '' }])), runs: 2, diff: 0.3 });
        const txt = 'مرحبا اسمي أحمد وأنا أدرس اللغة العربية في الجامعة وأحب القراءة كثيرا جدا';
        // 1) yozma (audio yo'q): talaffuz baholanmaydi, 4 mezon o'rtachasi
        const e1 = { res: [{ q: ['س'], text: txt, secs: 0, limit: 30, part: '1.1', blob: null }] };
        const ev1 = spFinalize(mk({ grammatika: 8, lugat: 6, ravonlik: 7, mazmun: 9 }), e1);
        // 2) 3 javobdan 2 tasi past sifat → qayta yozish, ball yo'q
        const B = new Blob([new Uint8Array(5000)]);
        const e2 = { res: [0, 1, 2].map(i => ({ q: ['س'], text: txt, secs: 10, limit: 30, part: '1.1', blob: B, flu: { dur: 10, pauses: 0 }, stt: { quality: i < 2 ? 'poor' : 'good', pron: i < 2 ? null : 8, unclear: [], notes: [] } })) };
        const ev2 = spFinalize(mk({ grammatika: 8, lugat: 8, ravonlik: 8, mazmun: 8 }), e2);
        // 3) sekin nutq va ko'p pauza → ravonlik pasayadi
        const e3 = { res: [{ q: ['س'], text: txt, secs: 60, limit: 120, part: '2', blob: B, flu: { dur: 60, pauses: 6 }, stt: { quality: 'good', pron: 6, unclear: [], notes: [] } }] };
        const ev3 = spFinalize(mk({ grammatika: 6, lugat: 6, ravonlik: 6, mazmun: 6 }), e3);
        // 4) bo'sh javob (2 ta savoldan 1 tasiga javob) → aiDone yarmi
        const e4 = { res: [{ q: ['س'], text: txt, secs: 10, limit: 30, part: '1.1', blob: B, flu: { dur: 10, pauses: 0 }, stt: { quality: 'good', pron: 8, unclear: [], notes: [] } }, { q: ['س'], text: '', secs: 0, limit: 30, part: '1.1', blob: null }] };
        const ev4 = spFinalize(mk({ grammatika: 8, lugat: 8, ravonlik: 8, mazmun: 8 }), e4);
        const o = ev => ({ s100: ev.score100, s75: aiScore75(ev, {}), lvl: ev.score100 == null ? null : lvl75(aiScore75(ev, {})), conf: ev.conf, re: ev.reRecord, t: ev.criteria.talaffuz.score, r: ev.criteria.ravonlik.score });
        return { typed: o(ev1), poor: o(ev2), slow: o(ev3), half: o(ev4) };
      });
      R.calc_errs = errs;
    } catch (e) { R.calc_fatal = String(e); } await browser.close(); }
  console.log(JSON.stringify(R, null, 1));
})();

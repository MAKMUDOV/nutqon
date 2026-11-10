// 10-test: mukammal tekshiruv — 2 baho farq qilsa 3-baho + mediana, kod qoidalari (ko'chirish/takror/lotin), ishonchlilik, o'qituvchi ko'rib chiqishi va bahoni tuzatish
const { launch, waitFor } = require('./h');
(async () => { const R = {};
  const { browser, ctx, page, errs } = await launch();
  let n = 0, scores = [8, 3, 7]; const sent = { det: [], tgrade: [] };
  await ctx.route(/script\.google\.com|googleusercontent/, async route => {
    let d = {}; try { d = JSON.parse(route.request().postData() || '{}'); } catch (e) { }
    const f = b => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (d.action === 'ai') { const v = scores[n++ % scores.length]; const c = { score: v, note: 'n' + v };
      return f({ ok: true, text: JSON.stringify({ tasks: [{ answer: 1, struktura: c, imlo_grammatika: c, mazmun: c, boglovchilar: c }], mistakes: [{ answer: 1, said: 'خطأ' + (n === 2 ? 'ب' : 'ا'), fix: 'x', why: 'y' }], level_note: 'ok' }) }); }
    if (d.action === 'det') { sent.det.push(d); return f({ ok: true }); }
    if (d.action === 'tgrade') { sent.tgrade.push(d); return f({ ok: true, orig: 40 }); }
    if (d.action === 'tauth') return f({ ok: true });
    if (d.action === 'tlist') return f({ ok: true, rows: [] });
    return route.fallback();
  });
  const PROMPT = 'اكتب رسالة إلى صديقك تخبره فيها عن رحلتك الأخيرة إلى مدينة سمرقند وما رأيته هناك من آثار وأسواق';
  const GOOD = 'عزيزي أحمد، السلام عليكم. أكتب إليك لأخبرك عن رحلتي إلى سمرقند في الأسبوع الماضي. زرت ساحة ريجستان ورأيت المدارس القديمة الجميلة، ثم ذهبت إلى السوق واشتريت بعض الهدايا لعائلتي. كان الطقس معتدلا والناس لطفاء جدا. لذلك أنصحك بزيارتها في الربيع، لأن المدينة تكون أجمل. أيضا جربت الأطعمة المحلية وأعجبتني كثيرا. في انتظار ردك، صديقك يوسف';
  R.a = await page.evaluate(async ({ GOOD, PROMPT }) => { const e = { kind: 'writing', lvl: 'WRITING', sys: AI_WSYS, crit: WCRIT, res: [{ q: [PROMPT], text: GOOD, secs: 600, limit: 1200, part: '1.1', min: 50, weight: 1 }] };
    await aiEvaluate(e, () => { }); const ev = e.ev; return { runs: ev.runs, trials: ev.trials, mazmun: ev.wtasks[0].crit.mazmun.score, conf: ev.conf, review: ev.review, why: ev.reviewWhy, mist: ev.mistakes.map(m => m.said), html: /3 ta mustaqil AI bahosi/.test(evalHTML(ev, e)), err: e.evErr }; }, { GOOD, PROMPT });
  // B. ikki baho yaqin — 3-baho so'ralmaydi
  scores = [7, 7]; n = 0;
  R.b = await page.evaluate(async ({ GOOD, PROMPT }) => { const e = { kind: 'writing', lvl: 'WRITING', sys: AI_WSYS, crit: WCRIT, res: [{ q: [PROMPT], text: GOOD, secs: 600, limit: 1200, part: '1.1', min: 50, weight: 1 }] };
    await aiEvaluate(e, () => { }); return { runs: e.ev.runs, conf: e.ev.conf, rules: e.ev.rules }; }, { GOOD, PROMPT });
  R.bCalls = n;
  // C. kod qoidalari: topshiriqni ko'chirish, takror, lotin
  R.c = await page.evaluate(({ GOOD, PROMPT }) => ({
    copy: txtRules(PROMPT + ' ' + PROMPT.split(' ').slice(0, 4).join(' '), PROMPT),
    rep: txtRules(Array(8).fill('أنا أحب مدينتي كثيرا').join(' '), PROMPT),
    lat: txtRules('Salom men Ahmad, men Samarqandga bordim va juda yoqdi رحلة جميلة', PROMPT),
    clean: txtRules(GOOD, PROMPT) }), { GOOD, PROMPT });
  scores = [9, 9]; n = 0;
  R.cEval = await page.evaluate(async ({ PROMPT }) => { const t = PROMPT + ' ' + PROMPT + ' عزيزي صديقي مع تحياتي'; const e = { kind: 'writing', lvl: 'WRITING', sys: AI_WSYS, crit: WCRIT, res: [{ q: [PROMPT], text: t, secs: 600, limit: 1200, part: '1.1', min: 20, weight: 1 }] };
    await aiEvaluate(e, () => { }); return { mazmun: e.ev.wtasks[0].crit.mazmun.score, note: e.ev.wtasks[0].crit.mazmun.note.slice(0, 80), conf: e.ev.conf, review: e.ev.review }; }, { PROMPT });
  // D. o'qituvchi paneli: ko'rib chiqish ro'yxati va bahoni tuzatish
  R.d = await page.evaluate(async () => { localStorage.setItem('qalam:pw', 'x'); TP.rows = [{ ts: 1762770000000, uid: 'tg5', name: 'Ali', user: '', skill: 'writing', testId: '', title: 'Yozish — Mock 3', score: 40, res: '', mist: '', d: { texts: ['نص'], ai: { conf: "o'rta", review: true, rwhy: ['B1 chegarasiga yaqin (40 / chegara 38)'], runs: 3, trials: [38, 44, 40] } } }];
    TP.err = ''; window.tkey = () => 'k'; S.view = 'admin'; S.adminTab = 'students'; const h = await adminStudentsHTML(); return { banner: /Ko'rib chiqish kerak · 1 ta/.test(h), hidesMock: !/Mock 3/.test(h) }; });
  await page.evaluate(() => { TP.att = 0; document.getElementById('app').innerHTML = tpAttemptHTML(); });
  R.d.card = await page.evaluate(() => !!document.getElementById('tgsc') && /B1 chegarasiga/.test(document.body.innerText));
  await page.fill('#tgsc', '44'); await page.fill('#tgnote', 'Mazmun yaxshi');
  await page.evaluate(() => tpGrade(0));
  await page.waitForTimeout(500);
  R.d.sent = sent.tgrade.map(x => ({ ts: x.ts, uid: x.uid, skill: x.skill, score: x.score, level: x.level, note: x.note }));
  R.d.after = await page.evaluate(() => ({ score: TP.rows[0].score, need: tpNeedRev(TP.rows[0]), g: TP.rows[0].d.tgrade.orig }));
  R.errs = errs; console.log(JSON.stringify(R, null, 1)); await browser.close();
})();

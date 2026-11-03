// 7-test: reyting — qism mashqlari alohida bo'limda, imtihon reytingiga aralashmaydi; mashq natijasi serverga yuboriladi
const { launch, waitFor } = require('./h');
(async () => { const R = {};
  const { browser, ctx, page, errs } = await launch();
  const posts = []; const now = Date.now();
  const rows = [[now - 5e5, 'tg1', 'Ali', '', 'reading', 50], [now - 4e5, 'tg2', 'Vali', '', 'practice', 5], [now - 3e5, 'tg2', 'Vali', '', 'practice', 3],
    [now - 2e5, 'tg3', 'Sora', '', 'practice', 6], [now - 1e5, 'tg1', 'Ali', '', 'listening', 40]];
  await ctx.route(/script\.google\.com|googleusercontent/, async route => {
    let d = {}; try { d = JSON.parse(route.request().postData() || '{}'); } catch (e) { }
    if (d.action === 'rows') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, rows: rows.concat(posts.map(p => [p.ts, p.uid, p.name, '', p.skill, p.score])) }) });
    if (!d.action && d.skill) { posts.push(d); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }); }
    return route.fallback();
  });
  await page.evaluate(() => { localStorage.setItem('qalam:me', JSON.stringify({ uid: 'tg9', name: 'Test O\'quvchi' })); localStorage.setItem('nutqon:sub', JSON.stringify({ required: false, member: true, ts: Date.now() })); });
  // A. Reyting: Barchasi — mashq qatorlari kirmaydi
  await page.evaluate(() => { S.lbPer = 'all'; S.lbSk = 'all'; renderRating(); });
  await waitFor(page, () => document.querySelectorAll('.lbr:not(.hd)').length > 0, 10000);
  R.all = await page.evaluate(() => [...document.querySelectorAll('.lbt')].map(t => [...t.querySelectorAll('.lbr:not(.hd) .nm')].map(x => x.textContent)));
  R.myCardNoExam = await page.evaluate(() => document.querySelector('.lbme').innerText.replace(/\n/g, ' '));
  // Faqat mashq qilgan o'quvchi (Vali) sifatida
  await page.evaluate(() => { localStorage.setItem('qalam:me', JSON.stringify({ uid: 'tg2', name: 'Vali' })); renderRating(); });
  await page.waitForTimeout(800);
  R.valiCard = await page.evaluate(() => document.querySelector('.lbme').innerText.replace(/\n/g, ' '));
  R.valiBanner = await page.evaluate(() => !!document.querySelector('.lbnote'));
  await page.evaluate(() => { localStorage.setItem('qalam:me', JSON.stringify({ uid: 'tg9', name: 'Test O\'quvchi' })); renderRating(); });
  await page.waitForTimeout(800);
  // B. Qism mashqlari — jami to'g'ri javoblar bo'yicha
  await page.selectOption('#lbsk', 'practice'); await page.waitForTimeout(300);
  R.practice = await page.evaluate(() => [...document.querySelectorAll('.lbr:not(.hd)')].map(x => x.querySelector('.nm').textContent + ' = ' + x.querySelector('.lbsc b').textContent + ' (' + x.querySelector('.lbsc small').textContent + ')'));
  R.practiceHead = await page.evaluate(() => document.querySelector('.lbr.hd .lbsc').textContent);
  // C. Qism mashqini topshirish → serverga practice sifatida yuboriladi
  const pid = await page.evaluate(() => { const t = READING_MOCKS[0]; return t.id; });
  await page.evaluate(() => { const t = partTest(READING_MOCKS[0], 0); S.tx = { test: t, skill: t.skill, ans: {}, t0: Date.now() - 60000, done: false }; });
  const hasPart = await page.evaluate(() => typeof partTest === 'function');
  R.hasPartFn = hasPart;
  if (hasPart) {
    await page.evaluate(() => { try { submitTest(true); } catch (e) { window.__e = String(e); } });
    await waitFor(page, () => !JSON.parse(localStorage.getItem('qalam:lbq') || '[]').length, 8000);
    R.sent = posts.map(p => ({ skill: p.skill, score: p.score, level: p.level, title: p.title }));
    R.submitErr = await page.evaluate(() => window.__e || null);
  }
  R.errs = errs; console.log(JSON.stringify(R, null, 1)); await browser.close();
})();

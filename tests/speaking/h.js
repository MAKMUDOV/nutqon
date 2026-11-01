// Qalam speaking — test yordamchilari (Playwright + soxta mikrofon)
const { chromium } = require('playwright');
const path = require('path');
const URL_ = 'http://localhost:8765/index.html';
const STT_TEXT = 'مرحبا اسمي أحمد وأنا أدرس اللغة العربية في الجامعة وأحب القراءة كثيرا';
const AI_JSON = {
  insufficient: false, level_note: "Oddiy, lekin bog'langan javoblar.",
  criteria: { grammatika: { score: 7, note: "" }, lugat: { score: 6, note: "" }, ravonlik: { score: 6, note: "" }, mazmun: { score: 8, note: "" } },
  strengths: ["Savolga to'g'ridan-to'g'ri javob berdi"], weak: ["Lug'at oddiy"],
  mistakes: [{ answer: 1, said: "أنا يحب", fix: "أنا أحبّ", why: "Fe'l shaxsga moslashadi" }],
  vocab_tips: ["هواية — qiziqish"], improve: ["Har javobga sabab va misol qo'shing"],
  per_answer: [1, 2, 3].map(i => ({ answer: i, comment: "Yaxshi", model_answer: "اسمي أحمد، وأدرس اللغة العربية لأنها لغة جميلة." })), advice: ["Ko'proq gapiring"]
};
async function launch(opts = {}) {
  const wav = path.join(__dirname, opts.silent ? 'silence.wav' : 'speech.wav');
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + wav, '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ permissions: ['microphone'] });
  const calls = { stt: 0, ai: 0, ping: 0, sttDetail: 0 };
  await ctx.route(/script\.google\.com|googleusercontent/, async route => {
    const req = route.request(); let d = {};
    try { d = JSON.parse(req.postData() || '{}'); } catch (e) { }
    let body = { rows: [] };
    if (d.action === 'ping') { calls.ping++; body = { ok: true, t: Date.now() }; }
    else if (d.action === 'stt') { calls.stt++; if (d.detail) calls.sttDetail++; body = opts.sttBody ? opts.sttBody(d, calls) : { ok: true, text: STT_TEXT, model: 'mock', q: { quality: 'good', note: '', intel: 8, pron: 7, notes: ["«أحبّ» so'zida ح tovushi ه kabi aytildi"], good: ["Unlilar aniq"], unclear: ["كثيرا"] } }; }
    else if (d.action === 'ai') { calls.ai++; body = { ok: true, text: JSON.stringify(AI_JSON), model: 'mock' }; }
    else if (d.action === 'lpoll') { calls.lpoll = (calls.lpoll || 0) + 1; body = calls.lpoll < 2 ? { ok: true, wait: true } : { ok: true, uid: 'tg6080598376', name: 'Ilyosbek', username: 'x', token: 'qs1.tg6080598376.9999999999.' + 'a'.repeat(64) }; }
    else if (d.action === 'bkget') { calls.bkget = (calls.bkget || 0) + 1; calls.bkInit = d.init; body = { ok: true, data: JSON.stringify({ 'qalam:tres': [{ id: 1, ts: Date.now() - 1e6, skill: 'reading', title: 'Botdagi natija', score: 50 }] }) }; }
    else if (d.action === 'bkset') { calls.bkset = (calls.bkset || 0) + 1; body = { ok: true }; }
    else if (d.action) body = { ok: true };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await ctx.route(/fonts\.|telegram\.org|api\.anthropic/, r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(URL_);
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.speakAr = (t, cb) => setTimeout(() => cb(true), 30); window.tgHaptic = () => { }; });
  return { browser, ctx, page, calls, errs };
}
// Qisqa imtihon: n ta savol, har biri sp soniya
async function shortExam(page, sps) {
  await page.evaluate((sps) => {
    window.buildMock = () => sps.map((sp, i) => ({ part: i < 2 ? "1.1" : "2", k: i + 1, m: sps.length, t: ["ما اسمك؟ تحدث عن نفسك."], topic: 1, prep: 0, sp }));
    renderMock();
  }, sps);
  await page.click('[data-act="exstart"]');
}
async function waitFor(page, fn, ms = 60000, arg) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await page.waitForTimeout(300); }
  return false;
}
module.exports = { launch, shortExam, waitFor, STT_TEXT };

# NUTQON — CEFR Writing Checker

Arab tilida yozilgan **xat (الرسالة)** va **insho (الإنشاء)** ni CEFR yozma qismi mezonlari bo'yicha Claude AI yordamida tekshiradigan mustaqil veb-platforma.

- Xat: 5 mezon × 5 ball = **25**. Insho: 5 mezon × 10 ball = **50**. Jami: **75**.
- Mezonlar: Struktura va tuzilma · Imlo va grammatika · Ma'no va mazmun · So'zlar soni · Bog'lovchilar.
- Baholash **taxminiy AI baholash**, rasmiy CEFR natijasi emas.

## Vercel'ga joylash

1. Vercel'da loyihani import qiling (Next.js avtomatik aniqlanadi).
2. **Storage → Create Database → Neon** (bepul) → loyihaga ulang, prefiks `DATABASE` (natijada `DATABASE_URL`).
3. **Settings → Environment Variables** ga faqat `ANTHROPIC_API_KEY` ni qo'shing.
4. **Redeploy**. Jadvallar build vaqtida avtomatik yaratiladi.
5. Saytda **birinchi ro'yxatdan o'tgan hisob — o'qituvchi**. Shuning uchun deploydan keyin darhol o'zingiz ro'yxatdan o'ting, keyin havolani o'quvchilarga bering.

## AI provayderi: Gemini yoki Claude

- **Gemini** (bepul darajasi bor): aistudio.google.com/apikey dan kalit olib, `GEMINI_API_KEY` ga qo'ying. Model: `GEMINI_MODEL` (standart `gemini-3.8-flash`).
- **Claude**: `ANTHROPIC_API_KEY`. Model: `ANTHROPIC_MODEL`.
- `GEMINI_API_KEY` bo'lsa, avtomatik Gemini ishlatiladi. Majburan tanlash: `AI_PROVIDER=gemini` yoki `AI_PROVIDER=claude`.
- Qaysi model baholagani har bir natijada saqlanadi.

## AI API kaliti qayerga kiritiladi?

Faqat muhit o'zgaruvchisi `ANTHROPIC_API_KEY` ga (Vercel → Settings → Environment Variables, yoki lokal `.env` fayli). Kalit **faqat serverda** (`lib/claude.ts`) ishlatiladi va brauzerga hech qachon yuborilmaydi. `.env` fayli `.gitignore` da.

Model `ANTHROPIC_MODEL` orqali tanlanadi (standart: `claude-sonnet-5-5`). Aniqroq, lekin qimmatroq: `claude-opus-5-5`; arzonroq: `claude-haiku-5-5`.

## Kompyuterda ishga tushirish (ixtiyoriy)

```bash
npm install
cp .env.example .env     # qiymatlarni to'ldiring (PostgreSQL ulanishi kerak, masalan Neon'dan)
npm run db:push
npm run dev              # http://localhost:3000
```

## Sozlamalar

| O'zgaruvchi | Ma'nosi |
|---|---|
| `DATABASE_URL` | PostgreSQL ulanishi (Vercel + Neon'da avtomatik) |
| `SESSION_SECRET` | Ixtiyoriy; berilmasa `DATABASE_URL` dan hosil qilinadi |
| `TEACHER_LOGIN`, `TEACHER_PASSWORD`, `TEACHER_NAME` | Ixtiyoriy; birinchi kirishda yaratiladigan o'qituvchi hisobi |
| `ALLOW_REGISTRATION` | `false` bo'lsa, o'quvchilar o'zi ro'yxatdan o'ta olmaydi — hisobni o'qituvchi panelda yaratadi |
| `CHECKS_PER_HOUR` | Bir o'quvchiga soatiga nechta tekshiruv (standart 10) — API xarajatini nazorat qiladi |

## Qanday ishlaydi

1. O'quvchi matnni kiritadi → `POST /api/check`.
2. Server matnni tekshiradi (bo'sh, arabcha emas, 10 so'zdan kam yoki 1000 dan ko'p bo'lsa — rad etadi) va so'zlarni **deterministik** sanaydi (`lib/scoring.ts`: harakatlar, tatvil va tinish belgilari so'z emas; yopishgan و/ف/ب/ل/ك prefikslari so'z ichida qoladi).
3. Claude API'ga qat'iy tizim prompti (`lib/prompt.ts`) va `submit_assessment` tool sxemasi bilan so'rov yuboriladi (`temperature: 0`). O'quvchi matni faqat `<student_text>` ichida, ma'lumot sifatida beriladi — undagi buyruqlar baholash qoidalarini o'zgartira olmaydi.
4. Javob **zod** bilan tekshiriladi (`lib/validate.ts`): ballar 0…maksimum oralig'iga cheklanadi va 0,5 ga yaxlitlanadi; matnda topilmagan "xatolar" olib tashlanadi.
5. **So'zlar soni bali** dasturda hisoblanadi (standart: ±10% — to'liq, 10–20% — 80%, 20–30% — 60%, 30–40% — 40%, 40–50% — 20%, undan ko'p — 0; o'qituvchi sozlamalarda o'zgartiradi, qo'llangan qoida har bir natijada saqlanadi). **Umumiy ball** — serverda mezonlar yig'indisi.
6. AI ishlamasa yoki noto'g'ri javob qaytarsa — tushunarli xato chiqadi, soxta natija saqlanmaydi.

## Imkoniyatlar

- Uch rejim: xat, insho, to'liq Writing (alohida baholanadi, jami /75 va foiz).
- **Daftar rasmidan o'qish (OCR):** 1–4 sahifa rasmini yuklang — AI arabcha qo'lyozmani xatolari bilan, tuzatmasdan ko'chiradi. Rasm brauzerda kichraytiriladi; limit `OCR_PER_HOUR` (standart 20).
- **Parollar:** o'qituvchi panelida o'quvchi parolini tiklash; har kim "Hisobim" sahifasida o'z parolini o'zgartiradi.
- Jonli so'z hisoblagich ("142 / 150 so'z · Yana 8 ta so'z kerak") va vaqt hisoblagich; qoralama brauzerda saqlanadi.
- Natijalar: ball halqasi, har bir mezon bo'yicha asos, kuchli/zaif tomonlar va tavsiya.
- Xatolar matnda rang bilan: qizil — grammatika/imlo, sariq — uslub, ko'k — so'z tanlovi. Bosilganda xato, to'g'ri variant va o'zbekcha izoh.
- Tuzatilgan matn: "faqat xatolar tuzatilgan" va "ravonroq namunaviy" variant, asl matn bilan yonma-yon.
- PDF hisobot: `/report/<id>` sahifasi → "PDF sifatida saqlash" (brauzerning chop etish oynasi; arabcha RTL buzilmaydi).
- O'qituvchi paneli: o'quvchilar ro'yxati, barcha ishlar, o'quvchi natijalari grafigi, eng ko'p uchraydigan xatolar, mezonlar bo'yicha o'rtacha, o'quvchi hisobini yaratish, so'z chegaralari sozlamasi.
- O'qituvchi AI bahosini o'zgartira oladi: AI bahosi va o'qituvchi bahosi **alohida** saqlanadi.
- Xavfsizlik: scrypt parol xeshi, HMAC-imzolangan HttpOnly sessiya cookie, faqat JSON POST (CSRF himoyasi), login va tekshiruv limitlari, o'quvchi faqat o'z ishlarini ko'radi.

## Sinovlar

```bash
npm test
```

55 ta server sinovi: so'z hisoblagich, ball chegaralari, auth, spetsifikatsiyadagi 12 holat (soxta AI bilan), Claude API mijozi (soxta fetch bilan), ruxsatlar, o'qituvchi bahosi, sozlamalar, limitlar.

## Tuzilma

```
app/                 sahifalar (Next.js App Router) va API marshrutlari (app/api/**/route.ts)
components/          CheckForm, ResultView, Lists, AuthForm, Header
lib/scoring.ts       so'z sanash, ball, yig'indi (deterministik)
lib/prompt.ts        tizim prompti va tool sxemasi
lib/claude.ts        Claude API mijozi (faqat server)
lib/validate.ts      AI javobini zod bilan tekshirish
lib/handlers.ts      barcha API mantig'i (Request → Response, sinovdan o'tadi)
lib/repo*.ts         ma'lumotlar bazasi (Prisma; sinovlar uchun xotira)
prisma/schema.prisma ma'lumotlar bazasi sxemasi
scripts/             o'qituvchi yaratish, sinovlarni ishga tushirish
tests/               server sinovlari
```

## Eslatmalar

- Limitlar (rate limit) server xotirasida saqlanadi. Vercel'da bir nechta funksiya nusxasi ishlashi mumkin, shuning uchun limit taxminiy. Qat'iy limit kerak bo'lsa, Upstash Redis'ga o'tkazish mumkin.
- To'liq Writing tekshiruvi 1–2 daqiqa davom etadi; `app/api/check/route.ts` da `maxDuration = 300` belgilangan.

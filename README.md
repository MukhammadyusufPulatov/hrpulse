# HR PULSE

HR jarayonlarini nazorat qilish uchun CRM (SaaS). Super admin platformani mijozlarga sotadi, har bir mijoz o'z admin profilida HR jarayonlarini boshqaradi.

## Ishga tushirish

**Eng oson yo'l:** `HR-PULSE.html` faylini ikki marta bosib brauzerda oching (internet shart emas).

`index.html` — bu manba fayl, uni to'g'ridan-to'g'ri ochib bo'lmaydi. Kod o'zgargandan keyin `npm run build` buyrug'i `HR-PULSE.html`ni qaytadan yaratadi.

Dasturlash rejimi:

```bash
npm install
npm run dev
```

Brauzerda: http://localhost:5180

## Kirish ma'lumotlari

| Rol | Telefon | Parol |
| --- | --- | --- |
| Super admin | 93 087 12 05 | 1422dev |
| Demo mijoz (admin) | 90 123 45 67 | demo123 |
| Demo HR menejer | 99 111 22 33 | hr123 |

- Super admin kirish sahifasi: `HR-PULSE.html#/login` (qora uslub)
- Mijozning kirish sahifasi (subdomain): `demo.hrpulse.uz`, lokal: `HR-PULSE.html#/c/demo` — mijoz rangida, faqat shu kompaniya admini va HR menejerlari kira oladi
- Kompaniyaning vakansiyalar sahifasi: `#/c/demo/jobs`

**Filiallar:** super admin bir xil telefon raqamga bir nechta profil ochsa, ular bitta mijozning filiallari bo'ladi (parol umumiy). Admin yuqoridagi dropdown orqali filiallar orasida o'tadi; har bir filialning bo'limlari, vakansiyalari, nomzodlari va xodimlari alohida.

**Tillar:** o'zbek, rus, ingliz — yuqoridagi UZ / RU / EN tugmalari. Tarjimalar `src/lib/dict.ts` faylida (kalit — o'zbekcha matn).

## Bo'limlar

**Super admin**
- Dashboard — aktiv obunalar, yaqinda tugaydiganlar (7 kun), LTV (o'rtacha muddat va o'rtacha daromad), oylik tushum
- Mijozlar — ro'yxat (sidebar'da ham ochiladi), mijoz ustiga bosilsa uning dashboardi
- Obunalar — mijozlar jadvali, subdomain sayti, tarif, parol o'rnatish, uzaytirish, bloklash, mijoz qo'shish
- Sozlamalar — parol va telefon raqamni o'zgartirish, tariflar (nomi, narxi, muddati)

**Mijoz admini** (primary rangi mijozniki bo'ladi)
- Dashboard, Rekruiting (kanban, drag & drop), Onboarding, Xodimlar, Statistika,
  Tug'ilgan kunlar, Hujjatlar, Vakansiyalar (anketa savollari, kanal bo'yicha link), Sozlamalar
  (manbalar, vakansiya bo'limlari, HR menejerlar, landing havolasi)

**Ommaviy sahifalar**
- `/c/<subdomain>` — kompaniyaning vakansiyalar sahifasi
- `/apply/<subdomain>/<vakansiya>/<kanal>` — ariza formasi, nomzod avtomatik Rekruiting'ga tushadi

## Ma'lumotlar

Hozircha barcha ma'lumotlar brauzerning `localStorage`'ida saqlanadi (`src/lib/db.ts`).
Real ishlatish uchun backend (masalan Supabase yoki Firebase) ulash kerak — sahifalar faqat
`getDb / updateDb / useDb` orqali ishlaydi, shuning uchun faqat shu fayl almashtiriladi.
Subdomainlar (`*.hrpulse.uz`) ham domen va hosting sozlangandan keyin ishlaydi; hozir ular `/c/<subdomain>` manziliga yo'naltiriladi.

Demo ma'lumotlarni qaytadan tiklash: brauzer konsolida `localStorage.clear()` va sahifani yangilang.

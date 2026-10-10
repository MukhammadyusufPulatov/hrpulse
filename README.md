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

Login sahifasi bitta: tizim telefon raqam bo'yicha rolni o'zi aniqlaydi.

## Bo'limlar

**Super admin**
- Dashboard — aktiv obunalar, yaqinda tugaydiganlar (7 kun), LTV (o'rtacha muddat va o'rtacha daromad), oylik tushum
- Mijozlar — ro'yxat (sidebar'da ham ochiladi), mijoz ustiga bosilsa uning dashboardi
- Obunalar — mijozlar jadvali, subdomain sayti, tarif, parol o'rnatish, uzaytirish, bloklash, mijoz qo'shish
- Sozlamalar — parol va telefon raqamni o'zgartirish, tariflar (nomi, narxi, muddati)

**Mijoz admini** (primary rangi mijozniki bo'ladi)
- Dashboard, Rekruiting (kanban, drag & drop), Onboarding, Xodimlar, Hisobotlar, Tasklar,
  Tug'ilgan kunlar, Hujjatlar, Vakansiyalar (anketa savollari, kanal bo'yicha link), Sozlamalar
  (filiallar, kanallar, bo'limlar, HR menejerlar, landing havolalari)

**Ommaviy sahifalar**
- `/c/<subdomain>` — kompaniyaning vakansiyalar sahifasi
- `/apply/<subdomain>/<vakansiya>/<kanal>` — ariza formasi, nomzod avtomatik Rekruiting'ga tushadi

## Ma'lumotlar

Hozircha barcha ma'lumotlar brauzerning `localStorage`'ida saqlanadi (`src/lib/db.ts`).
Real ishlatish uchun backend (masalan Supabase yoki Firebase) ulash kerak — sahifalar faqat
`getDb / updateDb / useDb` orqali ishlaydi, shuning uchun faqat shu fayl almashtiriladi.
Subdomainlar (`*.hrpulse.uz`) ham domen va hosting sozlangandan keyin ishlaydi; hozir ular `/c/<subdomain>` manziliga yo'naltiriladi.

Demo ma'lumotlarni qaytadan tiklash: brauzer konsolida `localStorage.clear()` va sahifani yangilang.

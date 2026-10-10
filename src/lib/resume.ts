import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { Candidate, Client, Tenant } from './types'
import { displayPhone, fmtDate } from './utils'
import { t as tr } from './i18n'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Nomzod ma'lumotlarini rezyume ko'rinishidagi PDF qilib yuklab beradi */
export async function downloadResume(c: Candidate, t: Tenant, client: Client) {
  const vac = t.vacancies.find((v) => v.id === c.vacancyId)
  const channel = t.channels.find((x) => x.id === c.channelId)?.name
  const stageName = [...t.stages, ...t.onboardingSteps].find((s) => s.id === c.stageId)?.name
  const stage = stageName && tr(stageName)
  const brand = client.primaryColor
  const row = (k: string, v?: string) => (v ? `<tr><td style="padding:6px 0;color:#64748b;width:38%">${esc(k)}</td><td style="padding:6px 0;font-weight:600">${esc(v)}</td></tr>` : '')
  const answers = c.answers
    .map((a) => {
      let val = esc(a.value || '—')
      if (a.type === 'photo' && a.value) val = `<img src="${a.value}" style="max-height:140px;border-radius:10px"/>`
      else if (a.type === 'file') val = esc(a.fileName || tr('Fayl biriktirilgan'))
      return `<div style="margin-bottom:12px"><div style="font-size:12px;color:#64748b">${esc(a.question)}</div><div style="margin-top:3px;white-space:pre-wrap">${val}</div></div>`
    })
    .join('')
  const comments = c.comments
    .map((m) => `<div style="margin-bottom:10px;padding:10px 12px;background:#f8fafc;border-radius:10px"><div style="font-size:11px;color:#94a3b8">${esc(m.author)} · ${fmtDate(m.at)}</div><div style="margin-top:3px">${esc(m.text)}</div></div>`)
    .join('')
  const photo = c.photo
    ? `<img src="${c.photo}" style="width:96px;height:96px;border-radius:20px;object-fit:cover"/>`
    : `<div style="width:96px;height:96px;border-radius:20px;background:${brand}22;color:${brand};display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800">${esc(c.name.slice(0, 1))}</div>`

  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fff;color:#0f172a;font-family:Inter,Segoe UI,sans-serif;font-size:14px;line-height:1.5'
  el.innerHTML = `
    <div style="height:10px;background:${brand}"></div>
    <div style="padding:40px 48px">
      <div style="display:flex;gap:24px;align-items:center">
        ${photo}
        <div>
          <div style="font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:${brand};font-weight:700">${tr('Nomzod anketasi')}</div>
          <div style="font-size:28px;font-weight:800;margin-top:4px">${esc(c.name)}</div>
          <div style="color:#475569">${esc(vac?.title ?? tr("Vakansiya ko'rsatilmagan"))}</div>
        </div>
      </div>
      <div style="margin-top:28px;font-weight:700;font-size:15px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">${tr("Aloqa va ma'lumotlar")}</div>
      <table style="width:100%;border-collapse:collapse;margin-top:6px">
        ${row(tr('Telefon'), displayPhone(c.phone))}${row('Email', c.email)}
        ${row(tr('Manba'), channel)}${row(tr('Etap'), stage)}${row(tr('Ariza sanasi'), fmtDate(c.createdAt))}
        ${c.extra.map((x) => row(x.label, x.value)).join('')}
      </table>
      ${answers ? `<div style="margin-top:24px;font-weight:700;font-size:15px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:12px">${tr('Anketa javoblari')}</div>${answers}` : ''}
      ${comments ? `<div style="margin-top:24px;font-weight:700;font-size:15px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:12px">${tr('Izohlar')}</div>${comments}` : ''}
      <div style="margin-top:36px;font-size:11px;color:#94a3b8">${esc(tr('Ushbu hujjat {0} HR tizimi (HR PULSE) orqali avtomatik yaratildi', { 0: client.companyName }))} · ${fmtDate(new Date().toISOString())}</div>
    </div>`
  document.body.appendChild(el)
  try {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' })
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
    const pw = pdf.internal.pageSize.getWidth()
    const ph = pdf.internal.pageSize.getHeight()
    const imgH = (canvas.height * pw) / canvas.width
    const img = canvas.toDataURL('image/jpeg', 0.92)
    let y = 0
    while (y < imgH) {
      if (y > 0) pdf.addPage()
      pdf.addImage(img, 'JPEG', 0, -y, pw, imgH)
      y += ph
    }
    pdf.save(`${c.name.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'nomzod'} - ${tr('rezyume')}.pdf`)
  } finally {
    el.remove()
  }
}

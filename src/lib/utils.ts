import { t } from './i18n'

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const DAY = 86_400_000

export function normalizePhone(s: string) {
  let d = s.replace(/\D/g, '')
  if (d.startsWith('998') && d.length > 9) d = d.slice(3)
  return d.slice(0, 9)
}

export function formatPhone(s: string) {
  const d = normalizePhone(s)
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ')
}

export const displayPhone = (s: string) => (s ? '+998 ' + formatPhone(s) : '—')

export function money(n: number) {
  return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ' + t("so'm")
}

export function shortMoney(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + ' ' + t('mlrd')
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' ' + t('mln')
  if (n >= 1e3) return Math.round(n / 1e3) + ' ' + t('ming')
  return String(n)
}

export function fmtDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(+d)) return '—'
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

export function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function timeAgo(iso: string) {
  const s = (Date.now() - +new Date(iso)) / 1000
  if (s < 60) return t('hozirgina')
  if (s < 3600) return t('{0} daqiqa oldin', { 0: Math.floor(s / 60) })
  if (s < 86400) return t('{0} soat oldin', { 0: Math.floor(s / 3600) })
  if (s < 86400 * 30) return t('{0} kun oldin', { 0: Math.floor(s / 86400) })
  return fmtDate(iso)
}

export const todayISO = () => new Date().toISOString().slice(0, 10)

export function addDays(iso: string | Date, days: number) {
  return new Date(+new Date(iso) + days * DAY).toISOString()
}

export function durationLabel(days: number) {
  if (days % 365 === 0) return t('{0} yil', { 0: days / 365 })
  if (days % 30 === 0) return t('{0} oy', { 0: days / 30 })
  return t('{0} kun', { 0: days })
}

export const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

/** CSV fayl (Excel'da ochiladi) yuklab olish */
export function downloadCSV(filename: string, rows: (string | number | undefined)[][]) {
  const esc = (v: string | number | undefined) => {
    const s = v === undefined || v === null ? '' : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** Faylni data URL'ga o'giradi. Rasmlar kichraytiriladi (localStorage hajmi uchun). */
export function fileToDataUrl(file: File, maxImage = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const url = reader.result as string
      if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return resolve(url)
      const img = new Image()
      img.onload = () => {
        const k = Math.min(1, maxImage / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * k)
        c.height = Math.round(img.height * k)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = () => resolve(url)
      img.src = url
    }
    reader.readAsDataURL(file)
  })
}

/** Ilova ichidagi sahifaning to'liq manzili (fayl sifatida ochilganda ham ishlaydi) */
export const appUrl = (path: string) => window.location.href.split('#')[0] + '#' + path

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

export const COLORS = ['#4f46e5', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#eab308', '#14b8a6', '#64748b']

export const LANGUAGES = ["O'zbek", 'Rus', 'Ingliz', 'Turk', 'Koreys', 'Arab', 'Nemis', 'Xitoy', 'Fransuz']

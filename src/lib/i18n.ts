import { useSyncExternalStore } from 'react'
import { DICT } from './dict'

/*
 * Uch tilli interfeys: o'zbek (asosiy), rus, ingliz.
 * Kalit sifatida o'zbekcha matnning o'zi ishlatiladi: t("Xodimlar") → "Сотрудники" / "Employees".
 * Tarjima topilmasa o'zbekcha matn ko'rsatiladi.
 */

export type Lang = 'uz' | 'ru' | 'en'
export const LANGS: { value: Lang; label: string }[] = [
  { value: 'uz', label: "O'zbek" },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
]

const KEY = 'hrpulse_lang'
let lang: Lang = (() => {
  const l = localStorage.getItem(KEY)
  return l === 'ru' || l === 'en' ? l : 'uz'
})()
document.documentElement.lang = lang
const listeners = new Set<() => void>()

export const getLang = () => lang

export function setLang(l: Lang) {
  lang = l
  localStorage.setItem(KEY, l)
  document.documentElement.lang = l
  listeners.forEach((f) => f())
}

export const useLang = () =>
  useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => listeners.delete(f)
    },
    () => lang,
  )

export function t(key: string, vars?: Record<string, string | number>) {
  let s = lang === 'uz' ? key : DICT[lang][key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}

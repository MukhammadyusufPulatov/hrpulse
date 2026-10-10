import { useEffect } from 'react'

export const SUPER_BRAND = '#111111'

/** Mijozning primary rangini butun ilovaga qo'llaydi */
export function useBrand(color: string) {
  useEffect(() => {
    document.documentElement.style.setProperty('--brand', color)
  }, [color])
}

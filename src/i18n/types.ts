import type { Face } from '../types'

export interface TutorialSectionDict {
  anchor: string
  tab: string
  title: string
  body: string
}

export interface Dict {
  paint: {
    title: string
    hint: string
    reset: string
    export: string
    copied: string
    startSolve: string
    tutorialAria: string
    unsolvable: string
  }
  solve: {
    back: string
    preparing: string
    nextMove: string
    prevMove: string
    done: string
    play: string
    pause: string
    next: string
    finish: string
    speed: string // template with {s}, e.g. "速度: {s}秒/步"
    stages: string[] // 7 stage names, same order as solver STAGES
    notes: string[] // 7 stage notes, same order as solver STAGES
  }
  tutorial: {
    back: string
    title: string
    sections: TutorialSectionDict[]
  }
  update: {
    newVersion: string
    updateNow: string
  }
}

export type Locale = 'zh' | 'en' | 'fr' | 'es' | 'ru' | 'ar'

export interface LocaleMeta {
  locale: Locale
  flag: string
  name: string
  rtl?: boolean
}

export const LOCALES: LocaleMeta[] = [
  { locale: 'zh', flag: '🇨🇳', name: '中文' },
  { locale: 'en', flag: '🇬🇧', name: 'English' },
  { locale: 'fr', flag: '🇫🇷', name: 'Français' },
  { locale: 'es', flag: '🇪🇸', name: 'Español' },
  { locale: 'ru', flag: '🇷🇺', name: 'Русский' },
  { locale: 'ar', flag: '🇸🇦', name: 'العربية', rtl: true },
]

export type { Face }

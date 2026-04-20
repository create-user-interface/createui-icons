import en from './en';
import ru from './ru';
import type { Dictionary, Lang } from './types';

export type { Dictionary, Lang };

export const SITE = 'https://icons.createui.dev';

export const dictionaries = { en, ru } as const;

export const DEFAULT_LANG: Lang = 'ru';

export const ALL_LANGS: Lang[] = ['ru', 'en'];

export function useT(lang: Lang): Dictionary {
  return dictionaries[lang];
}

export function otherLang(lang: Lang): Lang {
  return lang === 'ru' ? 'en' : 'ru';
}

export function pathFor(lang: Lang): string {
  return lang === 'ru' ? '/' : '/en/';
}

export function formatTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\$\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

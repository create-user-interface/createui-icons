import { dictionaries, formatTemplate, otherLang, pathFor, SITE } from '../i18n';
import type { Dictionary, Lang } from '../i18n/types';
import { nbsp } from '../utils/nbsp';

let currentLang: Lang = 'ru';

function resolvePath(dict: Dictionary, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) return acc[Number(key)];
    return (acc as Record<string, unknown>)[key];
  }, dict);
}

function applyText(el: HTMLElement, dict: Dictionary): void {
  const path = el.dataset.i18n;
  if (!path) return;
  const raw = resolvePath(dict, path);
  if (typeof raw !== 'string') return;
  const fmtAttr = el.dataset.i18nFmt;
  let value = raw;
  if (fmtAttr) {
    try {
      const vars = JSON.parse(fmtAttr) as Record<string, string | number>;
      value = formatTemplate(raw, vars);
    } catch {
      // ignore
    }
  }
  el.textContent = nbsp(value);
}

function applyAttrs(el: HTMLElement, dict: Dictionary): void {
  const spec = el.dataset.i18nAttr;
  if (!spec) return;
  for (const pair of spec.split(',')) {
    const [attrName, path] = pair.split(':').map((s) => s.trim());
    if (!attrName || !path) continue;
    const raw = resolvePath(dict, path);
    if (typeof raw === 'string') {
      el.setAttribute(attrName, raw);
    }
  }
}

function applyBilingual(el: HTMLElement, lang: Lang): void {
  const ru = el.dataset.i18nTextRu;
  const en = el.dataset.i18nTextEn;
  const value = lang === 'ru' ? ru : en;
  if (typeof value === 'string') {
    el.textContent = nbsp(value);
  }
}

function applyAll(lang: Lang): void {
  const dict = dictionaries[lang];

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => applyText(el, dict));
  document.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((el) => applyAttrs(el, dict));
  document
    .querySelectorAll<HTMLElement>('[data-i18n-text-ru], [data-i18n-text-en]')
    .forEach((el) => applyBilingual(el, lang));

  document.title = dict.meta.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', dict.meta.description);
  document.documentElement.lang = lang;

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', lang === 'ru' ? `${SITE}/` : `${SITE}/en/`);

  updateToggle(lang);
}

function updateToggle(lang: Lang): void {
  const toggle = document.getElementById('lang-toggle') as HTMLAnchorElement | null;
  if (!toggle) return;
  const other = otherLang(lang);
  toggle.setAttribute('href', pathFor(other));
  toggle.dataset.langSwitch = other;
  toggle.setAttribute('hreflang', other);
  const label = toggle.querySelector<HTMLElement>('[data-lang-label]');
  if (label) label.textContent = other.toUpperCase();
}

function setLang(lang: Lang, push: boolean): void {
  if (lang === currentLang && !push) return;
  currentLang = lang;
  applyAll(lang);

  if (push) {
    history.pushState({ lang }, '', pathFor(lang));
  }

  window.dispatchEvent(
    new CustomEvent('langchange', { detail: { lang, dict: dictionaries[lang] } }),
  );
}

function detectInitialLang(): Lang {
  const fromHtml = document.documentElement.lang;
  if (fromHtml === 'en' || fromHtml === 'ru') return fromHtml;
  return window.location.pathname.startsWith('/en') ? 'en' : 'ru';
}

declare global {
  interface Window {
    __i18n: {
      readonly lang: Lang;
      readonly dict: Dictionary;
    };
  }
}

export function initI18n(): void {
  currentLang = detectInitialLang();

  window.__i18n = {
    get lang() {
      return currentLang;
    },
    get dict() {
      return dictionaries[currentLang];
    },
  };

  const toggle = document.getElementById('lang-toggle');
  if (toggle) {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      setLang(otherLang(currentLang), true);
    });
  }

  window.addEventListener('popstate', () => {
    const lang: Lang = window.location.pathname.startsWith('/en') ? 'en' : 'ru';
    setLang(lang, false);
  });

  window.dispatchEvent(
    new CustomEvent('langchange', { detail: { lang: currentLang, dict: dictionaries[currentLang] } }),
  );
}

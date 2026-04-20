/**
 * Replace ordinary spaces with non-breaking ones in places where a line
 * break would look ugly: short Russian and English particles that should
 * never hang at end of line, and number-unit pairs ("250 KB", "15 ms").
 *
 * Safe to apply to any string regardless of language — rules only fire
 * when a matching token is found.
 */

const RU_HANGING = [
  'в', 'и', 'к', 'о', 'с', 'у', 'я', 'а',
  'во', 'до', 'за', 'из', 'ко', 'на', 'не', 'ни', 'но', 'об', 'от', 'по', 'со', 'то',
  'мы', 'ты', 'вы', 'он',
  'для', 'над', 'под', 'при', 'про', 'или', 'как', 'что', 'еще', 'уже',
];

const EN_HANGING = [
  'a', 'an', 'the',
  'and', 'or', 'but', 'nor', 'so', 'yet',
  'of', 'in', 'on', 'at', 'to', 'by', 'for', 'with', 'from', 'as', 'is', 'it',
  'I', 'we', 'us', 'he', 'my', 'no', 'not', 'if',
];

const UNITS = [
  'KB', 'MB', 'GB', 'TB', 'B', 'kb', 'mb', 'gb',
  'ms', 's', 'min', 'h', 'd',
  'days?', 'hours?', 'minutes?', 'seconds?',
  'год', 'года', 'лет', 'дней', 'дня', 'день', 'часов', 'часа', 'час',
  'месяца?', 'мес', 'мин', 'сек',
];

const RU_RE = new RegExp(
  `(^|[\\s(\\u00AB"'])(${RU_HANGING.join('|')})\\s+`,
  'giu',
);

const EN_RE = new RegExp(
  `(^|[\\s(\\u00AB"'])(${EN_HANGING.join('|')})\\s+`,
  'gu',
);

const UNIT_RE = new RegExp(
  `(\\d)(?:\\s+|\\u00A0)(${UNITS.join('|')})\\b`,
  'gu',
);

export function nbsp(text: string): string {
  return text
    .replace(RU_RE, (_m, before, word) => `${before}${word}\u00A0`)
    .replace(EN_RE, (_m, before, word) => `${before}${word}\u00A0`)
    .replace(UNIT_RE, '$1\u00A0$2');
}

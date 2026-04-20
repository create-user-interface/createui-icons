import { LUCIDE_VERSION } from '../generated/version';

export const CDN = 'https://icon.createui.dev';
export const VERSION = LUCIDE_VERSION;

export function iconUrl(name: string, stroke: number | string = 2): string {
  return `${CDN}/${VERSION}/${name}.svg?stroke=${stroke}`;
}

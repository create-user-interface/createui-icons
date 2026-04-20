/**
 * Build-time fetcher for the Support sync-status badge.
 *
 * Sources:
 * - npm registry → latest published @createui-dev/icons version + publish date
 * - CDN HEAD probes → which version is actually live on the VDS
 * - Cron schedule "0 6 * * 1" (.github/workflows/sync.yml) → previous and next sync timestamps
 *
 * All resolved at `astro build` time, so the rendered HTML carries the
 * snapshot of the moment we built. The next CI build (after each sync
 * action) will pick up new values automatically.
 */

import { CDN, VERSION } from './iconUrl';

const NPM_REGISTRY = 'https://registry.npmjs.org/%40createui-dev%2Ficons';
const PROBE_ICON = 'user.svg';

export interface SyncStatus {
  npmLatest: string;
  npmPublishedAt: string | null;
  cdnVersion: string;
  cdnStale: boolean;
  lastSync: Date;
  nextSync: Date;
}

interface NpmRegistryResponse {
  'dist-tags': { latest: string };
  time: Record<string, string>;
}

async function fetchNpmLatest(): Promise<{ version: string; publishedAt: string | null }> {
  try {
    const res = await fetch(NPM_REGISTRY, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`npm registry ${res.status}`);
    const data = (await res.json()) as NpmRegistryResponse;
    const version = data['dist-tags'].latest;
    const publishedAt = data.time?.[version] ?? null;
    return { version, publishedAt };
  } catch {
    return { version: VERSION, publishedAt: null };
  }
}

async function probeCdnVersion(npmLatest: string): Promise<string> {
  // Walk version numbers backward from npm latest until we find one live on the CDN.
  const tryVersion = async (v: string): Promise<boolean> => {
    try {
      const res = await fetch(`${CDN}/${v}/${PROBE_ICON}`, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  };

  if (await tryVersion(npmLatest)) return npmLatest;

  const [maj, min, patch] = npmLatest.split('.').map(Number);
  for (let p = patch - 1; p >= 0; p--) {
    const v = `${maj}.${min}.${p}`;
    if (await tryVersion(v)) return v;
  }
  for (let m = min - 1; m >= 0; m--) {
    const v = `${maj}.${m}.0`;
    if (await tryVersion(v)) return v;
  }
  return npmLatest;
}

/**
 * Cron schedule from .github/workflows/sync.yml: `0 6 * * 1` (Mon 06:00 UTC, weekly).
 * Returns the most recent past trigger and the next future trigger (UTC).
 */
function cronWindow(now: Date = new Date()): { last: Date; next: Date } {
  const MONDAY = 1;
  const cronHour = 6;

  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), cronHour));
  const dow = todayUtc.getUTCDay();
  const offsetToMonday = (dow - MONDAY + 7) % 7;

  const thisWeekMonday = new Date(todayUtc);
  thisWeekMonday.setUTCDate(todayUtc.getUTCDate() - offsetToMonday);

  const last = thisWeekMonday.getTime() <= now.getTime()
    ? thisWeekMonday
    : new Date(thisWeekMonday.getTime() - 7 * 86_400_000);

  const next = new Date(last.getTime() + 7 * 86_400_000);

  return { last, next };
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const { version: npmLatest, publishedAt: npmPublishedAt } = await fetchNpmLatest();
  const cdnVersion = await probeCdnVersion(npmLatest);
  const { last, next } = cronWindow();
  return {
    npmLatest,
    npmPublishedAt,
    cdnVersion,
    cdnStale: cdnVersion !== npmLatest,
    lastSync: last,
    nextSync: next,
  };
}

export interface RelativeTime {
  en: string;
  ru: string;
}

export function relativeTime(date: Date, now: Date = new Date()): RelativeTime {
  const diffMs = now.getTime() - date.getTime();
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);

  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);

  if (minutes < 1) return { en: 'just now', ru: 'только что' };
  if (minutes < 60) {
    return future
      ? { en: `in ${minutes} min`, ru: `через ${minutes} мин` }
      : { en: `${minutes} min ago`, ru: `${minutes} мин назад` };
  }
  if (hours < 24) {
    return future
      ? { en: `in ${hours}h`, ru: `через ${hours}\u00A0ч` }
      : { en: `${hours}h ago`, ru: `${hours}\u00A0ч\u00A0назад` };
  }
  if (days < 30) {
    return future
      ? { en: `in ${days}d`, ru: `через ${days}\u00A0д` }
      : { en: `${days}d ago`, ru: `${days}\u00A0д\u00A0назад` };
  }
  const months = Math.round(days / 30);
  return future
    ? { en: `in ${months}mo`, ru: `через ${months}\u00A0мес` }
    : { en: `${months}mo ago`, ru: `${months}\u00A0мес\u00A0назад` };
}

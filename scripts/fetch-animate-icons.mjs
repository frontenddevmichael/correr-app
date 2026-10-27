#!/usr/bin/env node
/**
 * Phase 1 of porting Animate UI icons to React Native.
 *
 * Maps every Correr IconName to its Animate UI / Lucide registry slug
 * (`https://animate-ui.com/r/icons-lucide-<slug>.json`), fetches each item
 * (with fallback slugs), and caches the raw JSON for the codegen step.
 *
 * Usage: node scripts/fetch-animate-icons.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CACHE = join(dirname(fileURLToPath(import.meta.url)), 'animate-registry-cache');

/** Correr IconName -> candidate Lucide registry slugs, in order of preference. */
const MAP = {
  home: ['house'],
  homeFilled: ['house'],
  compass: ['compass'],
  compassFilled: ['compass'],
  people: ['users'],
  peopleFilled: ['users'],
  chart: ['chart-column', 'chart-no-axes-column', 'bar-chart-3'],
  chartFilled: ['chart-column', 'chart-no-axes-column', 'bar-chart-3'],
  more: ['ellipsis', 'more-horizontal'],
  moreFilled: ['ellipsis', 'more-horizontal'],
  bell: ['bell'],
  flame: ['flame'],
  check: ['check'],
  checkCircle: ['circle-check', 'check-circle'],
  xmark: ['x'],
  trash: ['trash-2', 'trash'],
  plus: ['plus'],
  chevronRight: ['chevron-right'],
  chevronLeft: ['chevron-left'],
  play: ['play'],
  pencil: ['pencil', 'pen-line'],
  refresh: ['refresh-cw', 'rotate-cw'],
  chevronUp: ['chevron-up'],
  chevronDown: ['chevron-down'],
  clock: ['clock-3', 'clock'],
  calendar: ['calendar'],
  send: ['send'],
  sparkles: ['sparkles'],
  target: ['target'],
  map: ['map'],
  trophy: ['trophy'],
  heart: ['heart'],
  question: ['circle-help', 'help-circle'],
  chat: ['message-circle', 'message-square'],
  alert: ['triangle-alert', 'alert-triangle'],
  cloud: ['cloud'],
  cloudRain: ['cloud-rain'],
  sprout: ['sprout'],
  wrench: ['wrench'],
  person: ['user-round', 'user'],
  lock: ['lock'],
  shield: ['shield'],
  school: ['graduation-cap'],
  flag: ['flag'],
  tag: ['tag'],
  bulb: ['lightbulb', 'bulb'],
  gear: ['settings'],
  wallet: ['wallet'],
  inbox: ['inbox'],
  doc: ['file-text'],
};

const BASE = 'https://animate-ui.com/r/icons-lucide-';

async function fetchOne(slug) {
  try {
    const res = await fetch(`${BASE}${slug}.json`, {
      signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': 'correr-icon-port/1.0' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.files?.[0]?.content) return null;
    return json;
  } catch {
    return null;
  }
}

mkdirSync(CACHE, { recursive: true });
const ok = [];
const failed = [];

for (const [name, slugs] of Object.entries(MAP)) {
  let hit = null;
  let used = null;
  for (const slug of slugs) {
    hit = await fetchOne(slug);
    if (hit) {
      used = slug;
      break;
    }
  }
  if (hit) {
    writeFileSync(join(CACHE, `${name}.json`), JSON.stringify({ icon: name, slug: used, ...hit }, null, 2));
    ok.push(`${name} <- ${used}`);
    process.stdout.write('.');
  } else {
    failed.push(`${name} (tried: ${slugs.join(', ')})`);
    process.stdout.write('X');
  }
}

console.log(`\n\nOK (${ok.length}/${Object.keys(MAP).length}):`);
for (const line of ok) console.log('  ' + line);
if (failed.length) {
  console.log(`\nFAILED (${failed.length}):`);
  for (const line of failed) console.log('  ' + line);
  process.exitCode = 1;
}
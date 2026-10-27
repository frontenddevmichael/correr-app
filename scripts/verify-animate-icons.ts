/**
 * Engine verification for the Animate UI tab-bar icons.
 *
 * Compiles the pure engine (`src/design-system/animateEngine.ts`) plus the
 * generated icon data and checks the geometry/timing the tab bar relies on:
 *
 *   npx tsc scripts/verify-animate-icons.ts --outDir /tmp/aui-verify \
 *     --module commonjs --target es2021 --moduleResolution node \
 *     --esModuleInterop --strict --skipLibCheck
 *   node /tmp/aui-verify/scripts/verify-animate-icons.js
 */
import { ANIMATE_ICONS, type AnimIconDef, type AnimateIconName } from '../src/design-system/animateIconsData';
import {
  buildPlayTargets,
  buildRestPose,
  buildSettleTargets,
  computePose,
  indexElements,
  resolveOrigin,
  totalDuration,
  type Matrix,
  type Pose,
} from '../src/design-system/animateEngine';

let failures = 0;

function check(label: string, ok: boolean, detail = '') {
  if (!ok) {
    failures += 1;
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`  ok    ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function finite(m: Matrix | null): boolean {
  return m == null || m.every((n) => Number.isFinite(n));
}

/** Point at rest vs. after a full play — anything that does not move is a no-op. */
function moved(before: Pose, after: Pose): boolean {
  for (const [key, entry] of Object.entries(after)) {
    const was = before[key];
    if (!was) return true;
    if (JSON.stringify(was.transform) !== JSON.stringify(entry.transform)) return true;
    if (JSON.stringify(was.values) !== JSON.stringify(entry.values)) return true;
  }
  return false;
}

const TAB_ICONS: AnimateIconName[] = ['home', 'compass', 'sparkles', 'chart', 'plus'];

console.log('\nAnnotate UI icon engine — verification\n');

for (const name of TAB_ICONS) {
  const def: AnimIconDef | undefined = ANIMATE_ICONS[name];
  console.log(`${name}`);
  if (!def) {
    check('icon present', false, 'missing from ANIMATE_ICONS');
    continue;
  }

  const elements = indexElements(def);
  check('elements indexed', elements.size > 0, `${elements.size} keyed`);

  // Every variant the tab bar asks for must exist.
  const states = Object.keys(def.states);
  check('default state', def.states.default != null, states.join(', '));
  if (name === 'plus') {
    check("plus 'x' state", def.states.x != null, states.join(', '));
  }

  // transformOrigin must land inside the viewBox.
  const [, , vw, vh] = def.viewBox.split(/\s+/).map(Number);
  for (const [stateName, entry] of Object.entries(def.states)) {
    for (const [key, e] of Object.entries(entry)) {
      const element = elements.get(key);
      if (!element) {
        check(`${stateName}/${key} resolves to an element`, false);
        continue;
      }
      const origin = resolveOrigin(e.origin, element.bbox);
      if (origin) {
        const inside =
          origin[0] >= -0.01 && origin[0] <= vw + 0.01 && origin[1] >= -0.01 && origin[1] <= vh + 0.01;
        check(`${stateName}/${key} origin inside viewBox`, inside, `${origin[0]},${origin[1]}`);
      }
      if (element.pathLength) {
        check(`${stateName}/${key} length measured`, (element.length ?? 0) > 0, String(element.length));
      }
    }
  }

  // A full play: finite matrices, non-zero duration, lands somewhere real.
  const rest = buildRestPose(def.states.default ?? Object.values(def.states)[0], elements);
  for (const stateName of states) {
    const targets = buildPlayTargets(def.states[stateName], elements);
    const duration = totalDuration(targets);
    check(`${stateName} plays`, targets.length > 0 && duration > 0, `${targets.length} targets, ${duration}ms`);

    const start = computePose(targets, 0);
    const end = computePose(targets, duration);
    check(
      `${stateName} matrices finite`,
      Object.values(start).every((e) => finite(e.transform)) &&
        Object.values(end).every((e) => finite(e.transform))
    );

    // Mid-flight poses must stay finite too (easing is evaluated there).
    const mid = computePose(targets, duration / 2);
    check(
      `${stateName} mid-frame finite`,
      Object.values(mid).every((e) => finite(e.transform) && Object.values(e.values).every(Number.isFinite))
    );
  }

  // The play actually animates rather than sitting still (checked mid-flight:
  // keyframes that return to their start are still a real animation).
  const play = buildPlayTargets(def.states.default ?? Object.values(def.states)[0], elements);
  if (play.length) {
    const mid = computePose(play, totalDuration(play) / 2);
    check('default play moves the glyph mid-flight', moved(rest, mid));
  }

  // Settling into a variant from an arbitrary pose must stay finite.
  const settle = buildSettleTargets(def.states.default ?? Object.values(def.states)[0], elements, rest);
  const settled = computePose(settle, totalDuration(settle));
  check('settle finite', Object.values(settled).every((e) => finite(e.transform)));
}

// The tab bar asks every pill icon to loop. A loop either wraps on its own
// (equal start/end keyframes, `elapsed % total`) or is mirrored by the
// component; what must never happen is a seam the renderer cannot cover.
console.log('\nloop continuity');
for (const name of ['home', 'compass', 'sparkles', 'chart'] as AnimateIconName[]) {
  const def = ANIMATE_ICONS[name];
  if (!def) {
    check(`${name} present`, false);
    continue;
  }
  const elements = indexElements(def);
  const entry = def.states['default-loop'] ?? def.states.default;
  const targets = buildPlayTargets(entry, elements);
  const total = totalDuration(targets);
  const first = computePose(targets, 0);
  const last = computePose(targets, total);
  const wraps = JSON.stringify(first) === JSON.stringify(last);
  const explicit = def.states['default-loop'] != null;
  // Mirroring retraces the play, so it can only be seamless if it starts where
  // the glyph rests — i.e. the rest pose equals the play's first frame.
  const rest = buildRestPose(entry, elements);
  const mirrorable = JSON.stringify(rest) === JSON.stringify(first);
  const mode = explicit && wraps ? 'loop variant' : wraps ? 'default, forward' : 'default, mirrored';
  check(`${name} loops without a seam`, wraps || mirrorable, mode);
}

if (failures > 0) {
  throw new Error(`${failures} AnimateIcon engine check(s) failed.`);
}
console.log('\nAll AnimateIcon engine checks passed.\n');
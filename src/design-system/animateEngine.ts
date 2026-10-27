import {
  type AnimElementDef,
  type AnimIconDef,
  type AnimScalar,
  type AnimStateElement,
  type AnimTransition,
} from './animateIconsData';

/**
 * Animate UI icon engine — the half of `AnimateIcon` with no React in it.
 *
 * Everything here is pure: it turns a variant (`animateIconsData.ts`) plus the
 * pose currently on screen into a `Pose` (per-element transform matrix + plain
 * attribute values) evaluated at a given time. The component owns the clock;
 * this module owns the geometry and the keyframe player.
 *
 *  - Transform properties (x/y/rotate/scale/skew) bake into one SVG matrix
 *    conjugated by the element's transform-origin. `transform={[a,b,c,d,e,f]}`
 *    is the shared channel on native and web, so a pose renders identically
 *    on either platform.
 *  - Everything else (opacity, x1/y1/x2/y2, pathLength) is a plain attribute;
 *    `pathLength` becomes a dash pattern built from the path length measured
 *    at build time.
 */

/* ------------------------------------------------------------------ easing */

export type EasingFn = (t: number) => number;

const linear: EasingFn = (t) => t;

function bezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) break;
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= err / slope;
    }
    if (t < 0 || t > 1) {
      let lo = 0;
      let hi = 1;
      t = x;
      for (let i = 0; i < 24; i += 1) {
        const err = sampleX(t) - x;
        if (Math.abs(err) < 1e-6) break;
        if (err > 0) hi = t;
        else lo = t;
        t = (lo + hi) / 2;
      }
    }
    return sampleY(t);
  };
}

const EASINGS: Record<string, EasingFn> = {
  linear,
  easeIn: bezier(0.42, 0, 1, 1),
  easeOut: bezier(0, 0, 0.58, 1),
  easeInOut: bezier(0.42, 0, 0.58, 1),
  circIn: bezier(0.55, 0.06, 0.68, 0.19),
  circOut: bezier(0, 0.55, 0.45, 1),
  circInOut: bezier(0.85, 0, 0.15, 1),
  backIn: bezier(0.36, 0, 0.66, -0.56),
  backOut: bezier(0.34, 1.56, 0.64, 1),
  backInOut: bezier(0.68, -0.6, 0.32, 1.6),
};

export function resolveEase(ease: AnimTransition['ease'] | undefined): EasingFn {
  if (Array.isArray(ease) && ease.length === 4) {
    return bezier(ease[0], ease[1], ease[2], ease[3]);
  }
  if (typeof ease === 'string' && EASINGS[ease]) return EASINGS[ease];
  return EASINGS.easeInOut;
}

/* ------------------------------------------------------------------ matrix */

/** SVG matrix(a, b, c, d, e, f) — the exact shape both renderers expect. */
export type Matrix = [number, number, number, number, number, number];
export type Point = [number, number];
export type NumericValues = Record<string, number>;

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const DEG = Math.PI / 180;

export function multiply(m: Matrix, n: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = m;
  const [a2, b2, c2, d2, e2, f2] = n;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

const translateMatrix = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];

function rotationMatrix(deg: number): Matrix {
  const r = deg * DEG;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
}

const scaleMatrix = (sx: number, sy: number): Matrix => [sx, 0, 0, sy, 0, 0];
const skewMatrixX = (deg: number): Matrix => [1, 0, Math.tan(deg * DEG), 1, 0, 0];
const skewMatrixY = (deg: number): Matrix => [1, Math.tan(deg * DEG), 0, 1, 0, 0];

/**
 * Transform properties applied in Framer's order — translate, rotate, skew,
 * scale — conjugated by the element's transform-origin. Returns null for the
 * identity so untouched elements render with no transform prop at all.
 */
export function transformMatrix(values: NumericValues, origin: Point | null): Matrix | null {
  const x = (values.translateX ?? values.translate ?? 0) + (values.x ?? 0);
  const y = (values.translateY ?? values.translate ?? 0) + (values.y ?? 0);
  const rotate = values.rotate ?? values.rotation ?? 0;
  const scaleX = values.scaleX ?? values.scale ?? 1;
  const scaleY = values.scaleY ?? values.scale ?? 1;
  const skewX = values.skewX ?? 0;
  const skewY = values.skewY ?? 0;

  if (!x && !y && !rotate && scaleX === 1 && scaleY === 1 && !skewX && !skewY) return null;

  let m: Matrix = IDENTITY;
  if (x || y) m = multiply(m, translateMatrix(x, y));
  if (rotate) m = multiply(m, rotationMatrix(rotate));
  if (skewX) m = multiply(m, skewMatrixX(skewX));
  if (skewY) m = multiply(m, skewMatrixY(skewY));
  if (scaleX !== 1 || scaleY !== 1) m = multiply(m, scaleMatrix(scaleX, scaleY));

  if (origin) {
    const [ox, oy] = origin;
    m = multiply(multiply(translateMatrix(ox, oy), m), translateMatrix(-ox, -oy));
  }
  return m;
}

/* -------------------------------------------------------------- pose model */

export interface PoseEntry {
  values: NumericValues;
  transform: Matrix | null;
}
export type Pose = Record<string, PoseEntry>;

export interface PropAnim {
  values: number[];
  times?: number[];
  ease: EasingFn;
  /** milliseconds */
  duration: number;
  /** milliseconds */
  delay: number;
}

export interface Target {
  key: string;
  origin: Point | null;
  props: Record<string, PropAnim>;
}

export interface Variant {
  entry: Record<string, AnimStateElement>;
  /** Repeat for as long as the icon is mounted (loop variants only). */
  repeats: boolean;
  /**
   * Ping-pong instead of wrapping. Set when the keyframes do not end where
   * they start (e.g. sparkles' `rotate: [0, 90]`), because `elapsed % total`
   * would snap the glyph back on every wrap; retracing the same play is
   * continuous at both turnarounds.
   */
  mirror: boolean;
}

/**
 * Time within one loop cycle. Forward for variants that wrap on their own,
 * ping-ponged for the rest, so a loop never jumps at the seam.
 */
export function loopTime(elapsed: number, total: number, mirror: boolean): number {
  if (total <= 0) return 0;
  if (!mirror) return elapsed % total;
  const cycle = total * 2;
  const inside = elapsed % cycle;
  return inside <= total ? inside : cycle - inside;
}

/** Framer Motion's default when a variant ships no transition. */
const DEFAULT_DURATION_MS = 300;

const TRANSFORM_KEYS = new Set([
  'x',
  'y',
  'translate',
  'translateX',
  'translateY',
  'rotate',
  'rotation',
  'scale',
  'scaleX',
  'scaleY',
  'skewX',
  'skewY',
]);

/** Keys that describe the variant rather than a property of the element. */
const VARIANT_META_KEYS = new Set([
  'transition',
  'transformOrigin',
  'origin',
  'originX',
  'originY',
]);

/** True when a property is baked into the transform matrix, not an attribute. */
export function isTransformKey(key: string): boolean {
  return TRANSFORM_KEYS.has(key);
}

export function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function defaultFor(key: string): number {
  return key === 'scale' || key === 'scaleX' || key === 'scaleY' ? 1 : 0;
}

function keyframes(value: AnimScalar[]): number[] | null {
  const numbers = value.map(Number);
  return numbers.every((n) => Number.isFinite(n)) ? numbers : null;
}

function animatedKeys(e: AnimStateElement): string[] {
  const keys = new Set<string>();
  for (const source of [e.initial, e.animate]) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      if (!VARIANT_META_KEYS.has(key)) keys.add(key);
    }
  }
  return [...keys];
}

export function indexElements(def: AnimIconDef): Map<string, AnimElementDef> {
  const map = new Map<string, AnimElementDef>();
  const walk = (elements: AnimElementDef[]) => {
    for (const element of elements) {
      if (element.key != null && !map.has(element.key)) map.set(element.key, element);
      walk(element.children);
    }
  };
  walk(def.elements);
  return map;
}

/** Percentages (or user units) inside the element's own bounding box. */
function axis(token: string | undefined, size: number): number {
  if (token == null) return size / 2;
  const value = Number.parseFloat(token);
  if (Number.isNaN(value)) return size / 2;
  return token.trim().endsWith('%') ? (value / 100) * size : value;
}

export function resolveOrigin(
  origin: string | undefined,
  bbox: AnimElementDef['bbox']
): Point | null {
  if (!bbox) return null;
  const [x, y, w, h] = bbox;
  if (!origin) return [x + w / 2, y + h / 2];
  const [ox, oy] = origin.split(/[\s,]+/).filter(Boolean);
  return [x + axis(ox, w), y + axis(oy ?? ox, h)];
}

/** Resting values of every animated property: base props, then `initial`. */
function restValues(element: AnimElementDef, e: AnimStateElement): NumericValues {
  const values: NumericValues = {};
  for (const key of animatedKeys(e)) {
    const raw = e.initial?.[key] ?? element.props[key];
    values[key] = toNumber(raw) ?? defaultFor(key);
  }
  return values;
}

function makeAnim(
  values: number[],
  transition: AnimTransition | undefined,
  propTransitions: Record<string, AnimTransition> | undefined,
  property: string
): PropAnim {
  const t = propTransitions?.[property] ?? transition;
  return {
    values,
    times: t?.times,
    ease: resolveEase(t?.ease),
    duration: (t?.duration ?? DEFAULT_DURATION_MS / 1000) * 1000,
    delay: (t?.delay ?? 0) * 1000,
  };
}

/** The resting pose — also what a mount with no autoplay renders. */
export function buildRestPose(
  entry: Record<string, AnimStateElement>,
  elements: Map<string, AnimElementDef>
): Pose {
  const pose: Pose = {};
  for (const [key, e] of Object.entries(entry)) {
    const element = elements.get(key);
    if (!element) continue;
    const values = restValues(element, e);
    pose[key] = { values, transform: transformMatrix(values, resolveOrigin(e.origin, element.bbox)) };
  }
  return pose;
}

/** A full play of the variant, from its `initial` pose through `animate`. */
export function buildPlayTargets(
  entry: Record<string, AnimStateElement>,
  elements: Map<string, AnimElementDef>
): Target[] {
  const targets: Target[] = [];
  for (const [key, e] of Object.entries(entry)) {
    const element = elements.get(key);
    if (!element) continue;
    const rest = restValues(element, e);
    const props: Record<string, PropAnim> = {};
    for (const property of animatedKeys(e)) {
      const to = e.animate?.[property];
      let values: number[] | null;
      if (Array.isArray(to)) {
        values = keyframes(to);
      } else {
        const target = toNumber(to);
        values = target == null ? null : [rest[property] ?? defaultFor(property), target];
      }
      if (!values || values.length === 0) continue;
      props[property] = makeAnim(values, e.transition, e.propTransitions, property);
    }
    if (Object.keys(props).length > 0) {
      targets.push({ key, origin: resolveOrigin(e.origin, element.bbox), props });
    }
  }
  return targets;
}

/**
 * Entering a variant: interpolate from the pose on screen to the new variant's
 * target (base props ∪ initial ∪ animate), so properties the new variant does
 * not mention fall back to the shape the element was drawn with.
 */
export function buildSettleTargets(
  entry: Record<string, AnimStateElement>,
  elements: Map<string, AnimElementDef>,
  current: Pose
): Target[] {
  const targets: Target[] = [];
  const keys = new Set([...Object.keys(entry), ...Object.keys(current)]);

  for (const key of keys) {
    const element = elements.get(key);
    if (!element) continue;
    const e = entry[key];
    const rest = e ? restValues(element, e) : {};
    const live = current[key]?.values ?? {};
    const properties = new Set([
      ...Object.keys(rest),
      ...Object.keys(e?.animate ?? {}),
      ...Object.keys(live),
    ]);

    const props: Record<string, PropAnim> = {};
    for (const property of properties) {
      if (VARIANT_META_KEYS.has(property)) continue;
      const to = e?.animate?.[property];
      let values: number[] | null;
      if (Array.isArray(to)) {
        // Framer jumps to the first keyframe when a keyframe variant is entered.
        values = keyframes(to);
      } else {
        const target =
          toNumber(to) ??
          rest[property] ??
          toNumber(element.props[property]) ??
          defaultFor(property);
        const from =
          live[property] ?? rest[property] ?? toNumber(element.props[property]) ?? defaultFor(property);
        values = [from, target];
      }
      if (!values || values.length === 0) continue;
      props[property] = makeAnim(values, e?.transition, e?.propTransitions, property);
    }

    if (Object.keys(props).length > 0) {
      targets.push({ key, origin: resolveOrigin(e?.origin, element.bbox), props });
    }
  }
  return targets;
}

export function totalDuration(targets: Target[]): number {
  let total = 0;
  for (const target of targets) {
    for (const prop of Object.values(target.props)) {
      total = Math.max(total, prop.delay + prop.duration);
    }
  }
  return total;
}

export function evalKeyframes(anim: PropAnim, progress: number): number {
  const { values, times } = anim;
  if (values.length === 1) return values[0];

  const useTimes = times != null && times.length === values.length;
  let index = 0;
  if (useTimes) {
    const marks = times as number[];
    while (index < values.length - 2 && progress > marks[index + 1]) index += 1;
  } else {
    index = Math.min(Math.floor(progress * (values.length - 1)), values.length - 2);
  }

  const t0 = useTimes ? (times as number[])[index] : index / (values.length - 1);
  const t1 = useTimes ? (times as number[])[index + 1] : (index + 1) / (values.length - 1);
  const width = t1 - t0;
  const local = width > 1e-9 ? (progress - t0) / width : 1;
  const eased = anim.ease(Math.min(Math.max(local, 0), 1));
  return values[index] + (values[index + 1] - values[index]) * eased;
}

export function computePose(targets: Target[], elapsed: number): Pose {
  const pose: Pose = {};
  for (const target of targets) {
    const values: NumericValues = {};
    for (const [property, anim] of Object.entries(target.props)) {
      const progress =
        anim.duration > 0 ? (elapsed - anim.delay) / anim.duration : elapsed >= anim.delay ? 1 : 0;
      values[property] =
        progress <= 0
          ? anim.values[0]
          : progress >= 1
            ? anim.values[anim.values.length - 1]
            : evalKeyframes(anim, progress);
    }
    pose[target.key] = { values, transform: transformMatrix(values, target.origin) };
  }
  return pose;
}

export const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

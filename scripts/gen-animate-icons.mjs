#!/usr/bin/env node
/**
 * Phase 2 of porting Animate UI icons to React Native.
 *
 * Reads the cached registry sources in `scripts/animate-registry-cache/` and
 * emits `src/design-system/animateIconsData.ts` containing, per icon:
 *
 *   - the element tree (tag, static JSX props, variant key, bounding box and
 *     total path length — both needed to resolve `transformOrigin` and
 *     `pathLength` animations, which react-native-svg cannot compute for us),
 *   - the selected animation states, with `transition` / `transformOrigin`
 *     lifted out of the Framer-style variant objects into their own fields
 *     and per-property transitions preserved.
 *
 * The `animations` const is *executed* (after TS type-stripping), so IIFEs
 * and computed keys (chart's `path1..3` builder) resolve to plain data.
 *
 * Run: node scripts/gen-animate-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const CACHE = path.join(root, 'scripts', 'animate-registry-cache');
const OUT = path.join(root, 'src', 'design-system', 'animateIconsData.ts');

/** Icons used by the tab bar / FAB, and the states worth shipping for them. */
const WANT = {
  home: ['default'],
  compass: ['default', 'default-loop'],
  sparkles: ['default'],
  chart: ['default', 'default-loop'],
  plus: ['default', 'x'],
};

// ---------------------------------------------------------------------------
// value helpers
// ---------------------------------------------------------------------------
const r4 = (n) => Math.round(n * 10000) / 10000;

// ---------------------------------------------------------------------------
// SVG path bounds + length (sampling; exact for lines, dense for curves)
// ---------------------------------------------------------------------------
function arcSamples(x1, y1, rx, ry, angle, largeArc, sweep, x2, y2) {
  if (rx === 0 || ry === 0) return [[x2, y2]];
  const rad = (angle * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const dx2 = (x1 - x2) / 2;
  const dy2 = (y1 - y2) / 2;
  const x1p = cosA * dx2 + sinA * dy2;
  const y1p = -sinA * dx2 + cosA * dy2;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
  }
  const sign = (largeArc && !sweep) || (!largeArc && sweep) ? 1 : -1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const co = den === 0 ? 0 : sign * Math.sqrt(Math.max(0, num / den));
  const cxp = ((co * rx * y1p) / ry);
  const cyp = ((co * -ry * x1p) / rx);
  const cx = cosA * cxp - sinA * cyp + (x1 + x2) / 2;
  const cy = sinA * cxp + cosA * cyp + (y1 + y2) / 2;
  const theta1 = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx);
  const theta2 = Math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx);
  let delta = theta2 - theta1;
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  else if (sweep && delta < 0) delta += 2 * Math.PI;
  const pts = [];
  const n = 16;
  for (let i = 1; i <= n; i++) {
    const t = theta1 + (delta * i) / n;
    pts.push([
      cosA * rx * Math.cos(t) - sinA * ry * Math.sin(t) + cx,
      sinA * rx * Math.cos(t) + cosA * ry * Math.sin(t) + cy,
    ]);
  }
  return pts;
}

function bezierSamples(p0, p1, p2, p3, n = 12) {
  const pts = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const mt = 1 - t;
    pts.push([
      mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0],
      mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}

/** Returns { points: [[x,y]...], length } for a path `d` string. */
function measurePath(d) {
  const tokens = String(d).match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const points = [];
  let length = 0;
  let i = 0;
  let cmd = null;
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let prevC = null; // previous cubic control point (for S)
  let prevQ = null; // previous quadratic control point (for T)

  const num = () => parseFloat(tokens[i++]);
  const push = (px, py) => {
    const last = points[points.length - 1];
    if (last) length += Math.hypot(px - last[0], py - last[1]);
    points.push([px, py]);
  };
  const isRel = (c) => c >= 'a';

  while (i < tokens.length) {
    const t = tokens[i];
    if (/[a-zA-Z]/.test(t)) {
      cmd = t;
      i++;
      if (cmd === 'Z' || cmd === 'z') {
        x = sx;
        y = sy;
        push(x, y);
        continue;
      }
    } else if (cmd === null) break;

    const c = isRel(cmd) ? cmd.toUpperCase() : cmd;
    const rel = isRel(cmd);
    switch (c) {
      case 'M': {
        const nx = num() + (rel ? x : 0);
        const ny = num() + (rel ? y : 0);
        x = nx;
        y = ny;
        sx = x;
        sy = y;
        points.push([x, y]); // moveto: no length
        // subsequent coordinate pairs are implicit LineTos
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'L': {
        const nx = num() + (rel ? x : 0);
        const ny = num() + (rel ? y : 0);
        x = nx;
        y = ny;
        push(x, y);
        break;
      }
      case 'H': {
        x = num() + (rel ? x : 0);
        push(x, y);
        break;
      }
      case 'V': {
        y = num() + (rel ? y : 0);
        push(x, y);
        break;
      }
      case 'C': {
        const p0 = [x, y];
        const p1 = [num() + (rel ? x : 0), num() + (rel ? y : 0)];
        const p2 = [num() + (rel ? x : 0), num() + (rel ? y : 0)];
        const p3 = [num() + (rel ? x : 0), num() + (rel ? y : 0)];
        bezierSamples(p0, p1, p2, p3).forEach((pt) => push(pt[0], pt[1]));
        x = p3[0];
        y = p3[1];
        prevC = p2;
        prevQ = null;
        break;
      }
      case 'S': {
        const p0 = [x, y];
        const p1 = prevC ? [2 * x - prevC[0], 2 * y - prevC[1]] : [x, y];
        const p2 = [num() + (rel ? x : 0), num() + (rel ? y : 0)];
        const p3 = [num() + (rel ? x : 0), num() + (rel ? y : 0)];
        bezierSamples(p0, p1, p2, p3).forEach((pt) => push(pt[0], pt[1]));
        x = p3[0];
        y = p3[1];
        prevC = p2;
        prevQ = null;
        break;
      }
      case 'Q': {
        const p0 = [x, y];
        const p1 = [num() + (rel ? x : 0), num() + (rel ? y : 0)];
        const p2 = [num() + (rel ? x : 0), num() + (rel ? y : 0)];
        // quadratic -> cubic equivalent, sampled
        const c1 = [p0[0] + (2 / 3) * (p1[0] - p0[0]), p0[1] + (2 / 3) * (p1[1] - p0[1])];
        const c2 = [p2[0] + (2 / 3) * (p1[0] - p2[0]), p2[1] + (2 / 3) * (p1[1] - p2[1])];
        bezierSamples(p0, c1, c2, p2).forEach((pt) => push(pt[0], pt[1]));
        x = p2[0];
        y = p2[1];
        prevQ = p1;
        prevC = null;
        break;
      }
      case 'T': {
        const p0 = [x, y];
        const p1 = prevQ
          ? [2 * x - prevQ[0], 2 * y - prevQ[1]]
          : [x, y];
        const p2 = [num() + (rel ? x : 0), num() + (rel ? y : 0)];
        const c1 = [p0[0] + (2 / 3) * (p1[0] - p0[0]), p0[1] + (2 / 3) * (p1[1] - p0[1])];
        const c2 = [p2[0] + (2 / 3) * (p1[0] - p2[0]), p2[1] + (2 / 3) * (p1[1] - p2[1])];
        bezierSamples(p0, c1, c2, p2).forEach((pt) => push(pt[0], pt[1]));
        x = p2[0];
        y = p2[1];
        prevQ = p1;
        prevC = null;
        break;
      }
      case 'A': {
        const rx = num();
        const ry = num();
        const rot = num();
        const large = num();
        const sweep = num();
        const ex = num() + (rel ? x : 0);
        const ey = num() + (rel ? y : 0);
        arcSamples(x, y, rx, ry, rot, large, sweep, ex, ey).forEach((pt) => push(pt[0], pt[1]));
        x = ex;
        y = ey;
        prevC = null;
        prevQ = null;
        break;
      }
      default:
        // Unknown command — bail out of this token to avoid an infinite loop.
        i++;
        break;
    }
  }
  return { points, length };
}

function bounds(points) {
  if (!points.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of points) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  return [r4(minX), r4(minY), r4(maxX - minX), r4(maxY - minY)];
}

// ---------------------------------------------------------------------------
// per-element geometry from static JSX props
// ---------------------------------------------------------------------------
function measureElement(def) {
  const p = def.props;
  switch (def.tag) {
    case 'path': {
      if (typeof p.d !== 'string') return { bbox: null, length: null };
      const m = measurePath(p.d);
      return { bbox: bounds(m.points), length: r4(m.length) };
    }
    case 'circle': {
      const cx = Number(p.cx);
      const cy = Number(p.cy);
      const r = Number(p.r);
      if ([cx, cy, r].some(Number.isNaN)) return { bbox: null, length: null };
      return { bbox: [r4(cx - r), r4(cy - r), r4(2 * r), r4(2 * r)], length: null };
    }
    case 'line': {
      const x1 = Number(p.x1);
      const y1 = Number(p.y1);
      const x2 = Number(p.x2);
      const y2 = Number(p.y2);
      if ([x1, y1, x2, y2].some(Number.isNaN)) return { bbox: null, length: null };
      return {
        bbox: [r4(Math.min(x1, x2)), r4(Math.min(y1, y2)), r4(Math.abs(x2 - x1)), r4(Math.abs(y2 - y1))],
        length: r4(Math.hypot(x2 - x1, y2 - y1)),
      };
    }
    case 'rect': {
      const x = Number(p.x ?? 0);
      const y = Number(p.y ?? 0);
      const w = Number(p.width ?? 0);
      const h = Number(p.height ?? 0);
      return { bbox: [r4(x), r4(y), r4(w), r4(h)], length: null };
    }
    case 'g':
    default: {
      // Union of children bboxes.
      let box = null;
      for (const child of def.children) {
        const cb = child.bbox;
        if (!cb) continue;
        if (!box) {
          box = [...cb];
          continue;
        }
        const x2 = Math.max(box[0] + box[2], cb[0] + cb[2]);
        const y2 = Math.max(box[1] + box[3], cb[1] + cb[3]);
        box[0] = Math.min(box[0], cb[0]);
        box[1] = Math.min(box[1], cb[1]);
        box[2] = r4(x2 - box[0]);
        box[3] = r4(y2 - box[1]);
      }
      return { bbox: box, length: null };
    }
  }
}

// ---------------------------------------------------------------------------
// animations const: strip types, execute
// ---------------------------------------------------------------------------
function extractAnimations(sourceText) {
  const sf = ts.createSourceFile(
    'icon.tsx',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let found = null;
  const visit = (node) => {
    if (found) return;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'animations' &&
      node.initializer
    ) {
      found = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!found) throw new Error('animations const not found');

  const text = sourceText.slice(found.getStart(sf), found.getEnd());
  const js = ts.transpileModule(`const __animations = ${text};`, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  return new Function(`${js}; return __animations;`)();
}

// ---------------------------------------------------------------------------
// JSX tree extraction
// ---------------------------------------------------------------------------
function jsxChildren(node) {
  // node: JsxElement | JsxSelfClosingElement
  const children = ts.isJsxElement(node) ? node.children : [];
  const out = [];
  for (const child of children) {
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
      out.push(child);
    } else if (ts.isJsxExpression(child) && child.expression) {
      // <> fragments
      const expr = child.expression;
      if (ts.isJsxFragment(expr)) {
        for (const fc of expr.children) {
          if (ts.isJsxElement(fc) || ts.isJsxSelfClosingElement(fc)) out.push(fc);
        }
      }
    }
  }
  return out;
}

function attrEntries(node) {
  const open = ts.isJsxElement(node) ? node.openingElement : node;
  return open.attributes?.properties ?? [];
}

const SKIP_ATTRS = new Set(['initial', 'animate', 'whileHover', 'whileTap', 'xmlns']);

/**
 * Reads one JSX element into a plain def. `variantKey` comes from the
 * `variants={variants.x}` attribute.
 */
function readElement(node, sf) {
  const open = ts.isJsxElement(node) ? node.openingElement : node;
  const rawTag = open.tagName.getText(sf);
  const tag = rawTag.replace(/^motion\./, '');
  const props = {};
  let variantKey = null;

  for (const attr of attrEntries(node)) {
    if (!ts.isJsxAttribute(attr)) continue; // spread: skip
    const name = attr.name.getText(sf);
    if (SKIP_ATTRS.has(name)) continue;
    const init = attr.initializer;
    if (!init) continue;
    if (ts.isStringLiteral(init)) {
      props[name] = init.text;
      continue;
    }
    if (ts.isJsxExpression(init) && init.expression) {
      const expr = init.expression;
      if (ts.isNumericLiteral(expr)) {
        props[name] = parseFloat(expr.text);
      } else if (ts.isStringLiteral(expr)) {
        props[name] = expr.text;
      } else if (ts.isIdentifier(expr)) {
        // `width={size}` — filled in by the runtime component.
        if (expr.text !== 'size') {
          throw new Error(`unsupported identifier prop {${expr.text}} on <${rawTag}>`);
        }
      } else if (
        ts.isPropertyAccessExpression(expr) &&
        ts.isIdentifier(expr.expression) &&
        expr.expression.text === 'variants'
      ) {
        variantKey = expr.name.text;
      } else {
        throw new Error(`unsupported expression prop ${name}={${expr.getText(sf)}} on <${rawTag}>`);
      }
    }
  }

  const def = { key: variantKey, tag, props, children: [] };
  for (const child of jsxChildren(node)) {
    def.children.push(readElement(child, sf));
  }
  const measured = measureElement(def);
  def.bbox = measured.bbox ?? null;
  if (measured.length != null) def.length = measured.length;
  return def;
}

function findSvgElement(node, sf) {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    const open = ts.isJsxElement(node) ? node.openingElement : node;
    if (open.tagName.getText(sf) === 'motion.svg') return node;
  }
  return ts.forEachChild(node, (c) => findSvgElement(c, sf));
}

// ---------------------------------------------------------------------------
// variant data normalization
// ---------------------------------------------------------------------------
const TIMING_KEYS = new Set([
  'duration',
  'delay',
  'ease',
  'times',
  'repeat',
  'repeatType',
  'repeatDelay',
  'type',
  'bounce',
  'stiffness',
  'damping',
  'mass',
  'restDelta',
  'restSpeed',
  'at',
]);

function normTransition(t) {
  const out = { duration: 0.3, delay: 0, ease: 'easeInOut' };
  if (typeof t.duration === 'number') out.duration = t.duration;
  if (typeof t.delay === 'number') out.delay = t.delay;
  if (t.ease !== undefined) out.ease = t.ease;
  if (Array.isArray(t.times)) out.times = t.times.map(r4);
  if (typeof t.repeat === 'number') out.repeat = t.repeat;
  if (t.repeatType === 'reverse' || t.repeatType === 'loop' || t.repeatType === 'mirror')
    out.repeatType = t.repeatType;
  if (typeof t.repeatDelay === 'number') out.repeatDelay = t.repeatDelay;
  return out;
}

/** Splits a Framer transition into { flat, perProp }. */
function splitTransition(t) {
  const flat = {};
  const perProp = {};
  if (!t || typeof t !== 'object') return null;
  for (const [k, v] of Object.entries(t)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && !TIMING_KEYS.has(k)) {
      perProp[k] = normTransition({ ...flat, ...v });
    } else {
      flat[k] = v;
    }
  }
  const hasFlat = Object.keys(flat).some((k) => TIMING_KEYS.has(k));
  if (!hasFlat && !Object.keys(perProp).length) return null;
  return {
    ...(hasFlat ? { transition: normTransition(flat) } : {}),
    ...(Object.keys(perProp).length ? { propTransitions: perProp } : {}),
  };
}

function liftVariant(v) {
  const initial = {};
  const animate = {};
  let transition = null;
  let initialTransition = null;
  let origin = null;
  for (const phase of ['initial', 'animate']) {
    const src = v?.[phase];
    if (!src || typeof src !== 'object') continue;
    const dst = phase === 'initial' ? initial : animate;
    for (const [k, val] of Object.entries(src)) {
      if (k === 'transition') {
        const split = splitTransition(val);
        if (split) {
          if (phase === 'animate') transition = split;
          else initialTransition = split;
        }
      } else if (k === 'transformOrigin') {
        origin = String(val);
      } else {
        dst[k] = val;
      }
    }
  }
  return { initial, animate, transition, initialTransition, origin };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function buildIcon(name, states) {
  const cachePath = path.join(CACHE, `${name}.json`);
  const item = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const source = item.files[0].content;
  const animations = extractAnimations(source);

  const sf = ts.createSourceFile(
    'icon.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const svgNode = findSvgElement(sf, sf);
  if (!svgNode) throw new Error(`${name}: motion.svg not found`);

  const rootDef = readElement(svgNode, sf);
  const elements = rootDef.children;

  // Elements that animate `pathLength` need their real path length: the engine
  // drives strokeDasharray/strokeDashoffset (react-native-svg has no
  // pathLength support on native).
  const byKey = new Map();
  const collect = (defs) => {
    for (const d of defs) {
      if (d.key) byKey.set(d.key, d);
      collect(d.children);
    }
  };
  collect(elements);

  const stateOut = {};
  for (const stateName of states) {
    const raw = animations[stateName];
    if (!raw) throw new Error(`${name}: state "${stateName}" missing (have: ${Object.keys(animations)})`);
    const stateEls = {};
    for (const [key, variant] of Object.entries(raw)) {
      const el = byKey.get(key);
      if (!el) continue; // variant for an element that isn't rendered
      const lifted = liftVariant(variant);
      const entry = {};
      if (Object.keys(lifted.initial).length) entry.initial = lifted.initial;
      if (Object.keys(lifted.animate).length) entry.animate = lifted.animate;
      Object.assign(entry, lifted.transition ?? {});
      if (lifted.initialTransition) {
        entry.initialTransition = lifted.initialTransition.transition;
        if (lifted.initialTransition.propTransitions)
          entry.initialPropTransitions = lifted.initialTransition.propTransitions;
      }
      if (lifted.origin) entry.origin = lifted.origin;
      if (Object.keys(entry).length) stateEls[key] = entry;
      if ('pathLength' in (lifted.animate ?? {}) || 'pathLength' in (lifted.initial ?? {})) {
        if (el.length == null) throw new Error(`${name}: pathLength on <${el.tag}> without measurable length`);
        el.pathLength = true;
      }
    }
    stateOut[stateName] = stateEls;
  }

  const rootProps = {};
  for (const [k, v] of Object.entries(rootDef.props)) {
    if (k === 'width' || k === 'height') continue;
    rootProps[k] = v;
  }

  const def = {
    viewBox: rootProps.viewBox ?? '0 0 24 24',
    root: rootProps,
    elements,
    states: stateOut,
  };
  return def;
}

function main() {
  const icons = {};
  for (const [name, states] of Object.entries(WANT)) {
    icons[name] = buildIcon(name, states);
  }

  const banner = `/* eslint-disable */
// GENERATED FILE — do not edit by hand.
// Produced by scripts/gen-animate-icons.mjs from the Animate UI registry cache
// (https://animate-ui.com/docs/icons). Rerun that script to refresh.

export type AnimScalar = number | string;
/** A single value, or a keyframe sequence (Framer Motion style). */
export type AnimValue = AnimScalar | AnimScalar[];

export interface AnimTransition {
  duration: number;
  delay: number;
  ease: string | number[];
  times?: number[];
  repeat?: number;
  repeatType?: 'loop' | 'reverse' | 'mirror';
  repeatDelay?: number;
}

export interface AnimTransitionSet {
  transition?: AnimTransition;
  propTransitions?: Record<string, AnimTransition>;
}

export interface AnimElementDef {
  /** Variant key (\`variants.x\`); null for static children. */
  key: string | null;
  tag: string;
  props: Record<string, AnimScalar>;
  children: AnimElementDef[];
  /** [x, y, w, h] in viewBox units — resolves transformOrigin. */
  bbox: [number, number, number, number] | null;
  /** Measured path/line length (only when pathLength is animated). */
  length?: number;
  pathLength?: boolean;
}

export interface AnimStateElement extends AnimTransitionSet {
  initial?: Record<string, AnimValue>;
  animate?: Record<string, AnimValue>;
  /** Transition used when animating back to the initial pose. */
  initialTransition?: AnimTransition;
  initialPropTransitions?: Record<string, AnimTransition>;
  /** transformOrigin string, e.g. "0% 50%". */
  origin?: string;
}

export interface AnimIconDef {
  viewBox: string;
  root: Record<string, AnimScalar>;
  elements: AnimElementDef[];
  states: Record<string, Record<string, AnimStateElement>>;
}

export type AnimateIconName = ${Object.keys(icons)
    .map((n) => JSON.stringify(n))
    .join(' | ')};

export const ANIMATE_ICONS: Record<AnimateIconName, AnimIconDef> = ${JSON.stringify(icons, null, 2)};
`;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, banner);
  const bytes = fs.statSync(OUT).size;
  console.log(`wrote ${path.relative(root, OUT)} (${(bytes / 1024).toFixed(1)} KB)`);
  for (const [name, def] of Object.entries(icons)) {
    console.log(`  ${name}: ${def.elements.length} elements, states = ${Object.keys(def.states).join(', ')}`);
  }
}

main();
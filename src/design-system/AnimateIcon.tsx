import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

import {
  ANIMATE_ICONS,
  type AnimElementDef,
  type AnimStateElement,
  type AnimateIconName,
} from './animateIconsData';
import {
  buildPlayTargets,
  buildRestPose,
  buildSettleTargets,
  computePose,
  indexElements,
  isTransformKey,
  loopTime,
  now,
  totalDuration,
  type Pose,
  type Target,
  type Variant,
} from './animateEngine';
import { useReducedMotion } from './motion';

export type { AnimateIconName };

/**
 * Animate UI icons (https://animate-ui.com/docs/icons) on react-native-svg.
 *
 * `scripts/gen-animate-icons.mjs` compiles the registry's React/Framer Motion
 * sources into the plain data in `animateIconsData.ts`, `animateEngine.ts` turns
 * that data into per-element poses, and this component is only the clock:
 *
 *  - a requestAnimationFrame loop evaluates the current pose and writes it into
 *    React state, so a re-render can never lose the pose that is on screen;
 *  - the tree is a handful of SVG nodes, so committing a pose per frame is
 *    cheap, and the loop stops the moment an animation finishes (a loop variant
 *    keeps it alive for as long as the icon is mounted);
 *  - with nothing playing, element props are identical to the static icon,
 *    which is what reduced-motion users see.
 *
 * Colours are always passed in by the caller, so glyphs track the theme.
 */

export interface AnimateIconProps {
  name: AnimateIconName;
  size?: number;
  /** Stroke colour — pass a theme colour so the glyph tracks light/dark. */
  color?: string;
  strokeWidth?: number;
  /** Variant to show (`default`, `x`, …). Unknown names fall back to `default`. */
  state?: string;
  /**
   * Prefer the icon's `<state>-loop` variant and repeat it while mounted;
   * icons without a loop variant play once when they start.
   */
  loop?: boolean;
  /** Play the variant once when the icon mounts. */
  autoplay?: boolean;
  /** Increment to replay the current variant. */
  play?: number;
  style?: object;
}

type SvgTagProps = Record<string, unknown> & { children?: React.ReactNode };
type SvgTag = React.ComponentType<SvgTagProps>;

const SVG_TAGS: Record<string, SvgTag> = {
  g: G as unknown as SvgTag,
  path: Path as unknown as SvgTag,
  circle: Circle as unknown as SvgTag,
  line: Line as unknown as SvgTag,
  rect: Rect as unknown as SvgTag,
  polyline: Polyline as unknown as SvgTag,
  polygon: Polygon as unknown as SvgTag,
  ellipse: Ellipse as unknown as SvgTag,
};

const round = (value: number) => Math.round(value * 1000) / 1000;

function renderElement(element: AnimElementDef, pose: Pose, key: string): React.ReactNode {
  const live = element.key != null ? pose[element.key] : undefined;
  const props: Record<string, unknown> = { ...element.props };

  if (live) {
    if (live.transform) props.transform = live.transform;
    for (const [property, value] of Object.entries(live.values)) {
      if (isTransformKey(property)) continue;
      if (property === 'pathLength') {
        // Framer draws a path by trimming its dash; lengths are measured at
        // build time. A full path stays untouched so it matches the static icon.
        if (element.length != null && value < 1) {
          props.strokeDasharray = `${round(value * element.length)} ${element.length}`;
        }
      } else {
        props[property] = value;
      }
    }
  }

  const children = element.children.length
    ? element.children.map((child, index) =>
        renderElement(child, pose, child.key ?? `#${index}`)
      )
    : null;
  const Tag = SVG_TAGS[element.tag] ?? SVG_TAGS.path;
  return (
    <Tag key={key} {...props}>
      {children}
    </Tag>
  );
}

export function AnimateIcon({
  name,
  size = 22,
  color = '#14161A',
  strokeWidth,
  state = 'default',
  loop = false,
  autoplay = false,
  play = 0,
  style,
}: AnimateIconProps) {
  const reduced = useReducedMotion();
  const def = ANIMATE_ICONS[name];
  const elements = useMemo(() => indexElements(def), [def]);

  const variant = useMemo<Variant>(() => {
    const loopKey = `${state}-loop`;
    const hasLoopVariant = def.states[loopKey] != null;
    const wanted = loop && hasLoopVariant ? loopKey : state;
    const entry = def.states[wanted] ?? def.states.default ?? Object.values(def.states)[0];
    // Icons without a dedicated loop variant (home, sparkles) still loop when
    // asked: their plain keyframes are replayed, mirrored when they do not end
    // where they started, so the seam never snaps.
    const targets = buildPlayTargets(entry, elements);
    const total = totalDuration(targets);
    const wraps =
      total > 0 &&
      JSON.stringify(computePose(targets, 0)) === JSON.stringify(computePose(targets, total));
    return { entry, repeats: loop && total > 0, mirror: loop && !wraps };
  }, [def, state, loop, elements]);

  const restPose = useMemo(
    () => buildRestPose(variant.entry, elements),
    [variant.entry, elements]
  );

  const [pose, setPose] = useState<Pose>(restPose);
  const poseRef = useRef(pose);
  const applyPose = useCallback((next: Pose) => {
    poseRef.current = next;
    setPose(next);
  }, []);

  const seen = useRef<{
    name: AnimateIconName;
    entry: Record<string, AnimStateElement>;
    play: number;
  } | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const previous = seen.current;
    seen.current = { name, entry: variant.entry, play };

    if (previous && previous.name !== name) {
      applyPose(restPose);
      return;
    }

    if (reduced) {
      // Jump straight to the target pose: a variant switch still has to land.
      if (previous && previous.entry !== variant.entry) {
        applyPose(
          computePose(
            buildSettleTargets(variant.entry, elements, poseRef.current),
            Number.MAX_SAFE_INTEGER
          )
        );
      }
      return;
    }

    let targets: Target[] | null = null;
    let repeats = false;

    if (!previous) {
      if (autoplay) {
        targets = buildPlayTargets(variant.entry, elements);
        repeats = variant.repeats;
      }
    } else if (previous.entry !== variant.entry) {
      targets = buildSettleTargets(variant.entry, elements, poseRef.current);
    } else if (previous.play !== play) {
      targets = buildPlayTargets(variant.entry, elements);
      repeats = variant.repeats;
    }

    if (!targets || targets.length === 0) return;

    const total = totalDuration(targets);
    if (total <= 0) {
      applyPose(computePose(targets, 0));
      return;
    }

    const running = targets;
    const started = now();
    const step = () => {
      const elapsed = now() - started;
      if (repeats) {
        applyPose(computePose(running, loopTime(elapsed, total, variant.mirror)));
      } else if (elapsed >= total) {
        applyPose(computePose(running, total));
        frame.current = null;
        return;
      } else {
        applyPose(computePose(running, elapsed));
      }
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);

    return () => {
      if (frame.current != null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    };
  }, [name, variant, play, autoplay, reduced, elements, restPose, applyPose]);

  const rootProps: Record<string, unknown> = {
    ...def.root,
    stroke: color,
    ...(strokeWidth != null ? { strokeWidth } : {}),
  };

  return (
    <Svg
      width={size}
      height={size}
      {...(rootProps as unknown as React.ComponentProps<typeof Svg>)}
      style={style as never}
    >
      {def.elements.map((element, index) =>
        renderElement(element, pose, element.key ?? `#${index}`)
      )}
    </Svg>
  );
}

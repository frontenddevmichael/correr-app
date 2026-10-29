#!/usr/bin/env node
/**
 * Regenerate Correr brand PNGs from the supplied 66-unit mark.
 *
 * The mark geometry is copied verbatim from the product SVG. Chromium renders
 * the SVG so gradients and the even-odd ring survive the rasterisation.
 *
 * Usage: node scripts/generate-brand-assets.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const IMAGES = join(ROOT, 'assets', 'images');
const BRAND = join(ROOT, 'assets', 'brand');
const TMP = '/tmp/opencode/correr-brand';

const OUTER =
  'M60.199 20.3424C61.7012 19.6434 62.3638 17.8504 61.5313 16.4179C58.2859 10.8336 53.4596 6.30375 47.6309 3.42069C40.9027 0.0926555 33.2408 -0.842097 25.9098 0.770687C18.5787 2.38347 12.0165 6.44741 7.30616 12.2919C2.59577 18.1363 0.0186621 25.4121 0.000100887 32.9184C-0.0184603 40.4247 2.52264 47.7131 7.20406 53.5808C11.8855 59.4485 18.4275 63.5448 25.7505 65.1939C33.0735 66.8429 40.7398 65.946 47.4845 62.6513C53.3273 59.7971 58.176 55.2911 61.449 49.723C62.2886 48.2947 61.6348 46.4984 60.1361 45.7919L59.3605 45.4263C57.8619 44.7199 56.0884 45.3737 55.215 46.7816C52.6309 50.947 48.9152 54.3206 44.4746 56.4898C39.1315 59.0999 33.0582 59.8103 27.2569 58.504C21.4556 57.1976 16.2731 53.9525 12.5644 49.3041C8.85582 44.6557 6.84276 38.8819 6.85746 32.9354C6.87217 26.9888 8.91376 21.225 12.6453 16.595C16.3769 11.965 21.5754 8.74557 27.3831 7.46792C33.1908 6.19027 39.2605 6.93079 44.5906 9.56726C49.0205 11.7584 52.7194 15.1503 55.2829 19.3284C56.1493 20.7407 57.9195 21.4032 59.4217 20.7042L60.199 20.3424Z';

const RING =
  'M49.5 33C49.5 42.1127 42.1127 49.5 33 49.5C23.8873 49.5 16.5 42.1127 16.5 33C16.5 23.8873 23.8873 16.5 33 16.5C42.1127 16.5 49.5 23.8873 49.5 33ZM21.4275 33C21.4275 39.3913 26.6087 44.5725 33 44.5725C39.3913 44.5725 44.5725 39.3913 44.5725 33C44.5725 26.6087 39.3913 21.4275 33 21.4275C26.6087 21.4275 21.4275 26.6087 21.4275 33Z';

function mark({ start, end, size = 66, x = 0, y = 0, scale = 1 }) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="${OUTER}" fill="url(#outer)"/>
    <path d="${RING}" fill="url(#ring)"/>
    <ellipse cx="33" cy="33" rx="5.07692" ry="5" fill="url(#dot)"/>
  </g>
  <defs>
    <linearGradient id="outer" x1="33.0919" y1="57.42" x2="33.092" y2="-14.52" gradientUnits="userSpaceOnUse">
      <stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/>
    </linearGradient>
    <linearGradient id="ring" x1="33.046" y1="45.21" x2="33.046" y2="9.24" gradientUnits="userSpaceOnUse">
      <stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/>
    </linearGradient>
    <linearGradient id="dot" x1="33.0142" y1="36.7" x2="33.0142" y2="25.8" gradientUnits="userSpaceOnUse">
      <stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/>
    </linearGradient>
  </defs>`;
}

function standaloneSvg({ start, end, size = 512 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 66 66" fill="none">
    ${mark({ start, end })}
  </svg>`;
}

function iconSvg({ background, start, end, size = 1024, markScale = 9.7 }) {
  const logoSize = 66 * markScale;
  const offset = (size - logoSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
    <rect width="${size}" height="${size}" fill="${background}"/>
    ${mark({ start, end, x: offset, y: offset, scale: markScale })}
  </svg>`;
}

function html(svg, size) {
  return `<!doctype html><html><head><style>
    html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:transparent}
    svg{display:block}
  </style></head><body>${svg}</body></html>`;
}

function render(name, svg, size, { transparent = true } = {}) {
  const htmlPath = join(TMP, `${name}.html`);
  const pngPath = join(TMP, `${name}.png`);
  writeFileSync(htmlPath, html(svg, size));
  const args = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${size},${size}`,
    `--screenshot=${pngPath}`,
  ];
  if (transparent) args.push('--default-background-color=00000000');
  args.push(`file://${htmlPath}`);
  execFileSync('chromium', args, { stdio: 'ignore' });
  return pngPath;
}

mkdirSync(IMAGES, { recursive: true });
mkdirSync(BRAND, { recursive: true });
mkdirSync(TMP, { recursive: true });

const light = { start: '#0A0A0A', end: '#707070' };
const dark = { start: '#F6F3ED', end: '#8A8177' };
const mono = { start: '#000000', end: '#000000' };

// Splash and in-app transparent marks.
const splashLight = render('splash-light', standaloneSvg({ ...light, size: 512 }), 512);
const splashDark = render('splash-dark', standaloneSvg({ ...dark, size: 512 }), 512);

// App icon: full-bleed dark tile with the light mark. iOS applies its own mask.
const appIcon = render(
  'app-icon',
  iconSvg({ background: '#171410', ...dark, size: 1024, markScale: 9.7 }),
  1024,
  { transparent: false },
);

// Android adaptive foreground: transparent, inside the safe zone.
const androidForeground = render(
  'android-foreground',
  iconSvg({ background: 'transparent', ...dark, size: 1024, markScale: 9.1 }).replace(
    '<rect width="1024" height="1024" fill="transparent"/>',
    '',
  ),
  1024,
);
const androidMonochrome = render(
  'android-monochrome',
  iconSvg({ background: 'transparent', ...mono, size: 1024, markScale: 9.1 }).replace(
    '<rect width="1024" height="1024" fill="transparent"/>',
    '',
  ),
  1024,
);

// Browser favicon: a small dark tile so it reads on light and dark tabs.
const faviconLarge = render(
  'favicon-large',
  iconSvg({ background: '#171410', ...dark, size: 512, markScale: 9.3 }),
  512,
  { transparent: false },
);

// Copy the raster outputs into the app.
execFileSync('cp', [splashLight, join(IMAGES, 'splash-icon.png')]);
execFileSync('cp', [splashDark, join(IMAGES, 'splash-icon-dark.png')]);
execFileSync('cp', [splashLight, join(IMAGES, 'logo-icon.png')]);
execFileSync('cp', [appIcon, join(IMAGES, 'icon.png')]);
execFileSync('cp', [androidForeground, join(IMAGES, 'android-icon-foreground.png')]);
execFileSync('cp', [androidMonochrome, join(IMAGES, 'android-icon-monochrome.png')]);
execFileSync('convert', [faviconLarge, '-resize', '48x48', join(IMAGES, 'favicon.png')]);

// Source SVGs for design review and future rasterisation.
writeFileSync(join(BRAND, 'mark.svg'), standaloneSvg({ ...light, size: 66 }));
writeFileSync(join(BRAND, 'mark-dark.svg'), standaloneSvg({ ...dark, size: 66 }));
writeFileSync(
  join(BRAND, 'tile.svg'),
  iconSvg({ background: '#171410', ...dark, size: 512, markScale: 9.7 }),
);
writeFileSync(
  join(BRAND, 'icon.svg'),
  iconSvg({ background: '#171410', ...dark, size: 1024, markScale: 9.7 }),
);

console.log('Brand assets regenerated in assets/images and assets/brand.');

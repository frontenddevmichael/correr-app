#!/usr/bin/env node
/**
 * Surveys the cached Animate UI registry sources: which SVG element tags,
 * which animatable properties, which transition fields, and how many named
 * animations each icon has. Used to size the RN porting engine.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const CACHE = join(dirname(fileURLToPath(import.meta.url)), 'animate-registry-cache');

const propKeys = new Map();
const transitionKeys = new Map();
const tags = new Map();
const animNames = new Map();
const oddities = [];

const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

/** Strip `as const` / `satisfies X` wrappers — they nest at every level. */
const unwrap = (node) => {
  while (node && (ts.isAsExpression(node) || ts.isSatisfiesExpression(node))) {
    node = node.expression;
  }
  return node;
};

for (const file of readdirSync(CACHE).sort()) {
  const raw = JSON.parse(readFileSync(join(CACHE, file), 'utf8'));
  const src = raw.files[0].content;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  // animations = { ... } as const  /  satisfies Record<string, Variants>
  let animationsNode = null;
  sf.statements.forEach((st) => {
    if (ts.isVariableStatement(st)) {
      st.declarationList.declarations.forEach((d) => {
        if (ts.isIdentifier(d.name) && d.name.text === 'animations' && d.initializer) {
          animationsNode = d.initializer;
        }
      });
    }
  });
  if (!animationsNode) {
    oddities.push(`${file}: no animations const`);
    continue;
  }
  animationsNode = unwrap(animationsNode);
  if (!animationsNode || !ts.isObjectLiteralExpression(animationsNode)) {
    oddities.push(`${file}: animations not an object literal`);
    continue;
  }

  const names = [];
  for (const prop of animationsNode.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name = prop.name.getText(sf);
    names.push(name);
    const animEntry = unwrap(prop.initializer);
    if (!ts.isObjectLiteralExpression(animEntry)) {
      oddities.push(`${file}: animation ${name} not an object literal`);
      continue;
    }
    for (const elProp of animEntry.properties) {
      if (!ts.isPropertyAssignment(elProp)) continue;
      const stateEntry = unwrap(elProp.initializer);
      if (!ts.isObjectLiteralExpression(stateEntry)) continue;
      // stateEntry: { initial, animate, transition, ... }
      for (const stateProp of stateEntry.properties) {
        if (!ts.isPropertyAssignment(stateProp)) continue;
        const stateName = stateProp.name.getText(sf);
        const stateValue = unwrap(stateProp.initializer);
        if (stateName === 'transition') {
          if (ts.isObjectLiteralExpression(stateValue)) {
            for (const t of stateValue.properties) {
              bump(transitionKeys, t.name.getText(sf));
            }
          } else {
            bump(transitionKeys, `<${ts.SyntaxKind[stateValue.kind]}>`);
          }
        } else if (ts.isObjectLiteralExpression(stateValue)) {
          for (const k of stateValue.properties) {
            bump(propKeys, k.name.getText(sf));
          }
        } else {
          bump(propKeys, `<${ts.SyntaxKind[stateValue.kind]}>`);
        }
      }
    }
  }
  bump(animNames, names.join('+'));
  void tags;
}

console.log('=== animation names per icon (names ×count) ===');
[...animNames.entries()].sort().forEach(([k, v]) => console.log(`  ${k} ×${v}`));
console.log('\n=== animated property keys ===');
[...propKeys.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
console.log('\n=== transition fields ===');
[...transitionKeys.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
if (oddities.length) {
  console.log('\n=== oddities ===');
  oddities.forEach((o) => console.log('  ' + o));
}
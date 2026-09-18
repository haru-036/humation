import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAvatar, validateManifest } from '@humation/core';
import { manifest, rawManifest } from './index.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('@humation/assets-humation-1', () => {
  test('exports a valid embedded manifest that renders without I/O', () => {
    expect(validateManifest(manifest)).toEqual([]);
    expect(manifest.parts).toHaveLength(86);
    expect(manifest.aliases).toHaveLength(86);

    for (const part of manifest.parts) {
      if (!part.name) throw new Error(`Part is missing a name: ${part.id}`);
    }

    const svg = createAvatar(manifest, {
      selections: { head: 'wavy-long' },
      colors: { skin: '#FFEECC' },
    }).toString();

    expect(svg).toContain('<svg');
    expect(svg).toContain('data-hm-layer-slot="head"');
    expect(svg).toContain('data-hm-part-id="hm1-p-000023"');
    expect(svg).toContain('data-hm-selection-slot="head"');
    expect(svg).toContain('data-hm-source-group-id="head"');
    expect(svg).toContain('data-hm-source-part-id="023"');
    expect(svg).toContain('--hm-skin:#FFEECC');
    expect(svg).toContain('fill="var(--hm-hair, #000000)"');
  });

  test('accessory fills are fixed while outlines follow the stroke slot', () => {
    const fixedGroups = new Set(['item', 'glasses', 'cat']);
    const fixedParts = manifest.parts.filter((part) =>
      fixedGroups.has(part.source?.groupId ?? '')
    );
    expect(fixedParts.length).toBeGreaterThan(0);

    // identity colors are fixed: the only allowed slot reference is stroke
    for (const part of fixedParts) {
      for (const layer of part.layers) {
        for (const match of layer.svg?.matchAll(/var\(--hm-([a-z-]+)/g) ??
          []) {
          if (match[1] !== 'stroke') {
            throw new Error(
              `Accessory ${part.id} binds a non-stroke slot: ${match[1]}`
            );
          }
        }
      }
    }

    // whites stay white even with custom colors; outlines bind to stroke
    // (tank-top body: no fixed-white regions outside the item itself)
    const svg = createAvatar(manifest, {
      selections: { item: 'santa-hat', body: 'tank-top' },
      colors: { skin: 'FFEECC', stroke: 'FF0000' },
    }).toString();
    expect(svg).toContain('fill="#FFFFFF"');
    expect(svg).toContain('fill="var(--hm-stroke');
    expect(svg).not.toContain('fill="white"');
  });

  test('exports raw manifest without embedded SVG strings', () => {
    expect(validateManifest(rawManifest)).toEqual([]);
    expect(rawManifest.parts).toHaveLength(86);
    expect(JSON.stringify(rawManifest)).not.toContain('"svg"');
  });

  test('raw manifest asset paths resolve to package files', () => {
    const paths = rawManifest.parts.flatMap((part) =>
      part.layers.map((layer) => layer.svgPath)
    );

    expect(paths).toHaveLength(86);

    for (const path of paths) {
      if (!path) throw new Error('Missing svgPath');
      expect(existsSync(join(packageRoot, path)), path).toBe(true);
    }
  });
});

const HM_STROKE = 'var(--hm-stroke, #000000)';
const DRAWABLE_TAGS = new Set([
  'path',
  'circle',
  'ellipse',
  'rect',
  'polygon',
  'polyline',
  'line',
  'use',
  'text',
]);
const SKIP_TREE_TAGS = new Set(['defs', 'clippath', 'mask', 'symbol', 'title', 'desc']);

function readAttr(attrs: string, name: string): string | undefined {
  const match = attrs.match(
    new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i')
  );
  return match ? match[2] : undefined;
}

function parseTransformScale(transform: string | undefined): number {
  if (!transform) return 1;
  let scale = 1;
  const fnRe = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  let fn: RegExpExecArray | null;
  while ((fn = fnRe.exec(transform))) {
    const name = fn[1].toLowerCase();
    const nums = fn[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (name === 'scale') {
      const sx = nums[0] ?? 1;
      const sy = nums.length > 1 ? nums[1] : sx;
      scale *= Math.sqrt(Math.abs(sx * sy));
    } else if (name === 'matrix') {
      const [a = 1, b = 0, c = 0, d = 1] = nums;
      scale *= Math.sqrt(Math.abs(a * d - b * c));
    }
  }
  return scale;
}

type OutlineStroke = { tag: string; width: number };

function scanLayerSvg(svg: string): {
  outlines: OutlineStroke[];
  drawable: number;
} {
  const tagRe = /<(\/)?([A-Za-z][\w:-]*)([^>]*?)(\/)?>/g;
  const scaleStack = [1];
  let skipDepth = 0;
  const outlines: OutlineStroke[] = [];
  let drawable = 0;
  let tag: RegExpExecArray | null;
  while ((tag = tagRe.exec(svg))) {
    const closing = Boolean(tag[1]);
    const name = tag[2].toLowerCase();
    const attrs = tag[3] ?? '';
    const selfClosing = Boolean(tag[4]);
    const parentScale = scaleStack[scaleStack.length - 1];
    const ownScale = parseTransformScale(readAttr(attrs, 'transform'));
    const cumulativeScale = parentScale * ownScale;

    if (name === 'g') {
      if (closing) {
        if (scaleStack.length > 1) scaleStack.pop();
      } else if (!selfClosing) {
        scaleStack.push(cumulativeScale);
      }
    }

    if (SKIP_TREE_TAGS.has(name)) {
      if (closing) {
        if (skipDepth > 0) skipDepth--;
      } else if (!selfClosing) {
        skipDepth++;
      }
      continue;
    }

    if (closing || name === 'g' || name === 'svg') continue;
    if (skipDepth > 0) continue;

    if (DRAWABLE_TAGS.has(name)) drawable++;

    if (readAttr(attrs, 'stroke') !== HM_STROKE) continue;
    if (readAttr(attrs, 'fill') === HM_STROKE) continue;
    const rawWidth = readAttr(attrs, 'stroke-width');
    const width = (rawWidth === undefined ? 1 : Number(rawWidth)) * cumulativeScale;
    outlines.push({ tag: name, width });
  }
  return { outlines, drawable };
}

// These parts' outline thickness must be checked visually (target 1.5) when added or changed.
const FILL_OUTLINE_PARTS = [
  'hm1-p-000001', // fluffy-bob
  'hm1-p-000002', // round-bob
  'hm1-p-000003', // short
  'hm1-p-000004', // curly-short
  'hm1-p-000005', // short-bangs
  'hm1-p-000006', // side-swept-short
  'hm1-p-000007', // messy-short
  'hm1-p-000008', // wavy-medium
  'hm1-p-000009', // flipped-long
  'hm1-p-000010', // lob
  'hm1-p-000011', // long-straight
  'hm1-p-000012', // side-swept-lob
  'hm1-p-000013', // blunt-bob
  'hm1-p-000014', // bun
  'hm1-p-000015', // low-side-bun
  'hm1-p-000016', // low-twin-buns
  'hm1-p-000017', // ponytail
  'hm1-p-000018', // low-ponytail
  'hm1-p-000019', // low-twin-tails
  'hm1-p-000020', // braids
  'hm1-p-000021', // blunt-long
  'hm1-p-000022', // side-swept-long
  'hm1-p-000023', // wavy-long
  'hm1-p-000024', // curly-long
  'hm1-p-000025', // cropped-shirt
  'hm1-p-000026', // tank-top
  'hm1-p-000027', // drape-tee
  'hm1-p-000028', // polo
  'hm1-p-000029', // tee
  'hm1-p-000030', // shirt
  'hm1-p-000031', // jacket
  'hm1-p-000032', // hoodie
  'hm1-p-000033', // wide-pants
  'hm1-p-000034', // tapered-pants
  'hm1-p-000035', // culottes
  'hm1-p-000036', // long-skirt
  'hm1-p-000037', // mini-skirt
  'hm1-p-000038', // midi-skirt
  'hm1-p-000039', // flared-skirt
  'hm1-p-000040', // cropped-pants
  'hm1-p-000043', // tuna-sushi
  'hm1-p-000044', // shrimp-sushi
  'hm1-p-000045', // sprout
  'hm1-p-000046', // beer
  'hm1-p-000047', // antennae
  'hm1-p-000048', // bunny-ears
  'hm1-p-000049', // halo
  'hm1-p-000050', // crown
  'hm1-p-000051', // flower
  'hm1-p-000052', // ice-cream
  'hm1-p-000053', // duck
  'hm1-p-000054', // santa-hat
  'hm1-p-000055', // camera
  'hm1-p-000059', // tabby-cat
  'hm1-p-000060', // cream-cat
  'hm1-p-000061', // ginger-cat
  'hm1-p-000062', // white-cat
  'hm1-p-000063', // black-cat
  'hm1-p-000064', // tuxedo-cat
  'hm1-p-000065', // siamese-cat
  'hm1-p-000066', // gray-cat
  'hm1-p-000067', // tabby-tuxedo-cat
  'hm1-p-000068', // calico-cat
  'hm1-p-000069', // brown-tabby-cat
];

describe('asset authoring rules', () => {
  test('no layer SVG uses global CSS that would leak across inlined parts', () => {
    const leaks: string[] = [];
    for (const part of manifest.parts) {
      for (const layer of part.layers) {
        const svg = layer.svg ?? '';
        if (/<style/i.test(svg) || / class=/.test(svg)) {
          leaks.push(
            `${part.id} ${part.name}: <style>/class rules leak across inlined SVGs; use element attributes instead`
          );
        }
      }
    }
    expect(leaks).toEqual([]);
  });

  test('outline strokes have effective width between 1.4 and 1.6', () => {
    const violations: string[] = [];
    for (const part of manifest.parts) {
      for (const layer of part.layers) {
        for (const outline of scanLayerSvg(layer.svg ?? '').outlines) {
          if (outline.width < 1.4 || outline.width > 1.6) {
            violations.push(
              `${part.id} ${part.name}: ${outline.tag} ${outline.width}`
            );
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  test('fill-drawn outline parts match FILL_OUTLINE_PARTS exactly', () => {
    const computed: string[] = [];
    for (const part of manifest.parts) {
      let outlines = 0;
      let drawable = 0;
      for (const layer of part.layers) {
        const scanned = scanLayerSvg(layer.svg ?? '');
        outlines += scanned.outlines.length;
        drawable += scanned.drawable;
      }
      if (drawable > 0 && outlines === 0) computed.push(part.id);
    }

    const expected = new Set(FILL_OUTLINE_PARTS);
    const actual = new Set(computed);
    const missing = [...actual].filter((id) => !expected.has(id));
    const stale = [...expected].filter((id) => !actual.has(id));
    if (missing.length > 0 || stale.length > 0) {
      const names = new Map(manifest.parts.map((part) => [part.id, part.name]));
      const fmt = (ids: string[]) =>
        ids.map((id) => `${id} ${names.get(id) ?? ''}`).join(', ');
      throw new Error(
        [
          missing.length > 0
            ? `add to FILL_OUTLINE_PARTS (fill-drawn outlines, check visually at 1.5): ${fmt(missing)}`
            : '',
          stale.length > 0
            ? `remove stale FILL_OUTLINE_PARTS entries: ${fmt(stale)}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      );
    }
    expect(missing.length + stale.length).toBe(0);
  });
});

/**
 * Decode benchmark for the portrait geometry formats — kept as a regression
 * companion to scripts/portrait/encode.py.
 *
 * It answers two questions:
 *
 *   1. Correctness: does decoding app/_portrait/portrait-geom.json (v2, string
 *      codec) produce exactly the same vertex arrays as decoding the legacy
 *      per-theme JSONs? Prints PASS (the encoder asserts the same on emit;
 *      this is the JS-side proof the renderer's decoder is correct).
 *   2. Speed: JSON.parse + decode of both themes, legacy vs v2. The legacy
 *      path is what used to run inside hydration (~5 ms desktop, worse on
 *      mid-tier mobile); the v2 path runs in a lazy chunk after hydration.
 *
 * Run:  node scripts/portrait/bench.mjs
 *
 * After the old JSONs are deleted at merge time, the comparison degrades to a
 * v2-only benchmark with a note.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const P = (...p) => path.join(ROOT, ...p);

/** Must match encode.py DELTA_BASE and Portrait.tsx CODEC_BASE. */
const CODEC_BASE = 47;

/** Mirrors the old Portrait.tsx decode(): first pair absolute, rest deltas. */
function decodeLegacy(doc) {
  let total = 0;
  for (const line of doc.lines) total += line.length >> 1;
  const rest = new Float32Array(total * 2);
  let v = 0;
  for (const flat of doc.lines) {
    let x = 0;
    let y = 0;
    for (let j = 0; j < flat.length; j += 2) {
      if (j === 0) {
        x = flat[0];
        y = flat[1];
      } else {
        x += flat[j];
        y += flat[j + 1];
      }
      rest[v * 2] = x;
      rest[v * 2 + 1] = y;
      v++;
    }
  }
  return { rest, count: total };
}

/** Mirrors Portrait.tsx decodeTheme(): shared x string + per-theme y strings. */
function decodeV2(doc, theme) {
  const { lines, verts } = doc;
  const count = lines * verts;
  const rest = new Float32Array(count * 2);

  const xs = new Float32Array(verts);
  xs[0] = doc.xStart;
  for (let c = 1; c < verts; c++) {
    xs[c] = xs[c - 1] + doc.xDeltas.charCodeAt(c - 1) - CODEC_BASE;
  }

  const t = doc.themes[theme];
  let v = 0;
  let di = 0;
  for (let r = 0; r < lines; r++) {
    let y = t.yStarts[r];
    for (let c = 0; c < verts - 1; c++) {
      rest[v * 2] = xs[c];
      rest[v * 2 + 1] = y;
      v++;
      y += t.yDeltas.charCodeAt(di++) - CODEC_BASE;
    }
    rest[v * 2] = xs[verts - 1];
    rest[v * 2 + 1] = y;
    v++;
  }
  return { rest, count };
}

/** Median of `runs` timed calls, in ms (after 3 warm-ups). */
function bench(fn, runs = 30) {
  const samples = [];
  for (let i = 0; i < runs + 3; i++) {
    const t0 = performance.now();
    fn();
    const dt = performance.now() - t0;
    if (i >= 3) samples.push(dt);
  }
  samples.sort((a, b) => a - b);
  return samples[samples.length >> 1];
}

const V2_PATH = P("app", "_portrait", "portrait-geom.json");
const LEGACY = ["dark", "light"].map((t) => P("app", "_portrait", `portrait-${t}.json`));

if (!existsSync(V2_PATH)) {
  console.error(`${V2_PATH} missing — run: python3 scripts/portrait/encode.py`);
  process.exit(1);
}

const v2Text = readFileSync(V2_PATH, "utf8");
const v2 = JSON.parse(v2Text);
const v2Decoded = { dark: decodeV2(v2, "dark"), light: decodeV2(v2, "light") };

if (LEGACY.every(existsSync)) {
  const legacyTexts = LEGACY.map((f) => readFileSync(f, "utf8"));
  const legacy = legacyTexts.map((s) => JSON.parse(s));
  const legacyDecoded = legacy.map(decodeLegacy);

  // Correctness: every vertex equal, both themes, exactly.
  let pass = true;
  for (let i = 0; i < 2; i++) {
    const theme = ["dark", "light"][i];
    const a = legacyDecoded[i].rest;
    const b = v2Decoded[theme].rest;
    if (legacyDecoded[i].count !== v2Decoded[theme].count || a.length !== b.length) {
      pass = false;
      break;
    }
    for (let k = 0; k < a.length; k++) {
      if (a[k] !== b[k]) {
        pass = false;
        console.error(`${theme}: first mismatch at float ${k} (${a[k]} vs ${b[k]})`);
        break;
      }
    }
  }
  console.log(pass ? "PASS  v2 decode === legacy decode (both themes, exact)" : "FAIL  decoders disagree");
  if (!pass) process.exit(1);

  const legacyMs = bench(() => {
    // What hydration used to pay: parse both literals, decode both themes.
    const d0 = decodeLegacy(JSON.parse(legacyTexts[0]));
    const d1 = decodeLegacy(JSON.parse(legacyTexts[1]));
    return d0.count + d1.count;
  });
  const legacyPatched = [JSON.parse(legacyTexts[0]), JSON.parse(legacyTexts[1])];
  const legacyDecodeMs = bench(() => {
    return decodeLegacy(legacyPatched[0]).count + decodeLegacy(legacyPatched[1]).count;
  });
  const v2Ms = bench(() => {
    const doc = JSON.parse(v2Text);
    const d0 = decodeV2(doc, "dark");
    const d1 = decodeV2(doc, "light");
    return d0.count + d1.count;
  });
  const v2DecodeMs = bench(() => {
    return decodeV2(v2, "dark").count + decodeV2(v2, "light").count;
  });
  console.log(`legacy  parse+decode both themes: ${legacyMs.toFixed(2)} ms  (decode only: ${legacyDecodeMs.toFixed(2)} ms)`);
  console.log(`v2      parse+decode both themes: ${v2Ms.toFixed(2)} ms  (decode only: ${v2DecodeMs.toFixed(2)} ms)  ×${(legacyMs / v2Ms).toFixed(1)} faster`);
} else {
  console.log("legacy JSONs absent (post-merge) — v2-only benchmark");
  const v2Ms = bench(() => {
    const doc = JSON.parse(v2Text);
    const d0 = decodeV2(doc, "dark");
    const d1 = decodeV2(doc, "light");
    return d0.count + d1.count;
  });
  console.log(`v2      parse+decode both themes: ${v2Ms.toFixed(2)} ms`);
}

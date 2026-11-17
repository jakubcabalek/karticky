/* global __dirname */
// Test data for the Swift port (docs/swiftui-plan.md, section 8).
//
// Runs the existing TypeScript tests with every exported function of the logic
// modules wrapped in a recorder. Each call with plain-data arguments becomes a case
// { module, function, args, result } in swift/KartickyCore/Tests/KartickyCoreTests/Fixtures/cases.json.
// The Swift tests call the same function with the same arguments and compare the result.
//
//   node scripts/swift-fixtures.cjs           writes the fixtures
//   node scripts/swift-fixtures.cjs --check   fails when the committed fixtures are out of date
//
// Encoding (JSON cannot carry everything JavaScript passes around):
//   {"$undefined": true}            an argument or result that is undefined
//   {"$number": "NaN" | "Infinity" | "-Infinity"}
//   {"$bytes": "<base64>", "type": "Uint8Array" | "Uint8ClampedArray" | "ArrayBuffer"}
//   {"$array": [...], "type": "Uint32Array" | "Float64Array" | ...}
// "Now" is fixed: new Date() and Date.now() give NOW below, so default arguments are stable.
const { readFileSync, writeFileSync, mkdirSync, readdirSync } = require('node:fs');
const { join } = require('node:path');

const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'swift/KartickyCore/Tests/KartickyCoreTests/Fixtures');
const OUT = join(OUT_DIR, 'cases.json');
const NOW = '2026-11-14T12:00:00.000Z';
const MAX_CASE_BYTES = 64 * 1024;

// Modules that get ported to KartickyCore. Network, storage and UI stay out.
const PORTED = new Set(['cardData.ts', 'scryfall.ts', 'cardHash.ts', 'scanIdentify.ts', 'liveScan.ts', 'deckText.ts', 'deckStats.ts', 'keywords.ts', 'lifeCounter.ts', 'base64.ts']);
// Random or network: tested separately in Swift, not through recorded cases.
const SKIP = new Set(['rollDie', 'flipCoin', 'pickStartingPlayer', 'searchCards', 'fetchCollection', 'cardById', 'cardBySetNumber', 'allPrintings', 'identifyCard']);

const FIXED = Date.parse(NOW);
const RealDate = Date;
class FixedDate extends RealDate {
  constructor(...args) { if (args.length) super(...args); else super(FIXED); }
  static now() { return FIXED; }
}

const isTyped = value => ArrayBuffer.isView(value) && !(value instanceof DataView);
const typeName = value => Object.prototype.toString.call(value).slice(8, -1);
const encode = (value, seen = new Set()) => {
  if (value === undefined) return { $undefined: true };
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') throw new Error('not data');
  if (typeof value === 'number' && !Number.isFinite(value)) return { $number: String(value) };
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) throw new Error('cycle');
  seen.add(value);
  const type = typeName(value);
  let out;
  if (type === 'ArrayBuffer') out = { $bytes: Buffer.from(value).toString('base64'), type };
  else if (type === 'Uint8Array' || type === 'Uint8ClampedArray') out = { $bytes: Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('base64'), type };
  else if (isTyped(value)) out = { $array: Array.from(value, item => encode(item)), type };
  else if (Array.isArray(value)) out = value.map(item => encode(item, seen));
  else if (type === 'Object') {
    out = {};
    for (const [key, item] of Object.entries(value)) if (item !== undefined) out[key] = encode(item, seen);
  } else throw new Error(`not data: ${type}`);
  seen.delete(value);
  return out;
};

const cases = [];
const seenCases = new Set();
const record = (module, name, fn) => function recorded(...args) {
  let encodedArgs = null;
  try { encodedArgs = SKIP.has(name) ? null : encode(args); } catch { encodedArgs = null; }
  const result = fn.apply(this, args);
  if (!encodedArgs || (result && typeof result.then === 'function')) return result;
  try {
    const entry = JSON.stringify({ module, function: name, args: encodedArgs, result: encode(result) });
    if (entry.length <= MAX_CASE_BYTES && !seenCases.has(entry)) {
      seenCases.add(entry);
      cases.push(JSON.parse(entry));
    }
  } catch { /* result is not plain data */ }
  return result;
};

const loader = require(join(ROOT, 'tests/load.cjs'));
const originalLoad = loader.load;
loader.load = (file, options = {}) => {
  const exports = originalLoad(file, { ...options, globals: { ...(options.globals ?? {}), Date: FixedDate } });
  if (!PORTED.has(file)) return exports;
  const module = file.replace(/\.ts$/, '');
  return new Proxy(exports, {
    get(target, key) {
      const value = target[key];
      return typeof value === 'function' && typeof key === 'string' ? record(module, key, value) : value;
    },
  });
};

process.on('exit', code => {
  if (code !== 0) return;
  const order = (a, b) => a.module.localeCompare(b.module) || a.function.localeCompare(b.function);
  const text = `${JSON.stringify({ now: NOW, cases: cases.slice().sort(order) }, null, 1)}\n`;
  const counts = {};
  for (const c of cases) counts[c.module] = (counts[c.module] ?? 0) + 1;
  if (process.argv.includes('--check')) {
    let current = '';
    try { current = readFileSync(OUT, 'utf8'); } catch { /* missing */ }
    if (current !== text) {
      console.error('Testovací data pro Swift neodpovídají TypeScriptu. Spusť: node scripts/swift-fixtures.cjs');
      process.exitCode = 1;
      return;
    }
    console.log(`Testovací data pro Swift sedí (${cases.length} případů).`);
    return;
  }
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, text);
  console.log(`${cases.length} případů → ${OUT.slice(ROOT.length + 1)}`);
  console.log(Object.entries(counts).map(([m, n]) => `  ${m}: ${n}`).join('\n'));
});

// node:test runs the registered tests after this file finishes loading.
const testsDir = join(ROOT, 'tests');
for (const file of readdirSync(testsDir).filter(name => name.endsWith('.test.cjs')).sort()) require(join(testsDir, file));

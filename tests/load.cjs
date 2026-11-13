/* global __dirname */
// Loads a TypeScript module from the project root without a bundler, so pure
// logic can be tested with `node --test`. Every import must be provided explicitly.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

const load = (file, { env = {}, dependencies = {}, globals = {} } = {}) => {
  const exports = {};
  const source = ts.transpileModule(readFileSync(join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  runInNewContext(source, {
    Intl,
    ...globals,
    exports,
    process: { env },
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
};

// Objects created inside the VM context have a different prototype chain, so
// compare plain JSON copies in assertions.
const plain = value => JSON.parse(JSON.stringify(value));

module.exports = { load, plain };

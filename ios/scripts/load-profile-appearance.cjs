const fs = require('node:fs');
const vm = require('node:vm');
const esbuild = require('esbuild');
const context = { module: { exports: {} } };
vm.runInNewContext(esbuild.transformSync(fs.readFileSync('desktop/client/src/utils/profileAppearance.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code, context);
module.exports = context.module.exports;

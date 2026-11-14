import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const entryFile = path.join(rootDir, 'tests', 'unit.test.ts');
const outFile = path.join(os.tmpdir(), `yuval-studio-unit-tests-${process.pid}.mjs`);

try {
  await esbuild.build({
    entryPoints: [entryFile],
    outfile: outFile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    sourcemap: 'inline',
    logLevel: 'silent',
    banner: {
      js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
    },
  });

  execFileSync(process.execPath, ['--test', outFile], {
    cwd: rootDir,
    stdio: 'inherit',
  });
} finally {
  if (fs.existsSync(outFile)) {
    fs.rmSync(outFile, { force: true });
  }
}

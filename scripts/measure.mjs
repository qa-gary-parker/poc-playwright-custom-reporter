// Runs every scenario, keeps the raw output of each run in results/runs/<run>/, then writes results/summary.json
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import os from 'node:os';

const CORE_RUNS = 5;
const runs = [
  ...Array.from({ length: CORE_RUNS }, (_, i) => ({ name: `core-${i + 1}`, scenario: 'core', args: [] })),
  { name: 'maxfail', scenario: 'core', args: ['--max-failures=1', '--workers=1'] },
  { name: 'smart', scenario: 'smart', args: [] },
  { name: 'smart-maxfail', scenario: 'smart', args: ['--max-failures=1', '--workers=1'] },
];

rmSync('results', { recursive: true, force: true });
for (const run of runs) {
  const dir = join('results/runs', run.name);
  mkdirSync(dir, { recursive: true });
  const started = Date.now();
  const res = spawnSync('npx', ['playwright', 'test', ...run.args], {
    env: { ...process.env, SCENARIO: run.scenario, RUN_DIR: resolve(dir) },
    encoding: 'utf8',
  });
  writeFileSync(join(dir, 'stdout.txt'), res.stdout);
  writeFileSync(join(dir, 'run.json'), JSON.stringify({ ...run, exitCode: res.status, wallMs: Date.now() - started }, null, 2) + '\n');
  console.log(`${run.name}: exit ${res.status}`);
}

// Drop the smart-reporter HTML and history (large, rebuilt by every run); keep its JSON export
for (const name of ['smart', 'smart-maxfail']) {
  for (const f of ['smart-report.html', 'test-history.json', 'test-history.runs']) rmSync(join('results/runs', name, f), { recursive: true, force: true });
}

// The repo is public: replace the local checkout path with "."
for (const name of readdirSync('results/runs')) {
  for (const f of readdirSync(join('results/runs', name))) {
    const path = join('results/runs', name, f);
    writeFileSync(path, readFileSync(path, 'utf8').replaceAll(process.cwd(), '.'));
  }
}

const pkg = (name) => JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8')).version;
writeFileSync('results/env.json', JSON.stringify({
  date: new Date().toISOString(),
  node: process.version,
  playwright: pkg('@playwright/test'),
  smartReporter: pkg('playwright-smart-reporter'),
  os: `${os.type()} ${os.release()} ${os.arch()}`,
  cpus: os.cpus().length,
}, null, 2) + '\n');

execFileSync('node', ['scripts/summarize.mjs'], { stdio: 'inherit' });

// Builds results/summary.json from the raw files in results/runs/
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const count = (items, pick) => items.reduce((acc, item) => ((acc[pick(item)] = (acc[pick(item)] ?? 0) + 1), acc), {});

function probe(name) {
  const { workers, status, tests, events } = read(`results/runs/${name}/events.json`);
  const ends = events.filter((e) => e.hook === 'onTestEnd');
  return {
    workers,
    status,
    testsInSuite: tests.length,
    outcomes: count(tests, (t) => t.outcome),
    testsWithNoAttempt: tests.filter((t) => t.attempts === 0).map((t) => t.title),
    hookCalls: count(events, (e) => e.hook),
    onTestEndByStatus: count(ends, (e) => e.status),
    naiveFailureCount: ends.filter((e) => e.status === 'failed' || e.status === 'timedOut').length,
    testsReachingOnTestEnd: new Set(ends.map((e) => e.title)).size,
    onTestEndOrder: ends.map((e) => `${e.title}#${e.retry}`),
    async: read(`results/runs/${name}/async.json`),
    run: read(`results/runs/${name}/run.json`),
  };
}

function smart(name) {
  const data = read(`results/runs/${name}/smart-report-data.json`);
  return {
    summary: data.summary,
    testsListed: data.tests.length,
    statuses: count(data.tests, (t) => t.status),
    failureClusters: data.failureClusters.length,
    run: read(`results/runs/${name}/run.json`),
  };
}

const coreNames = readdirSync('results/runs').filter((n) => n.startsWith('core-')).sort();
const core = Object.fromEntries(coreNames.map((n) => [n, probe(n)]));
const orders = new Set(coreNames.map((n) => core[n].onTestEndOrder.join('|')));
const asyncLost = coreNames.map((n) => core[n].async.onTestEndCalls - core[n].async.finishedAtOnExit);

const summary = {
  core,
  coreAcrossRuns: {
    runs: coreNames.length,
    distinctOnTestEndOrders: orders.size,
    naiveFailureCounts: coreNames.map((n) => core[n].naiveFailureCount),
    asyncUnfinishedAtOnExit: asyncLost,
  },
  maxfail: probe('maxfail'),
  smart: smart('smart'),
  smartMaxfail: smart('smart-maxfail'),
};
writeFileSync('results/summary.json', JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ ...summary.coreAcrossRuns, maxfail: { testsReachingOnTestEnd: summary.maxfail.testsReachingOnTestEnd, outcomes: summary.maxfail.outcomes, noAttempt: summary.maxfail.testsWithNoAttempt.length }, smart: summary.smart.summary, smartMaxfail: summary.smartMaxfail.summary }, null, 2));

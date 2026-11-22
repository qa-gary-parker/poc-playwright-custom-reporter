# poc-playwright-custom-reporter

A minimal custom Playwright reporter, three reporter API traps measured on a seeded suite, and the same suite run through `playwright-smart-reporter`.

## Results

Suite: 13 tests in `tests/cart.spec.ts`. 8 pass, 2 always fail, 2 fail on the first attempt and pass on retry, 1 is skipped. `retries: 2`, `workers: 4`, `fullyParallel: true`. 5 runs.

- One run makes 19 `onTestEnd` calls for 13 tests: one call per attempt. 8 of the 19 calls have `status: 'failed'` (3 attempts for each of the 2 failing tests, 1 for each of the 2 flaky tests).
- A reporter that counts failed `onTestEnd` results reports 8 failures. `test.outcome()` in `onEnd` reports 2 failed, 2 flaky, 8 passed, 1 skipped. Same counts in 5 of 5 runs.
- The order of the 19 `onTestEnd` calls was different in each of the 5 runs (5 distinct orders).
- Playwright does not wait for an async `onTestEnd`. With a 200 ms async step in `onTestEnd`, 18 of 19 steps had finished when `onEnd` ran, and still 18 of 19 when `onExit` ran. Same in 5 of 5 runs. The Playwright 1.65.1 reporter types declare `onTestEnd` as returning `void`, and `onEnd` and `onExit` as returning a Promise.
- With `--max-failures=1 --workers=1`, 9 of the 13 tests reached `onTestEnd` (11 calls: 8 passes and 3 attempts of the first failing test). The other 4 tests got no `onTestBegin` or `onTestEnd` call. `test.outcome()` reports all 4 as `skipped`, so the run shows 4 skipped tests where the suite has 1. Playwright also made 1 `onError` call in that run.
- Other hooks per run of 13 tests: `onBegin` 1, `onTestBegin` 19, `onStepBegin` 255, `onStepEnd` 255, `onStdOut` 1 (one `console.log` in a test), `onEnd` 1.

`playwright-smart-reporter` 4.0.1 on the same suite (1 run each, JSON export):

- Default run: total 13, failed 2, flaky 2, skipped 1, passed 10 (the 2 flaky tests count as passed), pass rate 83, 2 failure clusters (one per failing test).
- `--max-failures=1 --workers=1` run: total 13, failed 1, skipped 4, passed 8, pass rate 89. Like `test.outcome()`, it counts the 4 tests that never started as skipped.

Limits: one seeded suite of 13 tests on one machine. The async result depends on the 200 ms delay and on how long the last tests take; a longer async step can leave more calls unfinished. The `onTestEnd` order depends on worker scheduling.

## Files

- `reporters/minimal-reporter.ts`: the reporter the guide builds. 26 lines. Prints one line per attempt, then a summary from `test.outcome()`.
- `reporters/probe-reporter.ts`: records every hook call to `events.json`.
- `reporters/async-reporter.ts`: an async `onTestEnd` with a 200 ms step; writes `async.json` from `onExit`.
- `playwright.config.ts`: picks the reporters from `SCENARIO` (`minimal`, `core`, `smart`).
- `scripts/measure.mjs`: runs 5 `core` runs, 1 `core` run with `--max-failures=1 --workers=1`, and the 2 `smart` runs. Raw output per run in `results/runs/<run>/`. Local paths in the raw files are replaced with `.`. The smart-reporter HTML report and history are not kept.
- `scripts/summarize.mjs`: builds `results/summary.json` from the raw files.
- `results/env.json`: Node, Playwright and smart-reporter versions, OS and CPU count of the measured run.

## Method

- Tools: Playwright 1.65.1 (Chromium), playwright-smart-reporter 4.0.1, Node v24.14.1, macOS (Darwin 24.6.0, arm64), as recorded in `results/env.json`.
- "Naive failure count" = `onTestEnd` calls with `status` `failed` or `timedOut`.
- "Finished" in the async test = the 200 ms step returned and incremented a counter. The counter is read in `onEnd` and in `onExit`.

## Run it again

```bash
npm ci
npx playwright install chromium
npm test            # the minimal reporter alone
npm run measure     # all scenarios; rewrites results/
```

Every run exits with code 1, because 2 tests always fail.

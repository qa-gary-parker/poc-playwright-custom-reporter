import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

// An async onTestEnd that stands in for an upload or a file write taking DELAY_MS.
// It counts how many of those finished by the time onEnd and onExit run. Result in $RUN_DIR/async.json.
const DELAY_MS = 200;

export default class AsyncReporter implements Reporter {
  private started = 0;
  private finished = 0;
  private atOnEnd = 0;

  async onTestEnd(test: TestCase, result: TestResult) {
    this.started++;
    await sleep(DELAY_MS);
    this.finished++;
  }

  async onEnd() {
    this.atOnEnd = this.finished;
  }

  async onExit() {
    writeFileSync(join(process.env.RUN_DIR!, 'async.json'), JSON.stringify({ delayMs: DELAY_MS, onTestEndCalls: this.started, finishedAtOnEnd: this.atOnEnd, finishedAtOnExit: this.finished }, null, 2) + '\n');
  }

  printsToStdio() {
    return false;
  }
}

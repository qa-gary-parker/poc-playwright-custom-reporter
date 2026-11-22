import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestError, TestResult, TestStep } from '@playwright/test/reporter';

// Records every reporter hook call in order, plus the final outcome of each test, to $RUN_DIR/events.json
type Event = { hook: string; title?: string; retry?: number; status?: string; workerIndex?: number; category?: string };

export default class ProbeReporter implements Reporter {
  private events: Event[] = [];
  private suite!: Suite;
  private workers = 0;

  onBegin(config: FullConfig, suite: Suite) {
    this.suite = suite;
    this.workers = config.workers;
    this.events.push({ hook: 'onBegin' });
  }

  onTestBegin(test: TestCase, result: TestResult) {
    this.events.push({ hook: 'onTestBegin', title: test.title, retry: result.retry, workerIndex: result.workerIndex });
  }

  onStepBegin(test: TestCase, result: TestResult, step: TestStep) {
    this.events.push({ hook: 'onStepBegin', title: test.title, retry: result.retry, category: step.category });
  }

  onStepEnd(test: TestCase, result: TestResult, step: TestStep) {
    this.events.push({ hook: 'onStepEnd', title: test.title, retry: result.retry, category: step.category });
  }

  onStdOut(chunk: string | Buffer, test?: TestCase) {
    this.events.push({ hook: 'onStdOut', title: test?.title });
  }

  onStdErr(chunk: string | Buffer, test?: TestCase) {
    this.events.push({ hook: 'onStdErr', title: test?.title });
  }

  onError(error: TestError) {
    this.events.push({ hook: 'onError' });
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.events.push({ hook: 'onTestEnd', title: test.title, retry: result.retry, status: result.status, workerIndex: result.workerIndex });
  }

  async onEnd(result: FullResult) {
    this.events.push({ hook: 'onEnd', status: result.status });
    const tests = this.suite.allTests().map((t) => ({ title: t.title, outcome: t.outcome(), attempts: t.results.length }));
    writeFileSync(join(process.env.RUN_DIR!, 'events.json'), JSON.stringify({ workers: this.workers, status: result.status, tests, events: this.events }, null, 2) + '\n');
  }

  printsToStdio() {
    return false;
  }
}

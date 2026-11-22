import type { FullConfig, Reporter, Suite, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

export default class MinimalReporter implements Reporter {
  private suite!: Suite;

  onBegin(config: FullConfig, suite: Suite) {
    this.suite = suite;
    console.log(`Running ${suite.allTests().length} tests with ${config.workers} workers`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const attempt = result.retry ? ` (retry ${result.retry})` : '';
    console.log(`${result.status.padEnd(8)} ${test.title}${attempt}`);
  }

  onEnd(result: FullResult) {
    // test.outcome() looks at every attempt of a test, so each test counts once
    const counts = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 };
    for (const test of this.suite.allTests()) counts[test.outcome()]++;
    console.log(`passed ${counts.expected}, failed ${counts.unexpected}, flaky ${counts.flaky}, skipped ${counts.skipped}: ${result.status}`);
  }

  printsToStdio() {
    return true;
  }
}

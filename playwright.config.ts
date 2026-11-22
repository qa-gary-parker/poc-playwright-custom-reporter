import { defineConfig } from '@playwright/test';
import type { ReporterDescription } from '@playwright/test';

// scripts/measure.mjs sets SCENARIO and RUN_DIR; `npm test` uses the minimal reporter alone
const runDir = process.env.RUN_DIR ?? '.';
const reporters: Record<string, ReporterDescription[]> = {
  minimal: [['./reporters/minimal-reporter.ts']],
  core: [['./reporters/minimal-reporter.ts'], ['./reporters/probe-reporter.ts'], ['./reporters/async-reporter.ts']],
  smart: [
    ['./reporters/minimal-reporter.ts'],
    ['playwright-smart-reporter', {
      outputFile: `${runDir}/smart-report.html`,
      historyFile: `${runDir}/test-history.json`,
      exportJson: true,
      enableAIRecommendations: false,
    }],
  ],
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 2,
  workers: 4,
  reporter: reporters[process.env.SCENARIO ?? 'minimal'],
  use: { browserName: 'chromium' },
});

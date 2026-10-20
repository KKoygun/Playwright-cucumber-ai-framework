const parallel = process.env.CI ? 4 : 1;

// CI shards set REPORT_SUFFIX so each shard writes its own report file for the merge job
const report = `reports/cucumber-report${process.env.REPORT_SUFFIX ? '-' + process.env.REPORT_SUFFIX : ''}`;

const common = {
  require: [
    'src/support/world.ts',
    'src/support/hooks.ts',
    'src/steps/**/*.ts',
  ],
  requireModule: ['ts-node/register'],
  paths: ['src/features/**/*.feature'],
  parallel,
  format: [
    'progress-bar',
    `json:${report}.json`,
    `html:${report}.html`,
    'allure-cucumberjs/reporter',
  ],
  formatOptions: {
    snippetInterface: 'async-await',
    allureResultsDir: 'allure-results',
  },
};

module.exports = {
  // Full suite — run everything
  default: common,

  // Fast feedback — smoke tests only (@smoke tag)
  smoke: {
    ...common,
    tags: '@smoke',
  },

  // Deep validation — regression tests only (@regression tag)
  regression: {
    ...common,
    tags: '@regression',
  },

  // Rewrites a11y/baseline.json with the violations found now (npm run a11y:baseline)
  a11yBaseline: {
    ...common,
    tags: '@a11y',
    parallel: 1,
    worldParameters: { updateA11yBaseline: true },
  },
};

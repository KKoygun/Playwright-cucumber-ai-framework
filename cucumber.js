const parallel = process.env.CI ? 4 : 1;

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
    'json:reports/cucumber-report.json',
    'html:reports/cucumber-report.html',
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
};

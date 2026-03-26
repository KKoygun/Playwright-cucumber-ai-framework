const parallel = process.env.CI ? 4 : 1;

module.exports = {
  default: {
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
    ],
    formatOptions: { snippetInterface: 'async-await' },
  },
};

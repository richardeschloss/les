export default {
  serial: true,
  ignoredByWatcher: ['.ssl', 'server/locales'],
  files: [
    'test/cli.js',
    // 'test/koa.js'
    // 'test/utils.js'
    // 'test/language.js'
    /* Run Last */
    'test/run.js'
  ],
  tap: false,
  verbose: true
}

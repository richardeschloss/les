export default {
  // require: ['@babel/register'],
  serial: true,
  ignoredByWatcher: ['.ssl', 'locales'],
  files: [
    // 'test/cli.js',
    // 'test/les.js'
    // 'test/server.js'
    'test/utils.js'
  ],
  tap: false,
  verbose: true
}

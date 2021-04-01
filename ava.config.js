export default {
  // require: ['@babel/register'],
  serial: true,
  ignoredByWatcher: ['.ssl', 'locales'],
  files: [
    // 'test/cli.js',
    // 'test/les.js',
    'test/server.js'
  ],
  tap: false,
  verbose: true
}

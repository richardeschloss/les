export default {
  require: ['@babel/register'],
  serial: true,
  ignoredByWatcher: ['.ssl', 'locales'],
  files: [
    'test/specs/les.js',
    'test/specs/server.js'
  ],
  tap: false,
  verbose: true
}

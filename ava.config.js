export default {
  require: ['@babel/register'],
  sources: ['**/*.{js}'],
  files: ['test/server.js'],
  babel: {
    testOptions: {
      plugins: [
        [
          'module-resolver',
          {
            root: ['.'],
            alias: {
              '@': '.',
              '~': '.'
            }
          }
        ]
      ]
    }
  },
  tap: true,
  verbose: true
}

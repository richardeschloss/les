import baseConfig from './ava.config.js'

export default {
  ...baseConfig,
  serial: true,
  files: ['test/specs/server.js', 'test/specs/les.js']
}

import baseConfig from './ava.config.js'

export default {
  ...baseConfig,
  serial: true,
  files: ['test/specs/les.js', 'test/specs/server.js']
}

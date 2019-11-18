import test from 'ava'
import { Server } from '../server'

test('Server Start (defaults)', async (t) => {
  const defaults = {
    proto: 'http',
    host: 'localhost',
    port: 8080
  }
  const s = Server({})
  return new Promise((resolve) => {
    s.start({
      notify: ({ evt, data }) => {
        const { server, ...serverCfg } = data
        t.truthy(server)
        t.is(evt, 'serverListening')
        Object.entries(serverCfg).forEach(([key, val]) => {
          t.is(val, defaults[key])
        })

        resolve()
      }
    })
  })
})

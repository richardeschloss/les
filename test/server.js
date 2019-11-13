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
        t.is(evt, 'serverListening')
        Object.keys(data).forEach((key) => {
          t.is(data[key], defaults[key])
        })

        resolve()
      }
    })
  })
})

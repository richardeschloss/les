import { readFileSync } from 'fs'
import http from 'http'
import https from 'https'
import http2 from 'http2'
import Koa from 'koa'
import { resolve as pResolve } from 'path'
import { findFreePort } from './utils'

const app = new Koa()

const protos = {
  http,
  https,
  http2
}

function Server({
  host = 'localhost',
  port = 8080,
  proto = 'http',
  portRange,
  sslKey,
  sslCert
}) {
  const _host = host
  const _port = port
  const _proto = protos[proto] || http
  let _server

  return Object.freeze({
    build() {
      const serverOpts = {}
      if (['https', 'http2'].includes(proto)) {
        try {
          serverOpts.key = readFileSync(pResolve(sslKey))
          serverOpts.cert = readFileSync(pResolve(sslCert))
          serverOpts.ca = [serverOpts.cert]
        } catch (err) {
          console.log('[les:server] error reading ssl cert')
        }
      }
      const createFn = proto === 'http2' ? 'createSecureServer' : 'createServer'
      _server = _proto[createFn](serverOpts, app.callback())
    },
    listen({ host = _host, port = _port, notify }) {
      const ctx = this
      function onError(err) {
        const errMap = {
          EADDRINUSE: async () => {
            let range
            if (!portRange) {
              range = [port - 500, port + 500]
            } else {
              range = portRange
            }
            const freePort = await findFreePort({ range })
            console.info(
              `Port ${port} in use, using free port instead ${freePort}`
            )
            if (notify) {
              notify({
                evt: 'EADDRINUSE',
                data: { proto, host, port, assignedPort: freePort }
              })
            }
            _server
              .removeListener('error', onError)
              .removeListener('listening', onSuccess)
            ctx.listen({ port: freePort })
          }
        }
        if (errMap[err.code]) {
          errMap[err.code]()
        } else {
          console.error(err)
        }
      }
      function onSuccess() {
        const assignedPort = _server.address().port
        console.log(
          `listening at: (proto = ${proto}, host = ${host}, port = ${assignedPort})`
        )
        if (notify) {
          notify({
            evt: 'serverListening',
            data: { proto, host, port: assignedPort, server: _server }
          })
        }
      }

      _server
        .listen(port, host)
        .on('error', onError)
        .on('listening', onSuccess)
    },
    start({ notify }) {
      this.build()
      this.listen({ notify })
    }
  })
}

export { app, Server }

import { readFileSync } from 'fs'
import http from 'http'
import https from 'https'
import http2 from 'http2'
import Koa from 'koa'
import { resolve as pResolve } from 'path'

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
  sslKey,
  sslCert
}) {
  let _host = host
  let _port = port
  let _proto = protos[proto] || http
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
    listen({ host = _host, port = _port }) {
      _server.listen(port, host)
      console.log(
        `listening at: (proto = ${proto}, host = ${host}, port = ${port})`
      )
    },
    start() {
      this.build()
      this.listen({})
    }
  })
}

export { app, Server }

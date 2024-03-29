import { readFileSync } from 'fs'
import http from 'http'
import https from 'https'
import http2 from 'http2'
import Koa from 'koa'
import { resolve as pResolve } from 'path'
import { NetUtils } from 'les-utils'

const app = new Koa()

const protos = {
  http,
  https,
  http2
}

/** @type {import('./koa').Server} */
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
  let _protoStr = 'http'
  if (Object.keys(protos).includes(proto)) {
    _protoStr = proto
  }

  return Object.freeze({
    build() {
      const serverOpts = {}
      if (['https', 'http2'].includes(proto)) {
        try {
          serverOpts.key = readFileSync(pResolve(sslKey))
          serverOpts.cert = readFileSync(pResolve(sslCert))
          serverOpts.ca = [serverOpts.cert]
        } catch (err) {
          throw new Error('[les:server] error reading ssl cert')
        }
      }
      const createFn = proto === 'http2' ? 'createSecureServer' : 'createServer'
      _server = _proto[createFn](serverOpts, app.callback())
    },
    listen({ host = _host, port = _port }) {
      return new Promise((resolve, reject) => {
        /** @param {any} err */
        function onError(err) {
          _server
            .removeListener('error', onError)
            .removeListener('listening', onSuccess)

          reject({
            err,
            data: { proto, host, port }
          })
        }

        function onSuccess() {
          const assignedPort = _server.address().port
          console.log(
            `listening at: (proto = ${_protoStr}, host = ${host}, port = ${assignedPort})`
          )

          resolve({
            evt: 'serverListening',
            data: {
              proto: _protoStr,
              host,
              port: assignedPort,
              server: _server
            }
          })
        }

        _server
          .listen(port, host)
          .on('error', onError)
          .on('listening', onSuccess)
      })
    },
    async start() {
      this.build()
      return this.listen({}).catch(({ err, data }) => {
        const { port } = data
        const errMap = {
          EADDRINUSE: async () => {
            let range
            if (!portRange) {
              range = [port - 500, port + 500]
            } else {
              range = portRange
            }
            const freePort = await NetUtils.findFreePort({ range })
            console.info(
              `Port ${port} in use, using free port instead ${freePort}`
            )
            return this.listen({ port: freePort })
          }
        }
        if (errMap[err.code]) {
          return errMap[err.code]()
        } else {
          throw err
        }
      })
    },
    stop() {
      return new Promise((resolve) => {
        if (!_server) {
          resolve()
        }
        const { port } = _server.address()
        _server.close(() => {
          resolve({
            evt: 'serverStopped',
            data: {
              proto: _protoStr,
              host,
              port
            }
          })
        })
      })
    }
  })
}

export { app, Server }

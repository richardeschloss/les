import http from 'http'
import Koa from 'koa'

const app = new Koa()

const protos = {
  http
}

function Server({ host = 'localhost', port = 8080, proto = 'http' }) {
  let _host = host
  let _port = port
  let _proto = protos[proto]
  let _server

  return Object.freeze({
    build() {
      _server = _proto.createServer(app.callback())
    },
    listen({ host = _host, port = _port }) {
      _server.listen(port, host)
      console.log('listening on', port)
    },
    start() {
      this.build()
      this.listen({})
    }
  })
}

export { app, Server }

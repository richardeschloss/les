import http from 'http'
import Koa from 'koa'

const app = new Koa()

function Server({ host = 'localhost', port = 3000 }) {
  let _host = host
  let _port = port
  let _server

  return Object.freeze({
    build() {
      _server = http.createServer(app.callback())
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

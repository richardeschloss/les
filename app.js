import serve from 'koa-static'
import { resolve as pResolve } from 'path'
import { app, Server } from './server'
import { IOServer } from './io'
import { attachSSL, loadServerConfigs } from './utils'

const cwd = process.cwd()

/* Load config from .lesrc (if it exists) */
const cfgs = loadServerConfigs()
attachSSL(cfgs)

/* Use middleware (as-needed) */
const fndStaticDir = cfgs.find(({ staticDir }) => staticDir)
const staticDir = fndStaticDir || 'public'
app.use(serve(pResolve(cwd, staticDir)))

/* Connect to DB */
// db.connect({})

/* Finally, start server */
cfgs.forEach((cfg) => {
  const evtMap = {
    serverListening(data) {
      const { proto, host, port } = data
      console.log('serverListening', { proto, host, port })

      /* Start IO server */
      const ioServer = IOServer(data)
      ioServer.start()
    }
  }

  const server = Server(cfg)
  server.start({
    notify: ({ evt, data }) => {
      if (evtMap[evt]) {
        evtMap[evt](data)
      }
    }
  })
})

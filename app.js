import { app, Server } from './server'
import { IOServer } from './io'
import { loadServerConfigs } from './utils'

/* Load config from .lesrc (if it exists) */
const cfgs = loadServerConfigs()

/* Use middleware (as-needed) */
// app.use(...)

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

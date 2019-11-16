import { app, Server } from './server'
import { IOServer } from './io'

/* Load config from .lesrc (if it exists) */

/* Use middleware (as-needed) */
// app.use(...)

/* Connect to DB */
// db.connect({})

/* Finally, start server */
const server = Server({})
server.start({
  notify: ({evt, data}) => {
    const { proto, host, port } = data
    console.log(evt, { proto, host, port })

    /* Start IO server */
    const ioServer = IOServer(data)
    ioServer.start()
  }
})

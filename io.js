import http from 'http' // Prod should use https
import { readdirSync, watch } from 'fs'
import socketIO from 'socket.io'

function IOServer({ host, port, server = http.createServer() }) {
  function registerIO(io) {
    const ioChannels = readdirSync('./channels').map((f) =>
      f.replace('.js', '')
    )

    ioChannels.forEach((channel) => {
      io.of(`/${channel}`).on('connection', async (socket) => {
        console.info('socket.io client connected to', channel)
        const Svc = await import(`./channels/${channel}`)
        const svc = Svc()
        Object.entries(svc).forEach(([evt, fn]) => {
          if (typeof fn === 'function') {
            socket.on(evt, (msg, cb) => {
              const { notifyEvt = 'progress' } = msg
              fn({
                notify: (data) => {
                  socket.emit(notifyEvt, data)
                },
                ...msg
              }).then(cb)
            })
          }
        })
      })
    })
  }

  function listen() {
    return new Promise((resolve) => {
      server.listen(port, host, resolve)
    })
  }

  async function start() {
    console.info('starting IO server...', host, port, server.listening)
    if (!server.listening) {
      console.info('IO server not listening...will fix that...')
      await listen()
    }
    const io = socketIO(server)
    registerIO(io)
    return io
  }

  function watchDir(dir = '.') {
    console.log('watching', dir)
    const io = socketIO(server)
    io.on('connection', (socket) => {
      const watcher = watch(dir, (evt, fname) => {
        socket.emit('fileChanged')
      })
      socket.on('disconnect', () => {
        watcher.close()
      })
    })
  }

  return Object.freeze({
    registerIO,
    start,
    watchDir
  })
}

export { IOServer }

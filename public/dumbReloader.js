/* eslint-disable no-undef */
// @ts-nocheck

(function (io) {
  'use strict'
  io = io && io.default !== undefined ? io['default'] : io

  const socket = io()
  function registerIO() {
  console.log('connected!')
    const evts = {
      fileChanged() {
        document.location.reload()
      }
    }
    
    Object.entries(evts).forEach(([evt, cb]) => {
      socket.on(evt, cb)
    })
  }

  socket.on('connect', registerIO)

}(io)) // IO globally defined

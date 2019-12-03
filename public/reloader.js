const socket = io.connect()
socket.on('fileChanged', () => {
  document.location.reload()
})

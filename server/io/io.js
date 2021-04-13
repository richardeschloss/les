function Svc() {
  function getMessage(msg) {
    return new Promise((resolve) => {
      resolve('It worked! Received msg: ' + JSON.stringify(msg))
    })
  }

  return Object.freeze({
    getMessage
  })
}

export { Svc }

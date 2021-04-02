import IBM from './language/ibm.js'
// import Yandex from './language/yandex.js'

const rexters = {
  IBM
  // Yandex
}

/** @type {import('./language').LangUtils } */
function LangUtils(api = 'IBM') {
  if (!rexters[api]) {
    throw new Error(`svc ${api} not implemented`)
  }

  const out = rexters[api]()
  /* Custom extensions could go here */
  return out
}

export default LangUtils
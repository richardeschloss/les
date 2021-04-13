import IBM from './language/ibm.js'

const rexters = {
  IBM
}

/** @type {import('./language').LangUtils } */
function LangUtils(api = 'IBM') {
  if (!rexters[api]) {
    throw new Error(`svc ${api} not implemented`)
  }

  return rexters[api]()
}

export default LangUtils
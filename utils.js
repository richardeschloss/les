import { existsSync, readFileSync } from 'fs'
import { resolve as pResolve } from 'path'
import netstat from 'node-netstat'

const netstatP = (opts) =>
  new Promise((resolve, reject) => {
    const res = []
    netstat(
      {
        ...opts,
        done: (err) => {
          if (err) return reject(err)
          return resolve(res)
        }
      },
      (data) => res.push(data)
    )
    return res
  })

async function findFreePort({ range = [8000, 9000] }) {
  const usedPorts = (await netstatP({ filter: { protocol: 'tcp' } })).map(
    ({ local }) => local.port
  )

  const [startPort, endPort] = range
  let freePort
  for (let port = startPort; port <= endPort; port++) {
    if (!usedPorts.includes(port)) {
      freePort = port
      break
    }
  }
  return freePort
}

async function portTaken({ port }) {
  const usedPorts = (await netstatP({ filter: { protocol: 'tcp' } })).map(
    ({ local }) => local.port
  )
  return usedPorts.includes(port)
}

function loadServerConfigs() {
  const cwd = process.cwd()
  const config = pResolve(cwd, '.lesrc')
  const sslPair = {}
  let localCfg = [{}]
  if (existsSync(config)) {
    try {
      localCfg = JSON.parse(readFileSync(config))
      const sslFound = localCfg.find(({ sslKey, sslCert }) => sslKey && sslCert)
      if (sslFound) {
        const { sslKey, sslCert } = sslFound
        Object.assign(sslPair, { sslKey, sslCert })
      }
    } catch (err) {
      console.log(
        'Error parsing .lesrc JSON. Is it formatted as JSON correctly?',
        err
      )
    }
  } else {
    console.info('.lesrc does not exist. Using CLI only')
  }
  return localCfg
}

export { findFreePort, portTaken, loadServerConfigs }

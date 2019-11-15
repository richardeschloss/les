/*
 * les - CLI for lightweight koa server
 * Copyright 2019 Richard Schloss (https://github.com/richardeschloss)
 */

import minimist from 'minimist'
import fs from 'fs'
import serve from 'koa-static'
import path from 'path'
import { app, Server } from './server'

const argv = minimist(process.argv.slice(2))
const cwd = process.cwd()
const config = path.resolve(cwd, '.lesrc')

const options = {
  init: {
    alias: 'i',
    desc: `Init lesky in current working directory [(${cwd})]`
  },
  host: {
    alias: 'a',
    desc: 'Address to use',
    dflt: 'localhost'
  },
  port: {
    alias: 'p',
    desc: 'Port to use',
    dflt: 8080
  },
  proto: {
    desc: 'Protocol to use',
    dflt: 'http',
    limitTo: '{ http, https, http2, http2s }'
  },
  range: {
    desc: 'Port Range (in case port is taken)',
    dflt: [8000, 9000]
  },
  sslKey: {
    desc: 'Path to SSL Key'
  },
  sslCert: {
    desc: 'Path to SSL Certificate'
  }
}

const buildUsage = () => {
  const usage = ['usage: les [path] [options]', '', 'options:']
  Object.entries(options).forEach(
    ([option, { alias = '', desc = '', dflt, limitTo }]) => {
      if (alias !== '') {
        alias = `-${alias},`
      }

      if (dflt) {
        desc = `${desc} [${dflt}]`
      }

      if (limitTo) {
        desc = `${desc} (${limitTo})`
      }
      const optStr = ['', alias, `--${option}`, desc]

      usage.push(optStr.join('\t'))
    }
  )
  return usage.join('\n')
}

const usage = buildUsage()

function CLI(cfg) {
  function buildCliCfg() {
    const cliCfg = {}
    Object.entries(options).forEach(([option, { alias }]) => {
      const optionVal = cfg[option] || cfg[alias]
      if (optionVal) {
        cliCfg[option] = optionVal
      }
    })
    cliCfg.staticDir = cfg['_'][0] || 'public'
    if (cliCfg.range && typeof cliCfg.range === 'string') {
      if (cliCfg.range.match(/[0-9]+-[0-9]+/)) {
        cliCfg.portRange = cliCfg.range.split('-')
      } else {
        console.log(
          'port range incorrectly formatted. Format as --range=start-end'
        )
      }
    }

    return cliCfg
  }

  function run() {
    const cliCfg = buildCliCfg()
    let localCfg = []
    try {
      if (fs.existsSync(config)) {
        localCfg = JSON.parse(fs.readFileSync(config))
      }
    } catch (err) {
      console.log(err)
    }

    let fndCfgIdx = localCfg.findIndex(({ proto }) => proto === cliCfg.proto)
    if (fndCfgIdx === -1) {
      fndCfgIdx = 0
    }

    const { sslKey, sslCert } = localCfg.find(
      ({ sslKey, sslCert }) => sslKey && sslCert
    )
    const fndSSL = { sslKey, sslCert }

    Object.assign(localCfg[fndCfgIdx], cliCfg)
    app.use(serve(path.resolve(cwd, cliCfg.staticDir)))
    localCfg.forEach((serverCfg, idx) => {
      if (!serverCfg.port) {
        serverCfg.port = localCfg[fndCfgIdx].port || options.port.dflt
        if (idx !== fndCfgIdx) {
          serverCfg.port += idx - fndCfgIdx
        }
      }

      Object.entries(fndSSL).forEach(([k, v]) => {
        if (!serverCfg[k]) {
          serverCfg[k] = v
        }
      })

      const server = Server(serverCfg)
      server.start({})
    })
  }

  return Object.freeze({
    help() {
      console.log(usage)
    },
    init() {
      console.log('[les] init project')
      // If other args are provided, init .lesrc with those
    },
    run
  })
}

const cli = CLI(argv)
if (argv.h || argv.help) {
  cli.help()
} else if (argv.i || argv.init) {
  cli.init()
} else {
  cli.run()
}

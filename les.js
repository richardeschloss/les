/*
 * les - CLI for lightweight koa server
 * Copyright 2019 Richard Schloss (https://github.com/richardeschloss)
 */

import minimist from 'minimist'
import serve from 'koa-static'
import path from 'path'
import { app, Server } from './server'
import { attachSSL, loadServerConfigs } from './utils'

const argv = minimist(process.argv.slice(2))
const cwd = process.cwd()

const options = {
  help: {
    alias: 'h',
    desc: 'Print this help menu'
  },
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

  function init(cliCfg) {
    console.log('init', cliCfg)
  }

  function run() {
    const cliCfg = buildCliCfg()
    if (cliCfg.help) {
      console.log(usage)
      return
    } else if (cliCfg.init) {
      init(cliCfg)
      return
    }
    const localCfg = loadServerConfigs()
    attachSSL(localCfg)

    let fndCfgIdx = localCfg.findIndex(({ proto }) => proto === cliCfg.proto)
    if (fndCfgIdx === -1) {
      fndCfgIdx = 0
    }

    Object.assign(localCfg[fndCfgIdx], cliCfg)
    app.use(serve(path.resolve(cwd, cliCfg.staticDir)))
    localCfg.forEach((serverCfg, idx) => {
      if (!serverCfg.port) {
        serverCfg.port = localCfg[fndCfgIdx].port || options.port.dflt
        if (idx !== fndCfgIdx) {
          serverCfg.port += idx - fndCfgIdx
        }
      }

      const server = Server(serverCfg)
      server.start({})
    })
  }

  return Object.freeze({
    run
  })
}

const cli = CLI(argv)
cli.run()

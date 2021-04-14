#!/usr/bin/env node
/*
 * les - CLI for lightweight koa server
 * Copyright 2021 Richard Schloss (https://github.com/richardeschloss)
 */

import minimist from 'minimist'
import serve from 'koa-static'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { execSync, spawn } from 'child_process'
import process from 'process'
import { fileURLToPath } from 'url'
import { resolve as pResolve, dirname } from 'path'
import { gentlyCopy } from 'les-utils/utils/files.js'
import { pick } from 'les-utils/utils/object.js'
import { app, Server } from './koa.js'
import IOServer from './io/socketIO.js'
import {
  attachSSL,
  buildCLIUsage,
  importCLIOptions,
  loadServerConfigs
} from './utils.js'

// @xts-ignorex
const __dirname = dirname(fileURLToPath(import.meta.url))

const cwd = process.cwd()
const options = {}
let LANG = 'en'

/** @type {import('./cli')._._mergeConfigs} */
function _mergeConfigs(cliCfg, options) {
  LANG = process.env.LANG
  const merged = loadServerConfigs()
  attachSSL(merged)

  let fndCfgIdx = merged.findIndex(({ proto }) => proto === cliCfg.proto)
  if (fndCfgIdx === -1) {
    fndCfgIdx = 0
  }

  const props = {
    proto: 'proto',
    host: 'host',
    port: 'port'
  }

  if (!LANG.includes('en')) {
    Object.entries(options).forEach(([option, { en_US }]) => {
      props[en_US] = option
      merged.forEach((serverCfg) => {
        if (serverCfg[option]) {
          serverCfg[en_US] = serverCfg[option]
        }
      })
    })
  }

  Object.assign(merged[fndCfgIdx], cliCfg)
  merged.forEach((serverCfg, idx) => {
    serverCfg.proto = serverCfg.proto || options[props.proto].dflt
    serverCfg.host = serverCfg.host || options[props.host].dflt

    if (!serverCfg.port) {
      if (serverCfg.portRange) {
        console.log('portRange', serverCfg.portRange)
        serverCfg.port = serverCfg.portRange[0]
      } else {
        serverCfg.port = merged[fndCfgIdx].port || options[props.port].dflt
        if (idx !== fndCfgIdx) {
          serverCfg.port += idx - fndCfgIdx
        }
      }
    }
  })
  return merged
}

/** @type {import('./cli').CLI} */
function CLI(cfg, msgs) {
  LANG = process.env.LANG
  cfg['_'] = cfg['_'] || []
  /** @type {import('./cli')._.buildCliCfg} */
  function buildCliCfg(options) {
    const cliCfg = {
      staticDir: 'public'
    }
    const rangeKey = 'range'
    Object.entries(options).forEach(([option, { alias, en_US }]) => {
      const optionVal = cfg[option] || cfg[alias]
      if (optionVal) {
        if (en_US) {
          option = en_US
        }
        cliCfg[option] = optionVal
      }
    })

    if (cfg['_'][0] !== undefined) {
      cliCfg.staticDir = cfg['_'][0]
    }

    if (cliCfg.range && typeof cliCfg.range === 'string') {
      if (cliCfg.range.match(/[0-9]+-[0-9]+/)) {
        cliCfg.portRange = cliCfg.range.split('-').map((i) => parseInt(i))
        if (!cliCfg.port) {
          cliCfg.port = cliCfg.portRange[0]
        }
      } else {
        throw new Error(
          msgs.errIncorrectRangeFmt
            .replace(/\s*%1/, rangeKey)
            .replace(/\s*=\s*/, '=')
            .replace(/\s+-\s+/, '-')
        )
      }
    }

    return cliCfg
  }

  /** @type {import('./cli')._.init} */
  function init({ dest = cwd, initCfg }) {
    const srcDir =  pResolve(__dirname, '..')

    console.log(msgs.copyingFiles.replace('%1', srcDir).replace('%2', dest))
    const packageJson = 'package.json'
    const srcPackage = JSON.parse(
      readFileSync(pResolve(srcDir, packageJson), {encoding: 'utf-8'})
    )
    const { files, dependencies, devDependencies, scripts: srcScripts } = srcPackage
    const destPackageFile = pResolve(dest, packageJson)
    if (!existsSync(dest)) {
      mkdirSync(dest)
    }
    if (!existsSync(destPackageFile)) {
      console.log(msgs.writingDeps.replace('%1', destPackageFile))
      const scripts = pick(srcScripts, ['dev', 'start', 'test', 'test:watch', 'test:cov'])
      const destPackage = Object.assign(
        {},
        { scripts, dependencies, devDependencies }
      )
      writeFileSync(destPackageFile, JSON.stringify(destPackage, null, '  '))
    } else {
      console.log(msgs.packageJsonExists.replace('%1', packageJson))
    }

    const destLesrcFile = pResolve(dest, '.lesrc')
    if (!existsSync(destLesrcFile)) {
      console.log(
        msgs.writingConfig.replace('%1', '.lesrc').replace('%2', destLesrcFile)
      )
      const lesCfg = [Object.assign({}, initCfg)]
      console.log('.lesrc:', lesCfg)
      writeFileSync(destLesrcFile, JSON.stringify(lesCfg, null, '  '))
    } else {
      console.log(msgs.configExists.replace('%1', '.lesrc'))
    }
    const skipFiles = ['.lesrc']
    const srcFiles = files
      .filter(
        /** @param {string} f */
        (f) => !skipFiles.includes(f)
      )
      .map(
        /** @param {string} f */
        (f) => pResolve(srcDir, f)
      )
    gentlyCopy(srcFiles, dest)
    console.log(msgs.copiedFiles)
    
    console.log(msgs.installingDeps.replace('%1', dest))
    process.chdir(dest)
    execSync('npm i', { stdio: [0, 1, 2] })
    console.log(msgs.doneInit)
    console.log(
      msgs.postInitNotes
        .replace('%1', '.gitignore and git')
        .replace('%2', 'git init; git add .')
        .replace('%3', packageJson)
        .replace('%4', 'npm prune')
    )
    return 'done'
  }

  /** @type {import('./cli')._.open} */
  function open({ proto, host, port }) {
    const { platform } = process
    const cmdMap = {
      win32: ['cmd', ['/c', 'start']],
      darwin: ['open', []]
    }
    const [cmd, args] = cmdMap[platform] || ['xdg-open', []]
    args.push(`${proto == 'http2' ? 'https' : proto}://${host}:${port}`)
    const browser = spawn(cmd, args)
    console.log(msgs.browserOpened)
    return browser
  }

  /** @type {import('./cli')._.run} */
  function run(options) {
    const cliCfg = buildCliCfg(options)
    console.log('cliCfg', cliCfg)

    if (cliCfg.help) {
      const usage = buildCLIUsage(
        `${msgs.usage}: les [path] [options]`,
        options,
        msgs
      )
      console.log(usage)
      return usage
    } else if (cliCfg.init) {
      // eslint-disable-next-line no-unused-vars
      const { staticDir: destX, init: initVal, ...initCfg } = cliCfg
      const { dest } = cfg
      return init({ dest, initCfg })
    }

    const mergedCfgs = _mergeConfigs(cliCfg, options)
    app.use(serve(pResolve(cwd, cliCfg.staticDir)))

    return new Promise((resolve, reject) => {
      const cfgsLoaded = Array(mergedCfgs.length)
      let doneCnt = 0
      function onSuccess({ data, idx }) {
        data.staticDir = cliCfg.staticDir
        if (cliCfg.open) {
          data.browser = open(data)
        }

        if (cliCfg.watch) {
          const watchDir =
            typeof cliCfg.watch === 'string' ? cliCfg.watch : cliCfg.staticDir

          const ioServer = IOServer(data)
          ioServer.watchDir(pResolve(cwd, watchDir, '*'))
          data.watchDir = watchDir
        }
        cfgsLoaded[idx] = data
        console.log(msgs.servingStaticDir.replace('%1', cliCfg.staticDir))
        if (++doneCnt == mergedCfgs.length) {
          console.log(msgs.serverCfgsStarted)
          resolve({
            evt: 'cfgsLoaded',
            data: cfgsLoaded
          })
        }
      }
      mergedCfgs.forEach((serverCfg, idx) => {
        const server = Server(serverCfg)
        server
          .start()
          .then(({ data }) => onSuccess({ data, idx }))
          .catch(reject)
      })
    })
  }

  return Object.freeze({
    run
  })
}

/** @type {import('./cli')._._mergeConfigs} */
export let mergeConfigs
/** @type {import('./cli').CLI} */
export let testCLI
if (process.env.TEST) {
  mergeConfigs = _mergeConfigs
  testCLI = CLI
} else {
  (async function() {
    const argv = minimist(process.argv.slice(2))
    const msgs = {}
    await importCLIOptions(options, msgs)    
    const cli = CLI(argv, msgs)
    cli.run(options)
  })()
}

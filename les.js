#!/usr/bin/env node
/*
 * les - CLI for lightweight koa server
 * Copyright 2019 Richard Schloss (https://github.com/richardeschloss)
 */

import gentlyCopy from 'gently-copy'
import minimist from 'minimist'
import serve from 'koa-static'
import { existsSync, writeFileSync } from 'fs'
import { resolve as pResolve } from 'path'
import { app, Server } from '@/server'
import {
  attachSSL,
  buildCLIUsage,
  importCLIOptions,
  loadServerConfigs
} from '@/utils'
import { spawn } from 'child_process'

const argv = minimist(process.argv.slice(2))
const cwd = process.cwd()
const options = {}

function _mergeConfigs(cliCfg, options) {
  const merged = loadServerConfigs()
  attachSSL(merged)

  let fndCfgIdx = merged.findIndex(({ proto }) => proto === cliCfg.proto)
  if (fndCfgIdx === -1) {
    fndCfgIdx = 0
  }

  Object.assign(merged[fndCfgIdx], cliCfg)
  merged.forEach((serverCfg, idx) => {
    serverCfg.proto = serverCfg.proto || options.proto.dflt
    serverCfg.host = serverCfg.host || options.host.dflt

    if (!serverCfg.port) {
      if (serverCfg.portRange) {
        serverCfg.port = parseInt(serverCfg.portRange[0])
      } else {
        serverCfg.port = merged[fndCfgIdx].port || options.port.dflt
        if (idx !== fndCfgIdx) {
          serverCfg.port += idx - fndCfgIdx
        }
      }
    }
  })
  return merged
}

function CLI(cfg) {
  cfg['_'] = cfg['_'] || []
  function buildCliCfg(options) {
    const cliCfg = {}
    Object.entries(options).forEach(([option, { alias }]) => {
      const optionVal = cfg[option] || cfg[alias]
      if (optionVal) {
        cliCfg[option] = optionVal
      }
    })

    cliCfg.staticDir = cfg['_'][0] || (cliCfg.init ? cwd : 'public')
    if (cliCfg.range && typeof cliCfg.range === 'string') {
      if (cliCfg.range.match(/[0-9]+-[0-9]+/)) {
        cliCfg.portRange = cliCfg.range.split('-').map((i) => parseInt(i))
        if (!cliCfg.port) {
          cliCfg.port = cliCfg.portRange[0]
        }
      } else {
        throw new Error(
          'port range incorrectly formatted. Format as --range=start-end'
        )
      }
    }

    return cliCfg
  }

  async function init({ dest, initCfg }) {
    const srcDir = __dirname.includes('bin')
      ? pResolve(__dirname, '..') // bin/les.js needs to go up one (test coverage will always miss this)
      : __dirname // [src]/les.js uses __dirname

    console.log('Copying files from:', srcDir)
    const srcPackage = await import(pResolve(srcDir, 'package.json'))
    const { files, dependencies, devDependencies } = srcPackage
    const destPackageFile = pResolve(dest, 'package.json')
    if (!existsSync(destPackageFile)) {
      console.log(
        'writing dependencies to new package.json file:',
        destPackageFile
      )
      const scripts = {
        dev: 'nodemon --exec npm start',
        start: 'babel-node app.js',
        test: 'ava',
        'test:watch': 'ava --watch',
        'test:cov': 'nyc ava'
      }
      const destPackage = Object.assign(
        {},
        { scripts, dependencies, devDependencies }
      )
      writeFileSync(destPackageFile, JSON.stringify(destPackage, null, '  '))
    } else {
      console.log('package.json already exists...will not overwrite')
    }

    const destLesrcFile = pResolve(dest, '.lesrc')
    if (!existsSync(destLesrcFile)) {
      console.log('writing config to new .lesrc file:', destLesrcFile)
      const lesCfg = [Object.assign({}, initCfg)]
      console.log('.lesrc:', lesCfg)
      writeFileSync(destLesrcFile, JSON.stringify(lesCfg, null, '  '))
    } else {
      console.log('.lesrc already exists...will not overwrite')
    }
    const skipFiles = ['bin', '.lesrc']
    const srcFiles = files
      .filter((f) => !skipFiles.includes(f))
      .map((f) => pResolve(srcDir, f))
    gentlyCopy(srcFiles, dest)
    console.log('copied files over')

    console.log('Installing deps in', dest)
    process.chdir(dest)
    const { execSync } = await import('child_process')
    execSync('npm i', { stdio: [0, 1, 2] })
    console.log('Done initializing lesky app! Some notes:')
    const postInstallNotes = [
      'You might want to init .gitignore and git here before continuing (git init; git add .)',
      'You might want to add author, project name, version number to package.json',
      'You might want different dependencies. Use `npm prune` to remove unused deps (optional)'
    ]
      .map((note, idx) => `${idx + 1}. ${note}`)
      .join('\n')
    console.log(postInstallNotes)
    return 'done'
  }

  function open({ proto, host, port }) {
    const { platform } = process
    const cmdMap = {
      win32: ['cmd', ['/c', 'start']],
      darwin: ['open', []]
    }
    const [cmd, args] = cmdMap[platform] || ['xdg-open', []]
    args.push(`${proto == 'http2' ? 'https' : proto}://${host}:${port}`)
    const browser = spawn(cmd, args)
    console.log('browser opened')
    return browser
  }

  function run(options) {
    const cliCfg = buildCliCfg(options)
    if (cliCfg.help) {
      const usage = buildCLIUsage('usage: les [path] [options]', options)
      console.log(usage)
      return usage
    } else if (cliCfg.init) {
      // eslint-disable-next-line no-unused-vars
      const { staticDir: dest, init: initVal, ...initCfg } = cliCfg
      return init({ dest, initCfg })
    }

    const mergedCfgs = _mergeConfigs(cliCfg, options)
    app.use(serve(pResolve(cwd, cliCfg.staticDir)))

    return new Promise((resolve, reject) => {
      const cfgsLoaded = Array(mergedCfgs.length)
      let doneCnt = 0
      function onSuccess({ data, idx }) {
        if (cliCfg.open) {
          data.browser = open(data)
        }
        cfgsLoaded[idx] = data
        console.log('serving static dir', cliCfg.staticDir)
        if (++doneCnt == mergedCfgs.length) {
          console.log('All server configs started')
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

if (require.main === module) {
  ;(async function() {
    await importCLIOptions(options)
    const cli = CLI(argv)
    cli.run(options)
  })()
}

export let mergeConfigs
export let testCLI
if (process.env.TEST) {
  mergeConfigs = _mergeConfigs
  testCLI = CLI
}

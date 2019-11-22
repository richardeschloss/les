// import { serial as test } from 'ava'
import test, { before } from 'ava'
import { spawn, exec } from 'child_process'
import { mkdirSync } from 'fs'
import { buildCLIUsage, importCLIOptions } from '@/utils'
import { mergeConfigs } from '@/les'

const options = {}

function listeningStr(cfg) {
  const { proto, host, port } = cfg
  return `listening at: (proto = ${proto}, host = ${host}, port = ${port})`
}

function runUntil(regex, args = []) {
  console.log('testing with', args)
  console.log('waiting for', regex)
  return new Promise((resolve) => {
    const cmd = 'node_modules/.bin/babel-node'
    const allArgs = ['les.js'].concat(args)
    const child = spawn(cmd, allArgs)
    let resp = ''
    child.stdout.on('data', (d) => {
      resp += d.toString()
      if (resp.match(regex)) {
        exec(`pkill node -P ${child.pid}`, () => {
          child.kill()
          resolve(resp)
        })
      }
    })
  })
}

before('Import CLI options', async (t) => {
  await importCLIOptions(options)
})

test.only('Help menu (-h)', async (t) => {
  const usage = buildCLIUsage('usage: les [path] [options]', options)
  const resp = await runUntil(/---End of Help---\n\n/, ['-h'])
  t.is(resp.trim(), usage.trim())
})

test('Server starts (no CLI args, .lesrc)', async (t) => {
  const merged = mergeConfigs({}, options)
  const resp = await runUntil('All server configs started')
  merged.forEach((cfg) => {
    const stsStr = listeningStr(cfg)
    t.true(resp.includes(stsStr))
  })
})

test('Server starts (simple CLI args provided)', async (t) => {
  const merged = mergeConfigs({ port: 3001 }, options)
  const resp = await runUntil('All server configs started', ['--port', 3001])
  merged.forEach((cfg) => {
    const stsStr = listeningStr(cfg)
    t.true(resp.includes(stsStr))
  })
})

test('Server starts (http proto)', async (t) => {
  const merged = mergeConfigs({ proto: 'http' }, options)
  const resp = await runUntil('All server configs started', ['--proto', 'http'])
  merged.forEach((cfg) => {
    const stsStr = listeningStr(cfg)
    t.true(resp.includes(stsStr))
  })
})

test('Server starts (port range provided)', async (t) => {
  const merged = mergeConfigs({ portRange: [8500, 9500] }, options)
  console.log('merged', merged)
  const resp = await runUntil('All server configs started', [
    '--range',
    '8500-9500'
  ])
  merged.forEach((cfg) => {
    const stsStr = listeningStr(cfg)
    t.true(resp.includes(stsStr))
  })
})

test.only('Workspace init', async (t) => {
  t.timeout(2 * 60 * 1000)
  mkdirSync('/tmp/les')
  await runUntil(/Done initializing/, ['/tmp/les', '--init'])
  exec('rm -rf /tmp/les')
  t.pass()
})

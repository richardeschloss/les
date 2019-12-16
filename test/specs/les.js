import { serial as test, before, after } from 'ava'
import { mkdirSync, rmdirSync, unlinkSync } from 'fs'
import { exec } from 'child_process'
import {
  buildCLIUsage,
  generateSelfSignedCert,
  importCLIOptions
} from '@/utils'
import { mergeConfigs, testCLI } from '@/les'

const sslDir = './.ssl'
const sslOptions = {
  keyout: `${sslDir}/localhost.key`,
  out: `${sslDir}/localhost.crt`
}

const options = {}
const msgs = {}

const options2 = {}
const msgs2 = {}

async function testCfg(cliCfg, msgs) {
  const cli = testCLI(cliCfg, msgs)
  const { data } = await cli.run(options)
  return { cfgsLoaded: data }
}

async function stopServers(cfgsLoaded) {
  return new Promise((resolve) => {
    let doneCnt = 0
    function handleDone() {
      if (++doneCnt === cfgsLoaded.length) {
        resolve()
      }
    }

    cfgsLoaded.forEach(({ server }) => {
      server.close(handleDone)
    })
  })
}

function validateCfgs(cliCfg, cfgsLoaded, t, options) {
  const merged = mergeConfigs(cliCfg, options)
  const keys = ['proto', 'host', 'port']
  merged.forEach((cfg, idx) => {
    keys.forEach((key) => {
      t.is(cfg[key], cfgsLoaded[idx][key])
    })
  })
}

before('Generate Self-Signed Cert', async () => {
  try {
    mkdirSync(sslDir)
  } catch (e) {
    console.error('mkdir err', e)
  }
  await generateSelfSignedCert(sslOptions)
})

after('Remove self-signed cert', () => {
  Object.values(sslOptions).forEach((f) => unlinkSync(f))
  rmdirSync(sslDir)
})

before('Import CLI options', async () => {
  await importCLIOptions(options, msgs)
})

test('Help menu (--help)', (t) => {
  const cliCfg = { help: true }
  const usage = buildCLIUsage('usage: les [path] [options]', options, msgs)
  const cli = testCLI(cliCfg, msgs)
  const resp = cli.run(options)
  t.is(resp, usage)
})

test('Server starts (no CLI args, .lesrc)', async (t) => {
  const cliCfg = {}
  const { cfgsLoaded } = await testCfg(cliCfg, msgs)
  validateCfgs(cliCfg, cfgsLoaded, t, options)
  await stopServers(cfgsLoaded)
})

test('Server starts (simple CLI args provided)', async (t) => {
  const cliCfg = { port: 3001 }
  const { cfgsLoaded } = await testCfg(cliCfg, msgs)
  validateCfgs(cliCfg, cfgsLoaded, t, options)
  await stopServers(cfgsLoaded)
})

test('Server starts (port range)', async (t) => {
  const cliCfg = { proto: 'http2', range: '3000-4000' }
  const { cfgsLoaded } = await testCfg(cliCfg, msgs)
  cliCfg.portRange = cliCfg.range.split('-').map((i) => parseInt(i))
  validateCfgs(cliCfg, cfgsLoaded, t, options)
  await stopServers(cfgsLoaded)
})

test('Server starts at port (even if port range provided)', async (t) => {
  const cliCfg = { proto: 'http2', port: 8234, range: '3000-4000' }
  const { cfgsLoaded } = await testCfg(cliCfg, msgs)
  cliCfg.portRange = cliCfg.range.split('-').map((i) => parseInt(i))
  validateCfgs(cliCfg, cfgsLoaded, t, options)
  await stopServers(cfgsLoaded)
})

test('Server does not start (port range incorrect format)', async (t) => {
  const cliCfg = { proto: 'http2', range: '3000x4000' }
  await testCfg(cliCfg, msgs).catch((err) => {
    t.is(
      err.message,
      'port range incorrectly formatted. Format as --range=start-end'
    )
  })
})

test('Server starts (http proto)', async (t) => {
  const cliCfg = { proto: 'http' }
  const { cfgsLoaded } = await testCfg(cliCfg, msgs)
  validateCfgs(cliCfg, cfgsLoaded, t, options)
  await stopServers(cfgsLoaded)
})

test('Server starts (https proto)', async (t) => {
  const cliCfg = { proto: 'https' }
  const { cfgsLoaded } = await testCfg(cliCfg, msgs)
  validateCfgs(cliCfg, cfgsLoaded, t, options)
  await stopServers(cfgsLoaded)
})

test('Server starts (sslKey not found)', async (t) => {
  const cliCfg = { proto: 'https', sslKey: '/tmp/nonExist' }
  await testCfg(cliCfg, msgs).catch((err) => {
    t.is(err.message, '[les:server] error reading ssl cert')
  })
})

test('Server starts (port in use)', async (t) => {
  const cliCfg = { port: 3000 }
  const { cfgsLoaded: cfgsLoaded1 } = await testCfg(cliCfg, msgs)
  validateCfgs(cliCfg, cfgsLoaded1, t, options)
  const { cfgsLoaded: cfgsLoaded2 } = await testCfg(cliCfg, msgs)
  cfgsLoaded1.forEach((cfg, idx) => {
    t.not(cfg.port, cfgsLoaded2[idx].port)
  })
  await stopServers(cfgsLoaded1)
})

test('Handle ENOTFOUND (host not found)', async (t) => {
  const cliCfg = { host: 'noHost' }
  await testCfg(cliCfg, msgs).catch((err) => {
    t.is(err.code, 'ENOTFOUND')
  })
})

test('Open browser', async (t) => {
  const cliCfg = { open: true }
  const { cfgsLoaded } = await testCfg(cliCfg, msgs)
  cfgsLoaded.forEach(({ browser }) => {
    console.log('launched', browser.pid)
    t.truthy(browser)
    t.truthy(browser.pid)
    browser.kill()
  })
})

test('Watch dir ', async (t) => {
  const cliCfg = { watch: true }
  const { cfgsLoaded } = await testCfg(cliCfg, msgs)
  cfgsLoaded.forEach(({ watchDir }) => {
    t.is(watchDir, 'public')
  })
})

test('Watch dir (specify path)', async (t) => {
  const cliCfg = { watch: 'somedir' }
  const { cfgsLoaded } = await testCfg(cliCfg, msgs)
  cfgsLoaded.forEach(({ watchDir }) => {
    t.is(watchDir, 'somedir')
  })
})

test('Lesky init (no config provided)', async (t) => {
  const cliCfg = { init: true, dest: '/tmp/lesky' }
  const cli = testCLI(cliCfg, msgs)
  const sts = await cli.run(options)
  t.is(sts, 'done')
  t.pass()
})

test('Lesky init (repeated, verify no overwrite)', async (t) => {
  const cliCfg = { init: true, dest: '/tmp/lesky' }
  const cli = testCLI(cliCfg, msgs)
  const sts = await cli.run(options)
  exec(`rm -rf ${cliCfg.dest}`)
  t.is(sts, 'done')
  t.pass()
})

test('Spanish options', async (t) => {
  process.env.LANG = 'es'
  await importCLIOptions(options2, msgs2)
  const cliCfg = { ayuda: true }
  const usage = buildCLIUsage(
    `${msgs2.usage}: les [path] [options]`,
    options2,
    msgs2
  )
  const cli = testCLI(cliCfg, msgs2)
  const resp = await cli.run(options2)
  t.is(resp, usage)
  process.env.LANG = 'en_US.UTF-8'
})

test('Spanish options (.lesrc)', async (t) => {
  process.env.LANG = 'es'
  await importCLIOptions(options2, msgs2)
  const cliCfg = {}
  const { cfgsLoaded } = await testCfg(cliCfg, msgs2)
  const merged = mergeConfigs(cliCfg, options2)
  const keys = ['proto', 'host', 'port']
  merged.forEach((cfg, idx) => {
    keys.forEach((key) => {
      if (!['port', 'puerto'].includes(key)) {
        t.is(cfg[key], cfgsLoaded[idx][key])
      }
    })
  })
  await stopServers(cfgsLoaded)
  process.env.LANG = 'en_US.UTF-8'
})

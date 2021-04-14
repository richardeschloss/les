import test from 'ava'
import { unlinkSync } from 'fs'
import { SecurityUtils } from 'les-utils'
import { Server } from '../server/koa.js'

const { before, after } = test

const sslOptions = {
  keyout: '/tmp/localhost.key',
  out: '/tmp/localhost.crt'
}

/** @param {import('../server/koa').serverCfg} cfg */
async function testCfg(cfg) {
  const s = Server(cfg)
  
  const sts = await s.start()
  return { s, sts }
}

/** 
 * @param {import('ava').ExecutionContext} t
 * @param {{evt: any, data: any}} sts
 * @returns {import('../server/koa').serverCfg} serverCfg
 */
function validateStart(t, sts) {
  const { evt, data } = sts
  const { server, ...serverCfg } = data
  t.is(evt, 'serverListening')
  t.truthy(server)
  return serverCfg
}

before('Generate Self-Signed Cert', async () => {
  await SecurityUtils.generateSelfSignedCert(sslOptions)
})

after('Remove self-signed cert', () => {
  Object.values(sslOptions).forEach((f) => unlinkSync(f))
})

test('Server Start (defaults)', async (t) => {
  const defaults = {
    proto: 'http',
    host: 'localhost',
    port: 8080
  }
  const { s, sts } = await testCfg({})
  const serverCfg = validateStart(t, sts)
  Object.entries(serverCfg).forEach(([key, val]) => {
    t.is(val, defaults[key])
  })
  await s.stop()
})

test('Server Start (undefined proto)', async (t) => {
  const { s, sts } = await testCfg({ proto: 'httpxyz' })
  const serverCfg = validateStart(t, sts)
  t.is(serverCfg.proto, 'http')
  await s.stop()
})

test('Error conditions: port taken', async (t) => {
  const { s: s1, sts: sts1 } = await testCfg({ port: 3000 })
  const { s: s2, sts: sts2 } = await testCfg({ port: 3000 })
  const { s: s3, sts: sts3 } = await testCfg({
    port: 3000,
    portRange: [4000, 5000]
  })
  const serverCfg1 = validateStart(t, sts1)
  const serverCfg2 = validateStart(t, sts2)
  const serverCfg3 = validateStart(t, sts3)
  t.not(serverCfg1.port, serverCfg2.port)
  t.not(serverCfg1.port, serverCfg3.port)
  t.true(serverCfg3.port >= 4000 && serverCfg3.port <= 5000)
  await s1.stop()
  await s2.stop()
  await s3.stop()
})

test('Secure protocols (no ssl info provided)', async (t) => {
  await testCfg({ proto: 'https' }).catch((err) => {
    t.is(err.message, '[les:server] error reading ssl cert')
  })
  await testCfg({ proto: 'http2', port: 1337 }).catch((err) => {
    t.is(err.message, '[les:server] error reading ssl cert')
  })
})

test('Secure protocols (ssl info provided)', async (t) => {
  const { keyout: sslKey, out: sslCert } = sslOptions
  const cfg1 = {
    proto: 'https',
    port: 3000,
    sslKey,
    sslCert
  }
  const cfg2 = {
    proto: 'http2',
    port: cfg1.port + 1,
    sslKey,
    sslCert
  }
  const { s: s1, sts: sts1 } = await testCfg(cfg1)
  const { s: s2, sts: sts2 } = await testCfg(cfg2)
  const serverCfg1 = validateStart(t, sts1)
  const serverCfg2 = validateStart(t, sts2)
  t.is(serverCfg1.proto, cfg1.proto)
  t.is(serverCfg2.proto, cfg2.proto)
  await s1.stop()
  await s2.stop()
})

test('Invalid host', async (t) => {
  const resp = await testCfg({ host: 'nonExist' }).catch((err) => {
    t.is(err.code, 'ENOTFOUND')
  })
  t.falsy(resp)
})

test('Stop non-running server', async (t) => {
  const s = Server({})
  await s.stop()
  t.pass()
})

import test from 'ava'
import * as Utils from '../utils.js'
import { unlinkSync } from 'fs'

test('attachSSL', (t) => {
  const cfgs = [{
    'host': 'localhost',
    'proto': 'http2',
    'sslKey': '.ssl/localhost.key',
    'sslCert': '.ssl/localhost.crt'
  },{
    'proto': 'https',
    'portRange': [5000, 6000]
  },{
    'port': 8111,
    'sslKey': '/dont/change/me'
  }]
  Utils.attachSSL(cfgs)
  t.is(cfgs[1].sslKey, cfgs[0].sslKey)
  t.is(cfgs[1].sslCert, cfgs[0].sslCert)
  t.is(cfgs[2].sslKey, '/dont/change/me')
  t.is(cfgs[2].sslCert, cfgs[0].sslCert)
})

test('buildCLIUsage', (t) => {
  const usage = Utils.buildCLIUsage(
    'Usage',
    { help: {
      alias: 'h',
      desc: 'Prints usage'
    }},
    {
      endOfHelp: 'End of Help'
    }
  )
  const exp = [
    'Usage', '', 'options:',
    ['', '-h,', '--help', 'Prints usage'].join('\t')
  ].join('\n') + '\n\n---End of Help---\n\n'
  t.is(usage, exp)
})

test('importCLIOptions', async (t) => {
  const options = {}, msgs = {}
  Utils.importCLIOptions(options, msgs)
  t.is(options.help.desc, 'Print this help menu')
  t.is(msgs.usage, 'usage')
  
  process.env.LANG = 'none'
  const options2 = {}, msgs2 = {}
  await Utils.importCLIOptions(options2, msgs2)
  t.is(options2.help.desc, 'Print this help menu')
  t.is(msgs2.usage, 'usage')

  process.env.LANG = 'es'
  try {
    unlinkSync(`locales/${process.env.LANG}.json`)
  } catch (e) {
    // 
  }
  const options3 = {}, msgs3 = {}
  await Utils.importCLIOptions(options3, msgs3)
  t.truthy(options3.ayuda)
  t.is(msgs3.usage, 'el uso de')
})

test.only('loadServerConfigs', (t) => {
  const cfgs = Utils.loadServerConfigs()
  t.true(Array.isArray(cfgs))
  t.true(cfgs.length > 0)
})

// test('Translate locales', async (t) => {
//   t.timeout(3 * 60 * 1000)
//   await translateLocales({ api: 'yandex' })
//   t.pass()
// })

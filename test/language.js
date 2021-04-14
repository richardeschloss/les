import ava from 'ava'
import Svc from '../rexters/language.js'

const { serial: test } = ava

test('Unsupported api', (t) => {
  const api = 'none'
  try {
    Svc(api)
  } catch (err) {
    t.is(err.message, `svc ${api} not implemented`)
  }
})

const apis = [
  'IBM'
  // 'Yandex' // They deprecated the free API :(
]

apis.forEach((api) => {
  test('identifiableLanguages', async (t) => {
    const svc = Svc(api)
    const resp = await svc.identifiableLanguages()
    t.true(Array.isArray(resp))
    if (resp.length > 0) { 
      t.truthy(resp[0].language, resp[0].name)
    }
  })

  test('supportedLangs', async (t) => {
    const svc = Svc(api)
    const resp = await svc.supportedLangs()
    console.log(resp)
    t.true(Array.isArray(resp))
  })

  test('translate', async (t) => {
    const svc = Svc(api)
    const resp = await svc.translate({
      text: 'hello',
      to: 'es'
    })
    console.log('resp', resp)
    t.is(resp[0], 'hola')
  })

  test('batch', async (t) => {
    const svc = Svc(api)
    const resp = await svc.batch({
      text: 'hello',
      to: ['es']
    })
    t.is(resp.es[0], 'hola')
  })
})
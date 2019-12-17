import test from 'ava'
import { translateLocales } from '@/utils'

test('Translate locales', async (t) => {
  t.timeout(3 * 60 * 1000)
  await translateLocales({ api: 'yandex' })
  t.pass()
})

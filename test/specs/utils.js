import test from 'ava'
import { translateLocales } from '@/utils'

test('Translate locales', async (t) => {
  t.timeout(2 * 60 * 1000)
  await translateLocales()
  t.pass()
})

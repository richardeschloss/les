import test from 'ava'

delete process.env.TEST

test('Help menu (-h), production run', async (t) => {
  process.argv = ['node', './server/cli.js', '-h']
  await import('../server/cli.js')
  t.pass()
})

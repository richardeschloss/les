import test, { before } from 'ava'
import { exec } from 'child_process'
import { mkdirSync } from 'fs'
import { buildCLIUsage, importCLIOptions, runCmdUntil } from '@/utils'

const options = {}

before('Import CLI options', async () => {
  await importCLIOptions(options)
})

test('Help menu (-h)', async (t) => {
  const usage = buildCLIUsage('usage: les [path] [options]', options)
  const resp = await runCmdUntil({
    args: ['les.js', '-h'],
    regex: /---End of Help---\n\n/
  })
  t.is(resp.trim(), usage.trim())
})

test('Workspace init', async (t) => {
  t.timeout(2 * 60 * 1000)
  const tmpDir = '/tmp/les'
  mkdirSync(tmpDir)
  await runCmdUntil({
    args: [tmpDir, '--init'],
    regex: /Done initializing/
  })
  exec(`rm -rf ${tmpDir}`)
  t.pass()
})

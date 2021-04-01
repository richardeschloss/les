import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { resolve as pResolve, dirname } from 'path'
import { exec, spawn } from 'child_process'
import { Rexter } from 'les-utils'
// LangUtils needed

const __dirname = pResolve(dirname(''))

/** @type {import('./utils').attachSSL} */
function attachSSL(cfgs) {
  const sslPair = {}
  const sslFound = cfgs.find(({ sslKey, sslCert }) => sslKey && sslCert)
  if (sslFound) {
    const { sslKey, sslCert } = sslFound
    Object.assign(sslPair, { sslKey, sslCert })
  }

  cfgs.forEach((cfg) => {
    Object.entries(sslPair).forEach(([k, v]) => {
      if (!cfg[k]) {
        cfg[k] = v
      }
    })
  })
}

/** @type {import('./utils').buildCLIUsage} */
const buildCLIUsage = (cmdFmt, options, msgs) => {
  const usage = [cmdFmt, '', 'options:']
  Object.entries(options).forEach(
    ([option, { alias = '', desc = '', dflt, limitTo }]) => {
      if (alias !== '') {
        alias = `-${alias},`
      }

      if (dflt) {
        desc = `${desc} [${dflt}]`
      }

      if (limitTo) {
        desc = `${desc} (${limitTo})`
      }
      const optStr = ['', alias, `--${option}`, desc]

      usage.push(optStr.join('\t'))
    }
  )
  return usage.join('\n') + `\n\n---${msgs.endOfHelp}---\n\n`
}

/** @type {import('./utils').importCLIOptions} */
async function importCLIOptions(options, msgs) {
  const localeDflt = 'en'
  const { LANG = localeDflt } = process.env
  const locale = LANG.split('.UTF-8')[0].split('_')[0]
  const localeJson = `${__dirname}/locales/${locale}.json`
  if (existsSync(localeJson)) {
    console.log('exists?', localeJson)
    const json = readFileSync(localeJson).toString()
    const imported = JSON.parse(json)
    const { msgs: importedMsgs, options: importedOptions } = imported
    Object.assign(options, importedOptions)
    Object.assign(msgs, importedMsgs)
  } else {
    console.info(
      `Options for locale ${locale} does not exist, will attempt to download`
    )
    try {
      const rexter = Rexter({})
      await rexter.get(
        `https://raw.githubusercontent.com/richardeschloss/les/feat/i18n/locales/${locale}.json`,
        {
          dest: localeJson,
          transform: 'json'
        }
      )
      const json = readFileSync(`./locales/${locale}.json`).toString()
      const imported = JSON.parse(json)
      const { msgs: importedMsgs, options: importedOptions } = imported
      Object.assign(options, importedOptions)
      Object.assign(msgs, importedMsgs)
    } catch (err) {
      try {
        unlinkSync(localeJson)
      } catch (err) {
        /* Handle */
      }
      console.error(
        `Error downloading locale ${locale} defaulting to '${localeDflt}'`
      )
      const json = readFileSync(`./locales/${localeDflt}.json`).toString()
      const imported = JSON.parse(json)
      const { msgs: importedMsgs, options: importedOptions } = imported
      Object.assign(options, importedOptions)
      Object.assign(msgs, importedMsgs)
    }
  }
}

function loadServerConfigs() {
  const cwd = process.cwd()
  const config = pResolve(cwd, '.lesrc')
  let localCfg = [{}]
  if (existsSync(config)) {
    try {
      localCfg = JSON.parse(readFileSync(config))
    } catch (err) {
      console.log(
        'Error parsing .lesrc JSON. Is it formatted as JSON correctly?',
        err
      )
    }
  } else {
    console.info('.lesrc does not exist. Using CLI only')
  }
  return localCfg
}

function runCmdUntil({
  cmd = 'node_modules/.bin/babel-node',
  args = [],
  regex,
  debug = false
}) {
  console.log('runCmdUntil', cmd, args, regex)
  return new Promise((resolve) => {
    const child = spawn(cmd, args)
    let resp = ''
    child.stdout.on('data', (d) => {
      const str = d.toString()
      resp += str
      if (debug) console.log(str)
      if (resp.match(regex)) {
        exec(`pkill node -P ${child.pid}`, () => {
          child.kill()
          resolve(resp)
        })
      }
    })
  })
}

async function translateLocales({ api = 'ibm' }) {
  console.log('translateLocales...')
  const svc = LangUtils({ api })
  const localeDflt = 'en'
  const localeJson = `${__dirname}/locales/${localeDflt}.json`
  const { default: imported } = await import(localeJson)
  const { msgs, options } = imported

  const msgsInKeys = Object.keys(msgs)
  const msgsInValues = Object.values(msgs)

  const optsInKeys = Object.keys(options)
  const optsInValues = Object.values(options)
  const optsInDescs = optsInValues.map(({ desc }) => desc)

  const textIn = msgsInValues.concat(optsInKeys, optsInDescs)
  const translatedLangs = []
  await svc
    .translateMany({
      sequential: true,
      texts: textIn,
      langs: 'all',
      notify({ lang, result }) {
        translatedLangs.push(lang)
        const msgsResp = result.slice(0, msgsInValues.length)
        const optsOutKeys = result.slice(
          msgsInValues.length,
          msgsInValues.length + optsInKeys.length
        )
        const optsOutDescs = result.slice(
          msgsInValues.length + optsInKeys.length
        )
        const msgsOut = msgsInKeys.reduce((result, key, idx) => {
          result[key] = msgsResp[idx].replace(/%\s*/g, '%')
          return result
        }, {})

        const badResp = new RegExp(/[!@#$%^&*(),.?":{}|<>'\-=\s]/)
        const ignoreKeys = ['sslKey', 'sslCert']
        const optsOut = optsOutKeys.reduce((result, key, idx) => {
          const en_US = optsInKeys[idx]
          const valKeys = Object.keys(optsInValues[idx])
          valKeys.push('en_US')
          let keyOut
          if (!badResp.test(key) && !ignoreKeys.includes(en_US)) {
            keyOut = key.toLowerCase()
          } else {
            keyOut = en_US
          }
          result[keyOut] = valKeys.reduce((valObj, valKey) => {
            if (valKey === 'en_US') {
              valObj[valKey] = en_US
            } else if (valKey === 'desc') {
              valObj[valKey] = optsOutDescs[idx]
            } else {
              valObj[valKey] = optsInValues[idx][valKey]
            }
            return valObj
          }, {})
          return result
        }, {})

        const localeOut = `${__dirname}/locales/${lang}.json`
        const localeJsonOut = { msgs: msgsOut, options: optsOut }
        console.log(`saving locale ${lang} to ${localeOut}`)
        writeFileSync(localeOut, JSON.stringify(localeJsonOut, null, '\t'))

        return { optsOut, msgsOut }
      }
    })
    .catch(console.error)

  console.log('translated', translatedLangs)
  return translatedLangs
}

export {
  attachSSL,
  buildCLIUsage,
  importCLIOptions,
  loadServerConfigs,
  runCmdUntil,
  translateLocales
}

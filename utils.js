import { existsSync, readFileSync, createWriteStream, writeFileSync } from 'fs'
import { resolve as pResolve } from 'path'
import netstat from 'node-netstat'
import { exec, spawn } from 'child_process'
import { get as hGet } from 'https'
import { getSupportedLangs, translateText } from 'les-utils/dist/language'
import { promiseSeries } from 'les-utils/dist/promises'

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

function generateSelfSignedCert(options) {
  /*
  Basing off openssl's template /etc/ssl/openssl.cnf (copied to ./.ssl)
  The following was added to the end of that (i.e., myExt)
    [ myExt ]
    basicConstraints = critical,CA:true
    subjectKeyIdentifier = hash
    authorityKeyIdentifier = keyid:always,issuer
    subjectAltName = @alt_names

    [alt_names]
    DNS.1 = localhost
    DNS.2 = les
  */

  const {
    keyout = 'localhost.key',
    out = 'localhost.crt',
    domain = 'localhost',
    emailAddress = '',
    organization = '',
    organizationalUnit = '',
    countryCode = '',
    state = '',
    city = '',
    days = 365
  } = options
  const cmd = 'openssl'
  const args = [
    'req',
    '-newkey',
    'rsa:2048',
    '-x509',
    '-nodes',
    '-keyout',
    keyout,
    '-new',
    '-out',
    out,
    '-subj',
    [
      `/CN=(${domain})`,
      `/emailAddress=${emailAddress}`,
      `/O=${organization}`,
      `/OU=${organizationalUnit}`,
      `/C=${countryCode}`,
      `/ST=${state}`,
      `/L=${city}`
    ].join(''),
    '-sha256',
    '-days',
    days
  ]

  if (options.extSection) {
    // Example: options.extSection = 'myExt'
    args.push('-extensions', options.extSection)
  }

  if (options.configFile) {
    // Example: options.configFile = './.ssl/openssl.cnf'
    args.push('-config', options.configFile)
  }

  return new Promise((resolve) => {
    spawn(cmd, args).on('close', () => {
      console.log('created', { keyout, out })
      resolve()
    })
  })
}

async function findFreePort({ range = [8000, 9000] }) {
  const usedPorts = (await netstatP({ filter: { protocol: 'tcp' } })).map(
    ({ local }) => local.port
  )

  const [startPort, endPort] = range
  let freePort
  for (let port = startPort; port <= endPort; port++) {
    if (!usedPorts.includes(port)) {
      freePort = port
      break
    }
  }
  return freePort
}

const netstatP = (opts) =>
  new Promise((resolve, reject) => {
    const res = []
    netstat(
      {
        ...opts,
        done: (err) => {
          if (err) return reject(err)
          return resolve(res)
        }
      },
      (data) => res.push(data)
    )
    return res
  })

async function portTaken({ port }) {
  const usedPorts = (await netstatP({ filter: { protocol: 'tcp' } })).map(
    ({ local }) => local.port
  )
  return usedPorts.includes(port)
}

function downloadLocale(locale, dest) {
  const url = `https://raw.githubusercontent.com/richardeschloss/les/feat/i18n/locales/${locale}.json`
  return new Promise((resolve, reject) => {
    hGet(url, (res) => {
      console.log('res.statusCode', res.statusCode)
      if (res.statusCode === 200) {
        const outStream = createWriteStream(dest)
        res.pipe(outStream).on('close', () => {
          resolve()
        })
      } else {
        reject(new Error('file not found'))
      }
    })
  })
}

async function importCLIOptions(options, msgs) {
  const localeDflt = 'en'
  let locale = process.env.LANG || localeDflt
  locale = locale.split('.UTF-8')[0].split('_')[0]
  const localeJson = `${__dirname}/locales/${locale}.json`
  if (existsSync(localeJson)) {
    const { default: imported } = await import(localeJson)
    const { msgs: importedMsgs, options: importedOptions } = imported
    Object.assign(options, importedOptions)
    Object.assign(msgs, importedMsgs)
  } else {
    console.info(
      `Options for locale ${locale} does not exist, will attempt to download`
    )
    try {
      await downloadLocale(locale, localeJson)
      const { default: imported } = await import(localeJson)
      const { msgs: importedMsgs, options: importedOptions } = imported
      Object.assign(options, importedOptions)
      Object.assign(msgs, importedMsgs)
    } catch (err) {
      console.error(
        `Error downloading locale ${locale} defaulting to '${localeDflt}'`
      )
      const { default: imported } = await import(`./locales/${localeDflt}.json`)
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

async function translateLocale(lang = 'es') {
  console.log('translateLocale', lang)
  const localeDflt = 'en_US'
  const localeJson = `${__dirname}/locales/${localeDflt}.json`
  const { default: imported } = await import(localeJson)
  const { msgs, options } = imported

  const msgsIn = Object.values(msgs).join('; ')
  const optsIn = JSON.stringify(options)
  const optsInKeys = Object.keys(options)

  const { text } = await translateText({
    text: msgsIn + '|||' + optsIn,
    lang
  }).catch((err) => {
    console.error(err)
  })

  const [msgsResp, optsResp] = text[0].split('|||')
  let optsOut = {},
    msgsOut = {}
  try {
    optsOut = JSON.parse(optsResp)
    Object.keys(optsOut).forEach((key, idx) => {
      optsOut[key].en_US = optsInKeys[idx]
    })

    const translatedMsgs = msgsResp.split(/;\s+/)
    msgsOut = Object.keys(msgs).reduce((result, key, idx) => {
      result[key] = translatedMsgs[idx]
      return result
    }, {})

    const localeOut = `${__dirname}/locales/${lang}.json`
    const localeJsonOut = { msgs: msgsOut, options: optsOut }
    console.log(`saving locale ${lang} to ${localeOut}`)
    writeFileSync(localeOut, JSON.stringify(localeJsonOut, null, '\t'))
  } catch (e) {
    console.error(`Error parsing options for ${lang}`)
  }

  return { optsOut, msgsOut }
}

async function translateLocales() {
  const { langs } = await getSupportedLangs({})
  const allLangs = Object.keys(langs)
  return promiseSeries({
    items: allLangs,
    handleItem: translateLocale
  })
}

export {
  attachSSL,
  buildCLIUsage,
  generateSelfSignedCert,
  findFreePort,
  importCLIOptions,
  loadServerConfigs,
  portTaken,
  runCmdUntil,
  translateLocale,
  translateLocales
}

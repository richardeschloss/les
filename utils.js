import { existsSync, readFileSync } from 'fs'
import { resolve as pResolve } from 'path'
import netstat from 'node-netstat'
import { exec, spawn } from 'child_process'

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

const buildCLIUsage = (cmdFmt, options) => {
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
  return usage.join('\n') + '\n\n---End of Help---\n\n'
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

async function importCLIOptions(options) {
  const localeDflt = 'en_US'
  let locale = process.env.LANG || localeDflt
  locale = locale.split('.UTF-8')[0]
  const localeJson = `${__dirname}/locales/${locale}.json`
  if (existsSync(localeJson)) {
    const { default: imported } = await import(localeJson)
    Object.assign(options, imported)
  } else {
    console.info(
      `Options for locale ${locale} does not exist, defaulting to '${localeDflt}'`
    )
    Object.assign(options, await import(`./locales/${localeDflt}.json`))
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
  regex
}) {
  console.log('runCmdUntil', cmd, args, regex)
  return new Promise((resolve) => {
    const child = spawn(cmd, args)
    let resp = ''
    child.stdout.on('data', (d) => {
      const str = d.toString()
      resp += str
      if (resp.match(regex)) {
        exec(`pkill node -P ${child.pid}`, () => {
          child.kill()
          resolve(resp)
        })
      }
    })
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
  runCmdUntil
}

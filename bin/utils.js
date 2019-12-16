"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.attachSSL = attachSSL;
exports.generateSelfSignedCert = generateSelfSignedCert;
exports.findFreePort = findFreePort;
exports.importCLIOptions = importCLIOptions;
exports.loadServerConfigs = loadServerConfigs;
exports.portTaken = portTaken;
exports.runCmdUntil = runCmdUntil;
exports.translateLocales = translateLocales;
exports.buildCLIUsage = void 0;

var _fs = require("fs");

var _path = require("path");

var _nodeNetstat = _interopRequireDefault(require("node-netstat"));

var _child_process = require("child_process");

var _https = require("https");

var _lesUtils = require("les-utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function attachSSL(cfgs) {
  const sslPair = {};
  const sslFound = cfgs.find(({
    sslKey,
    sslCert
  }) => sslKey && sslCert);

  if (sslFound) {
    const {
      sslKey,
      sslCert
    } = sslFound;
    Object.assign(sslPair, {
      sslKey,
      sslCert
    });
  }

  cfgs.forEach(cfg => {
    Object.entries(sslPair).forEach(([k, v]) => {
      if (!cfg[k]) {
        cfg[k] = v;
      }
    });
  });
}

const buildCLIUsage = (cmdFmt, options, msgs) => {
  const usage = [cmdFmt, '', 'options:'];
  Object.entries(options).forEach(([option, {
    alias = '',
    desc = '',
    dflt,
    limitTo
  }]) => {
    if (alias !== '') {
      alias = `-${alias},`;
    }

    if (dflt) {
      desc = `${desc} [${dflt}]`;
    }

    if (limitTo) {
      desc = `${desc} (${limitTo})`;
    }

    const optStr = ['', alias, `--${option}`, desc];
    usage.push(optStr.join('\t'));
  });
  return usage.join('\n') + `\n\n---${msgs.endOfHelp}---\n\n`;
};

exports.buildCLIUsage = buildCLIUsage;

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
  } = options;
  const cmd = 'openssl';
  const args = ['req', '-newkey', 'rsa:2048', '-x509', '-nodes', '-keyout', keyout, '-new', '-out', out, '-subj', [`/CN=(${domain})`, `/emailAddress=${emailAddress}`, `/O=${organization}`, `/OU=${organizationalUnit}`, `/C=${countryCode}`, `/ST=${state}`, `/L=${city}`].join(''), '-sha256', '-days', days];

  if (options.extSection) {
    // Example: options.extSection = 'myExt'
    args.push('-extensions', options.extSection);
  }

  if (options.configFile) {
    // Example: options.configFile = './.ssl/openssl.cnf'
    args.push('-config', options.configFile);
  }

  return new Promise(resolve => {
    (0, _child_process.spawn)(cmd, args).on('close', () => {
      console.log('created', {
        keyout,
        out
      });
      resolve();
    });
  });
}

async function findFreePort({
  range = [8000, 9000]
}) {
  const usedPorts = (await netstatP({
    filter: {
      protocol: 'tcp'
    }
  })).map(({
    local
  }) => local.port);
  const [startPort, endPort] = range;
  let freePort;

  for (let port = startPort; port <= endPort; port++) {
    if (!usedPorts.includes(port)) {
      freePort = port;
      break;
    }
  }

  return freePort;
}

const netstatP = opts => new Promise((resolve, reject) => {
  const res = [];
  (0, _nodeNetstat.default)({ ...opts,
    done: err => {
      if (err) return reject(err);
      return resolve(res);
    }
  }, data => res.push(data));
  return res;
});

async function portTaken({
  port
}) {
  const usedPorts = (await netstatP({
    filter: {
      protocol: 'tcp'
    }
  })).map(({
    local
  }) => local.port);
  return usedPorts.includes(port);
}

function downloadLocale(locale, dest) {
  const url = `https://raw.githubusercontent.com/richardeschloss/les/feat/i18n/locales/${locale}.json`;
  return new Promise((resolve, reject) => {
    (0, _https.get)(url, res => {
      console.log('res.statusCode', res.statusCode);

      if (res.statusCode === 200) {
        const outStream = (0, _fs.createWriteStream)(dest);
        res.pipe(outStream).on('close', () => {
          resolve();
        });
      } else {
        reject(new Error('file not found'));
      }
    });
  });
}

async function importCLIOptions(options, msgs) {
  const localeDflt = 'en';
  let locale = process.env.LANG || localeDflt;
  locale = locale.split('.UTF-8')[0].split('_')[0];
  const localeJson = `${__dirname}/locales/${locale}.json`;

  if ((0, _fs.existsSync)(localeJson)) {
    const {
      default: imported
    } = await Promise.resolve().then(() => _interopRequireWildcard(require(`${localeJson}`)));
    const {
      msgs: importedMsgs,
      options: importedOptions
    } = imported;
    Object.assign(options, importedOptions);
    Object.assign(msgs, importedMsgs);
  } else {
    console.info(`Options for locale ${locale} does not exist, will attempt to download`);

    try {
      await downloadLocale(locale, localeJson);
      const {
        default: imported
      } = await Promise.resolve().then(() => _interopRequireWildcard(require(`${localeJson}`)));
      const {
        msgs: importedMsgs,
        options: importedOptions
      } = imported;
      Object.assign(options, importedOptions);
      Object.assign(msgs, importedMsgs);
    } catch (err) {
      console.error(`Error downloading locale ${locale} defaulting to '${localeDflt}'`);
      const {
        default: imported
      } = await Promise.resolve().then(() => _interopRequireWildcard(require(`./locales/${localeDflt}.json`)));
      const {
        msgs: importedMsgs,
        options: importedOptions
      } = imported;
      Object.assign(options, importedOptions);
      Object.assign(msgs, importedMsgs);
    }
  }
}

function loadServerConfigs() {
  const cwd = process.cwd();
  const config = (0, _path.resolve)(cwd, '.lesrc');
  let localCfg = [{}];

  if ((0, _fs.existsSync)(config)) {
    try {
      localCfg = JSON.parse((0, _fs.readFileSync)(config));
    } catch (err) {
      console.log('Error parsing .lesrc JSON. Is it formatted as JSON correctly?', err);
    }
  } else {
    console.info('.lesrc does not exist. Using CLI only');
  }

  return localCfg;
}

function runCmdUntil({
  cmd = 'node_modules/.bin/babel-node',
  args = [],
  regex,
  debug = false
}) {
  console.log('runCmdUntil', cmd, args, regex);
  return new Promise(resolve => {
    const child = (0, _child_process.spawn)(cmd, args);
    let resp = '';
    child.stdout.on('data', d => {
      const str = d.toString();
      resp += str;
      if (debug) console.log(str);

      if (resp.match(regex)) {
        (0, _child_process.exec)(`pkill node -P ${child.pid}`, () => {
          child.kill();
          resolve(resp);
        });
      }
    });
  });
}

async function translateLocales({
  api = 'ibm'
}) {
  console.log('translateLocales...');
  const svc = (0, _lesUtils.LangUtils)({
    api
  });
  const localeDflt = 'en';
  const localeJson = `${__dirname}/locales/${localeDflt}.json`;
  const {
    default: imported
  } = await Promise.resolve().then(() => _interopRequireWildcard(require(`${localeJson}`)));
  const {
    msgs,
    options
  } = imported;
  const msgsInKeys = Object.keys(msgs);
  const msgsInValues = Object.values(msgs);
  const optsInKeys = Object.keys(options);
  const optsInValues = Object.values(options);
  const optsInDescs = optsInValues.map(({
    desc
  }) => desc);
  const textIn = msgsInValues.concat(optsInKeys, optsInDescs);
  const translatedLangs = [];
  await svc.translateMany({
    sequential: true,
    texts: textIn,
    langs: 'all',

    notify({
      lang,
      result
    }) {
      translatedLangs.push(lang);
      const msgsResp = result.slice(0, msgsInValues.length);
      const optsOutKeys = result.slice(msgsInValues.length, msgsInValues.length + optsInKeys.length);
      const optsOutDescs = result.slice(msgsInValues.length + optsInKeys.length);
      const msgsOut = msgsInKeys.reduce((result, key, idx) => {
        result[key] = msgsResp[idx].replace(/%\s*/g, '%');
        return result;
      }, {});
      const badResp = new RegExp(/[!@#$%^&*(),.?":{}|<>'\-=\s]/);
      const ignoreKeys = ['sslKey', 'sslCert'];
      const optsOut = optsOutKeys.reduce((result, key, idx) => {
        const en_US = optsInKeys[idx];
        const valKeys = Object.keys(optsInValues[idx]);
        valKeys.push('en_US');
        let keyOut;

        if (!badResp.test(key) && !ignoreKeys.includes(en_US)) {
          keyOut = key.toLowerCase();
        } else {
          keyOut = en_US;
        }

        result[keyOut] = valKeys.reduce((valObj, valKey) => {
          if (valKey === 'en_US') {
            valObj[valKey] = en_US;
          } else if (valKey === 'desc') {
            valObj[valKey] = optsOutDescs[idx];
          } else {
            valObj[valKey] = optsInValues[idx][valKey];
          }

          return valObj;
        }, {});
        return result;
      }, {});
      const localeOut = `${__dirname}/locales/${lang}.json`;
      const localeJsonOut = {
        msgs: msgsOut,
        options: optsOut
      };
      console.log(`saving locale ${lang} to ${localeOut}`);
      (0, _fs.writeFileSync)(localeOut, JSON.stringify(localeJsonOut, null, '\t'));
      return {
        optsOut,
        msgsOut
      };
    }

  }).catch(console.error);
  console.log('translated', translatedLangs);
  return translatedLangs;
}
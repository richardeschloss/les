"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.testCLI = exports.mergeConfigs = void 0;

var _gentlyCopy = _interopRequireDefault(require("gently-copy"));

var _minimist = _interopRequireDefault(require("minimist"));

var _koaStatic = _interopRequireDefault(require("koa-static"));

var _fs = require("fs");

var _path = require("path");

var _server = require("./server");

var _utils = require("./utils");

var _child_process = require("child_process");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const argv = (0, _minimist.default)(process.argv.slice(2));
const cwd = process.cwd();
const options = {};

function _mergeConfigs(cliCfg, options) {
  const merged = (0, _utils.loadServerConfigs)();
  (0, _utils.attachSSL)(merged);
  let fndCfgIdx = merged.findIndex(({
    proto
  }) => proto === cliCfg.proto);

  if (fndCfgIdx === -1) {
    fndCfgIdx = 0;
  }

  Object.assign(merged[fndCfgIdx], cliCfg);
  merged.forEach((serverCfg, idx) => {
    serverCfg.proto = serverCfg.proto || options.proto.dflt;
    serverCfg.host = serverCfg.host || options.host.dflt;

    if (!serverCfg.port) {
      if (serverCfg.portRange) {
        serverCfg.port = parseInt(serverCfg.portRange[0]);
      } else {
        serverCfg.port = merged[fndCfgIdx].port || options.port.dflt;

        if (idx !== fndCfgIdx) {
          serverCfg.port += idx - fndCfgIdx;
        }
      }
    }
  });
  return merged;
}

function CLI(cfg) {
  cfg['_'] = cfg['_'] || [];

  function buildCliCfg(options) {
    const cliCfg = {};
    Object.entries(options).forEach(([option, {
      alias
    }]) => {
      const optionVal = cfg[option] || cfg[alias];

      if (optionVal) {
        cliCfg[option] = optionVal;
      }
    });
    cliCfg.staticDir = cfg['_'][0] || (cliCfg.init ? cwd : 'public');

    if (cliCfg.range && typeof cliCfg.range === 'string') {
      if (cliCfg.range.match(/[0-9]+-[0-9]+/)) {
        cliCfg.portRange = cliCfg.range.split('-').map(i => parseInt(i));

        if (!cliCfg.port) {
          cliCfg.port = cliCfg.portRange[0];
        }
      } else {
        throw new Error('port range incorrectly formatted. Format as --range=start-end');
      }
    }

    return cliCfg;
  }

  async function init({
    dest,
    initCfg
  }) {
    const srcDir = __dirname.includes('bin') ? (0, _path.resolve)(__dirname, '..') : __dirname;
    const srcPackage = await Promise.resolve().then(() => _interopRequireWildcard(require(`${(0, _path.resolve)(srcDir, 'package.json')}`)));
    const {
      files,
      dependencies,
      devDependencies
    } = srcPackage;
    const destPackageFile = (0, _path.resolve)(dest, 'package.json');

    if (!(0, _fs.existsSync)(destPackageFile)) {
      console.log('writing dependencies to new package.json file:', destPackageFile);
      const scripts = {
        dev: 'nodemon --exec npm start',
        start: 'babel-node app.js',
        test: 'ava',
        'test:watch': 'ava --watch',
        'test:cov': 'nyc ava'
      };
      const destPackage = Object.assign({}, {
        scripts,
        dependencies,
        devDependencies
      });
      (0, _fs.writeFileSync)(destPackageFile, JSON.stringify(destPackage, null, '  '));
    } else {
      console.log('package.json already exists...will not overwrite');
    }

    const destLesrcFile = (0, _path.resolve)(dest, '.lesrc');

    if (!(0, _fs.existsSync)(destLesrcFile)) {
      console.log('writing config to new .lesrc file:', destLesrcFile);
      const lesCfg = [Object.assign({}, initCfg)];
      console.log('.lesrc:', lesCfg);
      (0, _fs.writeFileSync)(destLesrcFile, JSON.stringify(lesCfg, null, '  '));
    } else {
      console.log('.lesrc already exists...will not overwrite');
    }

    const skipFiles = ['bin', '.lesrc'];
    const srcFiles = files.filter(f => !skipFiles.includes(f)).map(f => (0, _path.resolve)(srcDir, f));
    (0, _gentlyCopy.default)(srcFiles, dest);
    console.log('copied files over');
    console.log('Installing deps in', dest);
    process.chdir(dest);
    const {
      execSync
    } = await Promise.resolve().then(() => _interopRequireWildcard(require('child_process')));
    execSync('npm i', {
      stdio: [0, 1, 2]
    });
    console.log('Done initializing lesky app! Some notes:');
    const postInstallNotes = ['You might want to init .gitignore and git here before continuing (git init; git add .)', 'You might want to add author, project name, version number to package.json', 'You might want different dependencies. Use `npm prune` to remove unused deps (optional)'].map((note, idx) => `${idx + 1}. ${note}`).join('\n');
    console.log(postInstallNotes);
    return 'done';
  }

  function open({
    proto,
    host,
    port
  }) {
    const {
      platform
    } = process;
    const cmdMap = {
      win32: ['cmd', ['/c', 'start']],
      darwin: ['open', []]
    };
    const [cmd, args] = cmdMap[platform] || ['xdg-open', []];
    args.push(`${proto == 'http2' ? 'https' : proto}://${host}:${port}`);
    const browser = (0, _child_process.spawn)(cmd, args);
    console.log('browser opened');
    return browser;
  }

  function run(options) {
    const cliCfg = buildCliCfg(options);

    if (cliCfg.help) {
      const usage = (0, _utils.buildCLIUsage)('usage: les [path] [options]', options);
      console.log(usage);
      return usage;
    } else if (cliCfg.init) {
      // eslint-disable-next-line no-unused-vars
      const {
        staticDir: dest,
        init: initVal,
        ...initCfg
      } = cliCfg;
      return init({
        dest,
        initCfg
      });
    }

    const mergedCfgs = _mergeConfigs(cliCfg, options);

    _server.app.use((0, _koaStatic.default)((0, _path.resolve)(cwd, cliCfg.staticDir)));

    return new Promise((resolve, reject) => {
      const cfgsLoaded = Array(mergedCfgs.length);
      let doneCnt = 0;

      function onSuccess({
        data,
        idx
      }) {
        if (cliCfg.open) {
          data.browser = open(data);
        }

        cfgsLoaded[idx] = data;
        console.log('serving static dir', cliCfg.staticDir);

        if (++doneCnt == mergedCfgs.length) {
          console.log('All server configs started');
          resolve({
            evt: 'cfgsLoaded',
            data: cfgsLoaded
          });
        }
      }

      mergedCfgs.forEach((serverCfg, idx) => {
        const server = (0, _server.Server)(serverCfg);
        server.start().then(({
          data
        }) => onSuccess({
          data,
          idx
        })).catch(reject);
      });
    });
  }

  return Object.freeze({
    run
  });
}

if (require.main === module) {
  ;

  (async function () {
    await (0, _utils.importCLIOptions)(options);
    const cli = CLI(argv);
    cli.run(options);
  })();
}

let mergeConfigs;
exports.mergeConfigs = mergeConfigs;
let testCLI;
exports.testCLI = testCLI;

if (process.env.TEST) {
  exports.mergeConfigs = mergeConfigs = _mergeConfigs;
  exports.testCLI = testCLI = CLI;
}
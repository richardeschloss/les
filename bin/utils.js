"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findFreePort = findFreePort;
exports.portTaken = portTaken;
exports.attachSSL = attachSSL;
exports.loadServerConfigs = loadServerConfigs;

var _fs = require("fs");

var _path = require("path");

var _nodeNetstat = _interopRequireDefault(require("node-netstat"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
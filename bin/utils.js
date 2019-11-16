"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findFreePort = findFreePort;
exports.portTaken = portTaken;

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
  let [startPort, endPort] = range;
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
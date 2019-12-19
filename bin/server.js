"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Server = Server;
exports.app = void 0;

var _fs = require("fs");

var _http = _interopRequireDefault(require("http"));

var _https = _interopRequireDefault(require("https"));

var _http2 = _interopRequireDefault(require("http2"));

var _koa = _interopRequireDefault(require("koa"));

var _path = require("path");

var _lesUtils = require("les-utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const app = new _koa.default();
exports.app = app;
const protos = {
  http: _http.default,
  https: _https.default,
  http2: _http2.default
};

function Server({
  host = 'localhost',
  port = 8080,
  proto = 'http',
  portRange,
  sslKey,
  sslCert
}) {
  const _host = host;
  const _port = port;

  const _proto = protos[proto] || _http.default;

  let _server;

  let _protoStr = 'http';

  if (Object.keys(protos).includes(proto)) {
    _protoStr = proto;
  }

  return Object.freeze({
    build() {
      const serverOpts = {};

      if (['https', 'http2'].includes(proto)) {
        try {
          serverOpts.key = (0, _fs.readFileSync)((0, _path.resolve)(sslKey));
          serverOpts.cert = (0, _fs.readFileSync)((0, _path.resolve)(sslCert));
          serverOpts.ca = [serverOpts.cert];
        } catch (err) {
          throw new Error('[les:server] error reading ssl cert');
        }
      }

      const createFn = proto === 'http2' ? 'createSecureServer' : 'createServer';
      _server = _proto[createFn](serverOpts, app.callback());
    },

    listen({
      host = _host,
      port = _port
    }) {
      return new Promise((resolve, reject) => {
        function onError(err) {
          _server.removeListener('error', onError).removeListener('listening', onSuccess);

          reject({
            err,
            data: {
              proto,
              host,
              port
            }
          });
        }

        function onSuccess() {
          const assignedPort = _server.address().port;

          console.log(`listening at: (proto = ${_protoStr}, host = ${host}, port = ${assignedPort})`);
          resolve({
            evt: 'serverListening',
            data: {
              proto: _protoStr,
              host,
              port: assignedPort,
              server: _server
            }
          });
        }

        _server.listen(port, host).on('error', onError).on('listening', onSuccess);
      });
    },

    start() {
      this.build();
      return this.listen({}).catch(({
        err,
        data
      }) => {
        const {
          port
        } = data;
        const errMap = {
          EADDRINUSE: async () => {
            let range;

            if (!portRange) {
              range = [port - 500, port + 500];
            } else {
              range = portRange;
            }

            const freePort = await _lesUtils.NetUtils.findFreePort({
              range
            });
            console.info(`Port ${port} in use, using free port instead ${freePort}`);
            return this.listen({
              port: freePort
            });
          }
        };

        if (errMap[err.code]) {
          return errMap[err.code]();
        } else {
          throw err;
        }
      });
    },

    stop() {
      return new Promise(resolve => {
        if (!_server) {
          resolve();
        }

        const {
          port
        } = _server.address();

        _server.close(() => {
          resolve({
            evt: 'serverStopped',
            data: {
              proto: _protoStr,
              host,
              port
            }
          });
        });
      });
    }

  });
}
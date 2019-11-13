"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Server = Server;
exports.app = void 0;

var _http = _interopRequireDefault(require("http"));

var _koa = _interopRequireDefault(require("koa"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const app = new _koa.default();
exports.app = app;
const protos = {
  http: _http.default
};

function Server({
  host = 'localhost',
  port = 8080,
  proto = 'http'
}) {
  let _host = host;
  let _port = port;
  let _proto = protos[proto];

  let _server;

  return Object.freeze({
    build() {
      _server = _proto.createServer(app.callback());
    },

    listen({
      host = _host,
      port = _port
    }) {
      _server.listen(port, host);

      console.log('listening on', port);
    },

    start() {
      this.build();
      this.listen({});
    }

  });
}
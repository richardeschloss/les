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

function Server({
  host = 'localhost',
  port = 3000
}) {
  let _host = host;
  let _port = port;

  let _server;

  return Object.freeze({
    build() {
      _server = _http.default.createServer(app.callback());
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
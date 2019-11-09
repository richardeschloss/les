"use strict";

var _server = require("./server");

var _fs = _interopRequireDefault(require("fs"));

var _koaStatic = _interopRequireDefault(require("koa-static"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const cwd = process.cwd();

const config = _path.default.resolve(cwd, '.lesrc');

let localConfig = {};

try {
  localConfig = JSON.parse(_fs.default.readFileSync(config));
} catch (e) {// console.error('err', e)
}

const {
  http
} = localConfig;
const server = (0, _server.Server)(http);

_server.app.use((0, _koaStatic.default)(_path.default.resolve(cwd, 'public')));

server.start();
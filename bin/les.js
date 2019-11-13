"use strict";

var _minimist = _interopRequireDefault(require("minimist"));

var _server = require("./server");

var _fs = _interopRequireDefault(require("fs"));

var _koaStatic = _interopRequireDefault(require("koa-static"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
 * les - CLI for lightweight koa server
 * Copyright 2019 Richard Schloss (https://github.com/richardeschloss)
 */
//argv = require('minimist')(process.argv.slice(2));
const argv = (0, _minimist.default)(process.argv.slice(2));
const cwd = process.cwd();

const config = _path.default.resolve(cwd, '.lesrcx');

const usage = ['usage: les [path] [options]', '', 'options:', '  -p, --port  Port to use [8080]', '  -a, --host  Address to use [localhost]'].join('\n');

function CLI() {
  let localConfig = {};

  try {
    localConfig = JSON.parse(_fs.default.readFileSync(config));
  } catch (e) {}

  const {
    http = {}
  } = localConfig;
  const server = (0, _server.Server)(http);

  _server.app.use((0, _koaStatic.default)(_path.default.resolve(cwd, 'public')));

  return Object.freeze({
    help() {
      console.log(usage);
    },

    run() {
      server.start();
    }

  });
}

console.log('argv', argv);
const cli = CLI();

if (argv.h || argv.help) {
  cli.help();
}
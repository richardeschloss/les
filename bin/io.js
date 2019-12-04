"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.IOServer = IOServer;

var _http = _interopRequireDefault(require("http"));

var _fs = require("fs");

var _glob = require("glob");

var _socket = _interopRequireDefault(require("socket.io"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function IOServer({
  host,
  port,
  server = _http.default.createServer()
}) {
  function registerIO(io) {
    const ioChannels = (0, _fs.readdirSync)('./channels').map(f => f.replace('.js', ''));
    ioChannels.forEach(channel => {
      io.of(`/${channel}`).on('connection', async socket => {
        console.info('socket.io client connected to', channel);
        const Svc = await Promise.resolve().then(() => _interopRequireWildcard(require(`./channels/${channel}`)));
        const svc = Svc();
        Object.entries(svc).forEach(([evt, fn]) => {
          if (typeof fn === 'function') {
            socket.on(evt, (msg, cb) => {
              const {
                notifyEvt = 'progress'
              } = msg;
              fn({
                notify: data => {
                  socket.emit(notifyEvt, data);
                },
                ...msg
              }).then(cb);
            });
          }
        });
      });
    });
  }

  function listen() {
    return new Promise(resolve => {
      server.listen(port, host, resolve);
    });
  }

  async function start() {
    console.info('starting IO server...', host, port, server.listening);

    if (!server.listening) {
      console.info('IO server not listening...will fix that...');
      await listen();
    }

    const io = (0, _socket.default)(server);
    registerIO(io);
    return io;
  }

  function watchDir(dir = '.') {
    const io = (0, _socket.default)(server);
    const dirs = (0, _glob.sync)(dir);
    const watchers = [];
    io.on('connection', socket => {
      dirs.forEach(watchDir => {
        watchers.push((0, _fs.watch)(watchDir, (evt, fname) => {
          console.log(`${fname}: ${evt}`);
          socket.emit('fileChanged', {
            evt,
            fname
          });
        }));
      });
      socket.on('disconnect', () => {
        watchers.forEach(w => w.close());
      });
    });
  }

  return Object.freeze({
    registerIO,
    start,
    watchDir
  });
}
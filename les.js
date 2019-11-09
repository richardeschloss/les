import { app, Server } from './server'
import fs from 'fs'
import serve from 'koa-static'
import path from 'path'

const cwd = process.cwd()
const config = path.resolve(cwd, '.lesrc')
let localConfig = {}

try {
  localConfig = JSON.parse(fs.readFileSync(config))
} catch (e) {}

const { http } = localConfig

const server = Server(http)

app.use(serve(path.resolve(cwd, 'public')))

server.start()

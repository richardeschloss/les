import http from 'http'
import https from 'https'
import http2 from 'http2'

export declare type serverCfg = {
  host?: string,
  port?: number,
  proto?: string,
  portRange?: Array<number>,
  sslKey?: string,
  sslCert?: string
}

declare type serverListening = Promise<{
  evt: string, 
  data: {
    proto: string,
    host: string,
    port: number,
    server: http.Server | https.Server | http2.Server
  }
}>

declare type serverStopped = Promise<{
  evt: string, 
  data: {
    proto: string,
    host: string,
    port: number
  }
}>

declare type serverInst = {
  /** Builds a server instance */
  build: () => void,
  /** Starts Listening */
  listen: (opts: { host?: string, port?: number }) 
    => serverListening,
  /** 
   * Starts a server
   * Convenience method for running both build
   * and listen. If a specifed port is taken, this
   * will attempt to find an available port and listen
   * on that one
   */
  async start: () => serverListening,
  /**
   * Stops the server
   */
  stop: () => serverStopped
}

export function Server(cfg: serverCfg): Readonly<serverInst>;
export type Server = typeof Server;
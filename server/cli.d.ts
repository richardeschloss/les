import http from 'http'
import https from 'https'
import http2 from 'http2'
import { ParsedArgs } from 'minimist'
import { ExecutionContext } from 'ava'
import { ChildProcessWithoutNullStreams } from 'child_process'

export declare type lesCfg = {
  host?: string,
  port?: number,
  /** This is the path to sslKey */
  sslKey?: string,
  /** This is the path to sslCert */
  sslCert?: string,
  portRange?: Array<number>,
  proto?: string,
  /** More from CLI really */
  help?: boolean,
  init?: boolean,
  staticDir?: string,
  open?: boolean,
  watch?: boolean
}

declare interface loadedCfg extends lesCfg {
  server: http.Server | https.Server | http2.Server;
  browser?: ChildProcessWithoutNullStreams;
  watchDir?: string;
}

function _mergeConfigs(
  cliCfg: lesCfg, 
  options: any
): Array<lesCfg>

function run(options: any): 
  string | function | Promise<{ evt: string, data: Array<lesCfg>}>

export namespace _ {
  /** 
   * Merges the CLI config with the .lesrc config.
   * Specifically, it finds the first entry in .lesrc 
   * matching the protocol provided by the CLI, and then
   * merges the two (with the CLI options overriding the .lesrc config
   * entry items)
   * 
   * Furthermore, if config values are omitted, defaults will be assigned.
   *
   * If the LANG is not English (en_US), then the english option label will 
   * be pulled in to for convenience, since the CLI at the heart is English-based. 
   */
  export type _mergeConfigs = typeof _mergeConfigs

  function buildCliCfg(options: any): lesCfg;

  export type buildCliCfg = typeof buildCliCfg;
  export type run = typeof run;
}

export namespace test {
  function testCfg(cliCfg: lesCfg, msgs?: any): Promise<{
    cfgsLoaded: Array<loadedCfg>
  }>
  export type testCfg = typeof testCfg;

  function stopServers(cfgsLoaded: Array<loadedCfg>): Promise<void>;
  export type stopServers = typeof stopServers;

  function validateCfgs(
    cliCfg: lesCfg, 
    cfgsLoaded: Array<loadedCfg>, 
    t: ExecutionContext, 
    options?: any 
  ): void;
  export type validateCfgs = typeof validateCfgs;
}

export function CLI(cfg: ParsedArgs, msgs: any): Readonly<run>;

export type CLI = typeof CLI;
export const testCLI = CLI
export type testCLI = typeof CLI;
export const mergeConfigs = _mergeConfigs;
export type mergeConfigs = typeof _mergeConfigs;
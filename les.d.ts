import { ParsedArgs } from 'minimist'
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
  export function _mergeConfigs(
    cliCfg: lesCfg, 
    options: any
  ): Array<lesCfg>
  export type _mergeConfigs = typeof _mergeConfigs

  function buildCliCfg(options: any): lesCfg;

  export type buildCliCfg = typeof buildCliCfg;
  export type run = typeof run;
}

export function CLI(cfg: ParsedArgs, msgs: any): Readonly<run>;

export type CLI = typeof CLI;
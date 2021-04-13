export declare type lesCfg = {
  host?: string,
  port?: number,
  /** This is the path to sslKey */
  sslKey?: string,
  /** This is the path to sslCert */
  sslCert?: string,
  portRange?: Array<number>,
  proto?: string
}

export namespace _ {
  /** 
   * Merges the CLI options with the .lesrc config 
   * for the config entry matching the protocol specified
   * by the CLI options
   */
  export function _mergeConfigs(
    cliCfg: lesCfg, 
    options: any
  ): Array<lesCfg>
  export type _mergeConfigs = typeof _mergeConfigs
}
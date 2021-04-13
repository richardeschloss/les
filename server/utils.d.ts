import { lesCfg } from './les'

/**
 * Attaches the SSL pair to the other config entries
 * as a convenice. So the SSL pair only needs to be
 * specified in one entry. 
 * If SSL pair info already exists in the non-first entry,
 * it won't be overwritten
 */
export function attachSSL(cfgs: Array<lesCfg>): void
export type attachSSL = typeof attachSSL;

/**
 * Build the CLI usage messages
 */
export function buildCLIUsage(
  cmdFmt: string, 
  options: any,
  msgs: any
): string;
export type buildCLIUsage = typeof buildCLIUsage; 

/**
 * Imports CLI options and messages from the 
 * specified locale (process.env.LANG) and assigns
 * the imported values to the provided options and msgs
 * objects
 */
export function importCLIOptions(options: any, msgs: any): Promise<void>;
export type importCLIOptions = typeof importCLIOptions;

/**
 * Loads the server configs from the .lesrc file
 */
export function loadServerConfigs(): Array<lesCfg>;
export type loadServerConfigs = typeof loadServerConfigs;

/**
 * Runs a command until a given regex pattern is found in 
 * the response (useful for testing the CLI)
 */

export function runCmdUntil(opts: {
  cmd?: string,
  args?: Array<string>,
  regex: { [Symbol.match](string: string): RegExpMatchArray | null; }
}): Promise<string>;
export type runCmdUntil = typeof runCmdUntil;

/**
 * Translates the CLI messages and options to the specified languages 
 */
export function translateLocales(opts: {
  api?: string, 
  to?: 'all' | string[]
}): Promise<any>
export type translateLocales = typeof translateLocales;
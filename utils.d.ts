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
export type LangSvc = {
  /** Returns the identifiable languages */
  identifiableLanguages: () => Promise<Array<{language: string, name: string}>>,
  /** Returns supported language codes ("models") */
  supportedLangs: (src?: string) => Promise<Array<String>>,
  /** 
   * Translates a given text from one language (default = "en")
   * to another
   */
  translate: (opts?: { 
    text: string | Array<string>, 
    from?: string, 
    to: string 
  }) => Promise<Array<string>>,
  /**
   * Batch translate
   */
  batch: (opts?: {
    text: Array<string> | string,
    from?: string,
    to: Array<string> | 'all',
    concurrent?: boolean
  }) => Promise<any>
}

function LangUtils(api?: string): Readonly<LangSvc>;

export type LangUtils = typeof LangUtils

export default LangUtils
import Rexter, { checkEnv } from 'les-utils/utils/rexter.js'
import PromiseUtils from 'les-utils/utils/promise.js'

const reqdVars = [
  'K8S_SECRET_WATSON_TRANSLATE', 
  'K8S_SECRET_WATSON_ENDPOINT1'
]

function Svc() {
  checkEnv(reqdVars)
  const {
    K8S_SECRET_WATSON_TRANSLATE: WATSON_API_KEY_BASE64,
    K8S_SECRET_WATSON_ENDPOINT1: WATSON_ENDPOINT1_BASE64
  } = process.env
  const WATSON_API_KEY = Buffer.from(WATSON_API_KEY_BASE64, 'base64').toString()
  const WATSON_ENDPOINT = Buffer.from(
    WATSON_ENDPOINT1_BASE64,
    'base64'
  ).toString()
  
  const ibmRexter = Rexter({})

  /** @type {import('../language').LangSvc} */
  const svc = {
    identifiableLanguages() {
      return ibmRexter.get(
        `${WATSON_ENDPOINT}/v3/identifiable_languages?version=2018-05-01`,
       {
          auth: `apikey:${WATSON_API_KEY}`,
          /** @param {Buffer} resp */
          transform(resp) {
            const { languages } = JSON.parse(resp.toString())
            return languages
          }
        }
      )
    },
    supportedLangs(src = 'en') {
      return ibmRexter.get(
        `${WATSON_ENDPOINT}/v3/models?version=2018-05-01`,
        {
          auth: `apikey:${WATSON_API_KEY}`,
          /** @param {Buffer} resp */
          transform(resp) {
            const { models } = JSON.parse(resp.toString())
            return models
              .filter(({ source }) => source === src)
              .map(({ target }) => target)
          }
        }
      )
    },
    async translate({ text, from = 'en', to }) {
      const postData = {
        text, // Can be [String] or String
        model_id: `${from}-${to}`
      }
      return ibmRexter
        .post(
          `${WATSON_ENDPOINT}/v3/translate?version=2018-05-01`,
        {
          auth: `apikey:${WATSON_API_KEY}`,
          postData,
          headers: {
            'Content-Type': 'application/json'
          },
          /** @param {Buffer} resp */
          transform(resp) {
            const { translations } = JSON.parse(resp.toString())
            return translations.map(({ translation }) => translation)
          }
        })
        .catch(() => {
          throw new Error(`Error translating to lang ${to}.`)
        })
    },
    async batch({
      text = [],
      from = 'en',
      to = [],
      concurrent = true
    }) {
      let _to = []
      const { supportedLangs } = this
      if (to === 'all') {
        _to = await supportedLangs()
      } else if (Array.isArray(to)) {
        _to = to
      } else {
        throw new Error('type error for "to". Expected String[] | "all"')
      }
      console.log('translating for langs', _to)
      const reqMethod = concurrent ? 'each' : 'series'
      
      const resp = await PromiseUtils[reqMethod]({
        items: _to,
        handleItem(toStr) {
          return ibmRexter.post(
            `${WATSON_ENDPOINT}/v3/translate?version=2018-05-01`, 
            {
              auth: `apikey:${WATSON_API_KEY}`,
              postData: {
                text,
                model_id: `${from}-${toStr}`
              },
              headers: {
                'Content-Type': 'application/json'
              },
              /** @param {Buffer} resp */
              transform(resp) {
                const { translations } = JSON.parse(resp.toString())
                return translations.map(({ translation }) => translation)
              }
            }
          )
        }
      })
      return resp
    }
  }

  return Object.freeze(svc)
}

export default Svc

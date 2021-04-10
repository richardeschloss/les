import Rexter, { checkEnv } from 'les-utils/utils/rexter.js'
import PromiseUtils from 'les-utils/utils/promise.js'

const { K8S_SECRET_YANDEX_TRANSLATE: YANDEX_API_KEY_BASE64 } = process.env
const reqdVars = ['K8S_SECRET_YANDEX_TRANSLATE']

function Svc() {
  checkEnv(reqdVars)
  const YANDEX_API_KEY = Buffer.from(YANDEX_API_KEY_BASE64, 'base64').toString()
  const rexter = Rexter({})
  /** @type {import('../language').LangSvc} */
  const svc = {
    identifiableLanguages() {
      return Promise.resolve([])
    },
    supportedLangs(ui = 'en') {
      console.log('getting supported langs from Yandex')
      const postData = {
        key: YANDEX_API_KEY,
        ui
      }
      return rexter.post(
        'https://translate.yandex.net/api/v1.5/tr.json/getLangs', 
        {
          postData,
          /** @param {Buffer} resp */
          transform(resp) {
            const { dirs } = JSON.parse(resp.toString())
            return dirs
              .filter(
                /** @param {string} i */
                (i) => i.startsWith(ui))
              .map(
                /** @param {string} i */
                (i) => i.split('-')[1]
              )
        }
      })
    },
    translate({ text, to }) {
      const postData = {
        key: YANDEX_API_KEY,
        text,
        lang: to
      }
      return rexter.post(
        'https://translate.yandex.net/api/v1.5/tr.json/translate',
        {
          postData,
          /** @param {Buffer} resp */
          transform(resp) {
            const { text } = JSON.parse(resp.toString()) 
            return [text[0]]
          }
        }
      )
    },
    async batch({ 
      text = [], 
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
      
      return PromiseUtils[reqMethod]({
        items: _to,
        handleItem(toStr) {
          return svc.translate({ text, to: toStr })
        }
      })
    }
  }

  return Object.freeze(svc)
}

export default Svc

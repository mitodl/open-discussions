// @flow
import type { EmbedlyResponse } from "../reducers/embedly"

export const ensureTwitterEmbedJS = () => {
  if (!window.twttr) {
    window.twttr = (function(d, s, id) {
      const fjs: any = d.getElementsByTagName(s)[0]
      const t = window.twttr || {}
      if (d.getElementById(id)) return t
      const js = d.createElement(s)
      js.id = id
      js.src = "https://platform.twitter.com/widgets.js"
      fjs.parentNode.insertBefore(js, fjs)

      t._e = []
      t.ready = function(f) {
        t._e.push(f)
      }

      return t
    })(document, "script", "twitter-wjs")
  }
}

export const handleTwitterWidgets = (embedlyResponse: EmbedlyResponse) => {
  if (embedlyResponse && embedlyResponse.response.provider_name === "Twitter") {
    window.twttr.widgets.load()
  }
}

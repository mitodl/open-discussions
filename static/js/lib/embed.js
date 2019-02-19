/* global SETTINGS: false */
// @flow
import R from "ramda"
import React from "react"

import ReactDOMServer from "react-dom/server"

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

export const hasIframe = R.memoizeWith(R.identity, (html: string) => {
  const div = document.createElement("div")
  div.innerHTML = html
  return !!div.querySelector("iframe")
})

export const loadEmbedlyPlatform = () => {
  const id = "embedly-platform"

  if (!document.getElementById(id)) {
    window.embedly =
      window.embedly ||
      function() {
        (window.embedly.q = window.embedly.q || []).push(arguments)
      }
    const el = document.createElement("script")
    el.id = id
    // $FlowFixMe
    el.async = 1
    el.src = `${
      "https:" === document.location.protocol ? "https" : "http"
    }://cdn.embedly.com/widgets/platform.js`
    const script = document.getElementsByTagName("script")[0]
    // $FlowFixMe
    script.parentNode.insertBefore(el, script)
  }
}

export const renderEmbedlyCard = (url: string): string =>
  ReactDOMServer.renderToStaticMarkup(
    <a
      data-card-chrome="0"
      data-card-controls="0"
      data-card-key={SETTINGS.embedlyKey}
      href={url}
      className="embedly-card"
    />
  )

export const livestreamEventURL = (accountId: number, eventId: number) =>
  `https://livestream.com/accounts/${accountId}/events/${eventId}/player`

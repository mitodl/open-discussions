/* global SETTINGS: false */
// @flow
import React from "react"
import isURL from "validator/lib/isURL"

import { loadEmbedlyPlatform } from "../lib/embed"
import ReactDOMServer from "react-dom/server"

type Props = {
  url: string
}
export default class EmbedlyCard extends React.Component<Props> {
  componentDidMount() {
    loadEmbedlyPlatform()
  }

  render() {
    const { url } = this.props

    if (!isURL(url, { allow_underscores: true })) {
      return null
    }

    const html = ReactDOMServer.renderToStaticMarkup(
      <a
        data-card-chrome="0"
        data-card-controls="0"
        data-card-key={SETTINGS.embedlyKey}
        href={url}
        className="embedly-card"
      />
    )

    return <div dangerouslySetInnerHTML={{ __html: html }} />
  }
}

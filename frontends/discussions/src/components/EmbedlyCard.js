/* global SETTINGS: false */
// @flow
import React from "react"

import { loadEmbedlyPlatform, renderEmbedlyCard } from "../lib/embed"
import { isValidUrl } from "../lib/util"

type Props = {
  url: string,
  className?: string
}
export default class EmbedlyCard extends React.Component<Props> {
  componentDidMount() {
    loadEmbedlyPlatform()
  }

  render() {
    const { className, url } = this.props

    if (!isValidUrl(url)) {
      return null
    }

    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: renderEmbedlyCard(url) }}
      />
    )
  }
}

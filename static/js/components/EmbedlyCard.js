/* global SETTINGS: false */
// @flow
import React from "react"
import isURL from "validator/lib/isURL"

import { loadEmbedlyPlatform, renderEmbedlyCard } from "../lib/embed"

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

    return <div dangerouslySetInnerHTML={{ __html: renderEmbedlyCard(url) }} />
  }
}

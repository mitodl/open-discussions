// @flow
import React, { useEffect } from "react"

import EmbedlyCard from "../EmbedlyCard"

import type { WidgetComponentProps } from "../../flow/widgetTypes"

export const TwitterEmbed = ({ embed }: { embed: string }) => {
  useEffect(() => {
    window.twttr.widgets.load()
  })

  return (
    <div
      className="twitter-embed"
      dangerouslySetInnerHTML={{ __html: embed }}
    />
  )
}

const UrlWidget = ({
  widgetInstance: {
    configuration: { url, custom_html } // eslint-disable-line camelcase
  }
}: WidgetComponentProps) =>
  url ? (
    <EmbedlyCard url={url} className="no-embedly-title" />
  ) : (
    <TwitterEmbed embed={custom_html} /> // eslint-disable-line camelcase
  )
export default UrlWidget

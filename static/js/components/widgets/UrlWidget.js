// @flow
import React from "react"

import EmbedlyCard from "../EmbedlyCard"

import type { WidgetComponentProps } from "../../flow/widgetTypes"

const UrlWidget = ({
  widgetInstance: {
    configuration: { url }
  }
}: WidgetComponentProps) => (
  <EmbedlyCard url={url} className="no-embedly-title" />
)
export default UrlWidget

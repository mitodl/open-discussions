// @flow
import React from "react"

import { Markdown } from "../Markdown"
import type { WidgetInstance } from "../../flow/widgetTypes"

type Props = {
  widgetInstance: WidgetInstance
}

const MarkdownWidget = ({ widgetInstance }: Props) => {
  const {
    title,
    configuration: { source }
  } = widgetInstance
  return (
    <div className="widget-body">
      <span className="widget-title">{title}</span>
      <Markdown source={source} className="widget-text" />
    </div>
  )
}

export default MarkdownWidget

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
    <React.Fragment>
      <span className="title">{title}</span>
      <Markdown source={source} />
    </React.Fragment>
  )
}

export default MarkdownWidget

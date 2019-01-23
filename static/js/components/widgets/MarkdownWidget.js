// @flow
import React from "react"

import { Markdown } from "../Markdown"
import type { WidgetComponentProps } from "../../flow/widgetTypes"

const MarkdownWidget = ({
  widgetInstance: {
    configuration: { source }
  }
}: WidgetComponentProps) => <Markdown source={source} />

export default MarkdownWidget

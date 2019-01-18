// @flow
import React from "react"

import type { WidgetInstance } from "../../flow/widgetTypes"

type Props = {
  widgetInstance: WidgetInstance
}

const UrlWidget = ({
  widgetInstance: {
    title,
    configuration: { url }
  }
}: Props) => (
  <React.Fragment>
    <span className="title">{title}</span>
    <iframe src={url} />
  </React.Fragment>
)
export default UrlWidget

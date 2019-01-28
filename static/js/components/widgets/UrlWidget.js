// @flow
import React from "react"

import type { WidgetComponentProps } from "../../flow/widgetTypes"

const UrlWidget = ({
  widgetInstance: {
    configuration: { url }
  }
}: WidgetComponentProps) => <iframe src={url} />
export default UrlWidget

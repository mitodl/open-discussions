// @flow
import React from "react"

import EmbedlyContainer from "../../containers/EmbedlyContainer"

import type { WidgetComponentProps } from "../../flow/widgetTypes"

const UrlWidget = ({
  widgetInstance: {
    configuration: { url }
  }
}: // $FlowFixMe: Not sure why flow is complaining but url is the only prop it needs
WidgetComponentProps) => <EmbedlyContainer url={url} />
export default UrlWidget

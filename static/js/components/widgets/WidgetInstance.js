// @flow
import React from "react"
import DefaultWidget from "./DefaultWidget"
import Card from "../Card"

import { validWidgetRenderers } from "../../lib/widgets"

import type { WidgetInstance as WidgetInstanceType } from "../../flow/widgetTypes"

type Props = {
  widgetInstance: WidgetInstanceType
}

export default class WidgetInstance extends React.Component<Props> {
  render() {
    const { widgetInstance } = this.props
    const WidgetClass =
      validWidgetRenderers[widgetInstance.react_renderer] || DefaultWidget
    return (
      <Card className="widget" key={widgetInstance.id}>
        <WidgetClass widgetInstance={widgetInstance} />
      </Card>
    )
  }
}

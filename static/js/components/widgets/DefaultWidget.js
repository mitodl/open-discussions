// @flow
import React from "react"

import type { WidgetInstance } from "../../flow/widgetTypes"

type Props = {
  widgetInstance: WidgetInstance
}

export default class DefaultWidget extends React.Component<Props> {
  render() {
    const {
      widgetInstance: { title, html }
    } = this.props
    return (
      <div className="widget-body">
        <span className="widget-title">{title}</span>
        <div
          className="widget-text"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    )
  }
}

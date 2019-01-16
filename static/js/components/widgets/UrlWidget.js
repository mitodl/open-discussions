// @flow
import React from "react"

import type { WidgetInstance } from "../../flow/widgetTypes"

type Props = {
  widgetInstance: WidgetInstance
}

export default class UrlWidget extends React.Component<Props> {
  render() {
    const {
      widgetInstance: {
        title,
        configuration: { url }
      }
    } = this.props

    return (
      <React.Fragment>
        <span className="title">{title}</span>
        <iframe src={url} />
      </React.Fragment>
    )
  }
}

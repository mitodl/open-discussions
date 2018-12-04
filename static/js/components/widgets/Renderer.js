import React, { Component } from "react"

export default class Renderer extends Component {
  /**
   * DefaultRenderer is the basic component to render a widget configuration
   *
   * Props:
   *    title: title of the widget
   *    html: inner html of the widget
   */
  render() {
    const { title, html } = this.props
    return (
      <div className="widget-body card-body">
        <h5 className="widget-title card-title">{title}</h5>
        <div
          className="widget-text card-text text-truncate"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    )
  }
}

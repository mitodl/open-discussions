// @flow
import React from "react"
import ReactDOM from "react-dom"

export default class ReactNodeView {
  constructor(node) {
    this.node = node
    this.dom = document.createElement('div')
    this.renderReact()
  }

  update(node) {
    this.node = node
    this.renderReact()
    return true
  }

  renderReact() {
    const Component = this.node.type.spec.reactComponent

    console.log(this.node);

    ReactDOM.render(
      <Component {...this.node.attrs} />,
      this.dom
    )
  }
}

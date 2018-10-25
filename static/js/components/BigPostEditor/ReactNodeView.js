// @flow
import React from "react"
import ReactDOM from "react-dom"

export default class ReactNodeView {
  constructor(node) {
    this.node = node
    this.dom = document.createElement('div')
    this.renderReact()
  }

  update(updatedNode) {
    this.node = updatedNode
    this.renderReact()
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

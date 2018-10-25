// @flow
import React from "react"
import ReactDOM from "react-dom"

export default class ReactNodeView {
  constructor(node, component) {
    console.log('constructor');
    console.log(component);
    this.node = node
    this.component = component
    this.dom = document.createElement('div')
    this.renderReact()
  }

  update(node) {
    this.node = node
    this.renderReact()
    return true
  }

  renderReact() {
    const Component = this.component

    console.log(this.node);

    ReactDOM.render(
      <Component {...this.node.attrs} />,
      this.dom
    )
  }
}

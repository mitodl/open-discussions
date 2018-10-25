// @flow
import React from "react"
import ReactDOM from "react-dom"

export default class ReactNodeView {
  node: Object
  dom: HTMLDivElement
  component: React$ElementType

  constructor(node: Object, component: React$ElementType) {
    this.node = node
    this.component = component
    this.dom = document.createElement("div")
    this.renderReact()
  }

  update(node: Object) {
    this.node = node
    this.renderReact()
    return true
  }

  renderReact() {
    const Component = this.component

    ReactDOM.render(<Component {...this.node.attrs} />, this.dom)
  }
}

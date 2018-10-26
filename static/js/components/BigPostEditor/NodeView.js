// @flow

export default class NodeView {
  node: Object
  dom: HTMLDivElement
  destroyed: boolean

  constructor(node: Object) {
    this.node = node
    this.dom = document.createElement("div")
    this.destroyed = false
  }

  update(node: Object) {
    this.node = node
    return true
  }

  destroy() {
    this.dom = null
    this.node = null
    this.destroyed = true
  }
}

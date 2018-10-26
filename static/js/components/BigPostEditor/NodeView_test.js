// @flow
import { assert } from "chai"

import NodeView from "./NodeView"

describe("NodeView", () => {
  let nodeView, node

  beforeEach(() => {
    node = { type: "FakeNode", attrs: { prop: "value" } }
    nodeView = new NodeView(node)
  })

  it("should set its initial state", () => {
    assert.deepEqual(nodeView.node, node)
    assert.instanceOf(nodeView.dom, HTMLDivElement)
    assert.isFalse(nodeView.destroyed)
  })

  it("should accept an update", () => {
    nodeView.update({ new: "node" })
    assert.deepEqual(nodeView.node, { new: "node" })
  })

  it("should destroy itself", () => {
    nodeView.destroy()
    assert.equal(nodeView.dom, null)
    assert.equal(nodeView.node, null)
    assert.isTrue(nodeView.destroyed)
  })
})

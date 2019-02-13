// @flow
import React from "react"
import { Router } from "react-router"
import { assert } from "chai"
import { mount } from "enzyme"
import sinon from "sinon"
import { createMemoryHistory } from "history"

import ScrollToTop from "./ScrollToTop"

describe("ScrollToTop", () => {
  let scrollStub, sandbox, browserHistory

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    scrollStub = sandbox.stub()
    browserHistory = createMemoryHistory()
    scrollStub = sandbox.stub(window, "scrollTo")
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderComponent = () =>
    mount(
      <Router history={browserHistory}>
        <ScrollToTop>
          <div className="child" />
        </ScrollToTop>
      </Router>
    )

  it("should scroll to top when visiting a new link", () => {
    renderComponent()
    browserHistory.push("/foo")
    sinon.assert.calledWith(scrollStub, 0, 0)
  })

  it("should not scroll to top when user clicks forward or back", () => {
    browserHistory.push("/foo")
    browserHistory.push("/bar")
    renderComponent()
    browserHistory.goBack()
    browserHistory.goForward()
    sinon.assert.notCalled(scrollStub)
  })

  it("should render children", () => {
    const wrapper = renderComponent()
    assert.lengthOf(wrapper.find(".child"), 1)
  })
})

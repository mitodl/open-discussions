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
    sandbox = sinon.sandbox.create()
    scrollStub = sandbox.stub()
    window.scrollTo = scrollStub
    browserHistory = createMemoryHistory()
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
    sinon.assert.calledWith(window.scrollTo, 0, 0)
  })

  it("should not scroll to top when user clicks forward or back", () => {
    browserHistory.push("/foo")
    browserHistory.push("/bar")
    renderComponent()
    browserHistory.goBack()
    browserHistory.goForward()
    sinon.assert.notCalled(window.scrollTo)
  })

  it("should render children", () => {
    const wrapper = renderComponent()
    assert.lengthOf(wrapper.find(".child"), 1)
  })
})

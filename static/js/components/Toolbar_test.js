// @flow
import React from "react"
import sinon from "sinon"
import { assert } from "chai"
import { shallow } from "enzyme"

import Toolbar from "./Toolbar"

describe("Toolbar", () => {
  let toggleShowDrawerStub, sandbox

  const renderToolbar = () =>
    shallow(
      <Toolbar
        toggleShowDrawer={toggleShowDrawerStub}
        toggleShowUserMenu={sandbox.stub()}
        showUserMenu={false}
      />,
      { disableLifecycleMethods: true }
    )

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    toggleShowDrawerStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("should call toggleShowDrawer when menu button is clicked", () => {
    renderToolbar()
      .find("a")
      .at(0)
      .simulate("click", {
        preventDefault: sandbox.stub()
      })
    assert.ok(toggleShowDrawerStub.called)
  })
})
